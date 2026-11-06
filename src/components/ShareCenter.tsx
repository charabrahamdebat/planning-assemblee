"use client";

import { useState } from "react";
import { formatFrenchDate, ROLE_LABELS, type RoleKey } from "@/lib/planning";

type Member = {
  id: string; full_name: string; email: string|null;
  whatsapp_phone: string|null; country: string|null; active: boolean;
};
type Meeting = {
  id: string; meeting_date: string; starts_at: string;
  ends_at: string; ends_next_day: boolean;
};
type Assignment = {
  id: string; meeting_id: string; role_key: RoleKey;
  member_id: string|null; status: string; responded_at: string|null;
};
type ChangeRequest={id:string;assignment_id:string;member_id:string;message:string;request_type:string;status:string;created_at:string};
type Props = {
  members: Member[]; meetings: Meeting[]; assignments: Assignment[];
  requests: ChangeRequest[]; monthLabel: string; busy: boolean;
  onManualConfirmation: (assignment: Assignment) => Promise<void>;
  onGenerateInvitation: (memberId: string) => Promise<string>;
  onReviewRequest: (requestId:string,decision:"approved"|"rejected") => Promise<void>;
  onGoToMeeting: (meetingId:string) => void;
};

export default function ShareCenter({
  members, meetings, assignments, requests, monthLabel, busy,
  onManualConfirmation, onGenerateInvitation, onReviewRequest, onGoToMeeting
}: Props) {
  const [notice, setNotice] = useState("");
  const [links,setLinks]=useState<Record<string,string>>({});
  const [creating,setCreating]=useState<string|null>(null);
  const [invitationError,setInvitationError]=useState("");
  const pendingRequests=requests.filter(r=>r.status==="pending");
  const approvedAwaitingReplacement=requests.filter(r=>
    r.status==="approved" &&
    requests.find(x=>x.assignment_id===r.assignment_id)?.id===r.id &&
    assignments.some(a=>a.id===r.assignment_id&&a.status==="change_requested")
  );
  const meetingById = new Map(meetings.map(m => [m.id, m]));
  const scheduled = members.filter(m => assignments.some(a => a.member_id === m.id));

  function tasks(member: Member) {
    return assignments.filter(a => a.member_id === member.id).flatMap(a => {
      const m = meetingById.get(a.meeting_id);
      return m ? [{ assignment: a, meeting: m }] : [];
    }).sort((a,b) => a.meeting.meeting_date.localeCompare(b.meeting.meeting_date));
  }

  function message(member: Member) {
    const lines = tasks(member).map(({assignment,meeting}) => (
      "• " + formatFrenchDate(meeting.meeting_date)
      + " — " + ROLE_LABELS[assignment.role_key]
      + " (" + meeting.starts_at.slice(0,5) + "–" + meeting.ends_at.slice(0,5)
      + (meeting.ends_next_day ? ", fin le lendemain" : "") + ")"
    ));
    return [
      "Bonjour " + member.full_name + ",",
      "",
      "Que la grâce et la paix du Seigneur soient avec toi !",
      "",
      "Dans le cadre du Planning Assemblée — FOI VICTORIEUSE, voici tes responsabilités pour " + monthLabel + " (heure de France) :",
      ...lines,
      ...(links[member.id]?["","Lien personnel de réponse : "+links[member.id]]:[]),
      "",
      "Merci de confirmer ta disponibilité.",
      "Si tu souhaites une modification, fais-moi le savoir."
    ].join("\n");
  }

  async function copy(member: Member) {
    try {
      await navigator.clipboard.writeText(message(member));
      setNotice("Message copié pour " + member.full_name + ".");
    } catch {
      setNotice("La copie n'est pas disponible dans ce navigateur.");
    }
  }

  async function copyOnlyLink(member: Member) {
    const url = links[member.id];
    if (!url) {
      setNotice("Crée d'abord un lien personnel pour cet intervenant.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Lien seul copié pour " + member.full_name + ". Colle-le dans une fenêtre privée pour tester.");
    } catch {
      setNotice("Copie bloquée par le navigateur : sélectionne l'adresse visible sous le nom pour la copier.");
    }
  }

  async function generateLink(member: Member) {
    setInvitationError("");setCreating(member.id);setNotice("");
    try{
      const link=await onGenerateInvitation(member.id);
      setLinks(prev=>({...prev,[member.id]:link}));
      setNotice("Lien personnel créé pour "+member.full_name+". Le prochain message WhatsApp ou e-mail l'inclura automatiquement.");
    }catch(e){
      setInvitationError(e instanceof Error?e.message:"Erreur lors de la génération du lien.");
    }finally{setCreating(null);}
  }

  function whatsappLink(member: Member) {
    const digits = (member.whatsapp_phone ?? "").replace(/\D/g,"");
    if (!/^\d{8,15}$/.test(digits)) return null;
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message(member));
  }

  function mailLink(member: Member) {
    if (!member.email) return null;
    return "mailto:" + encodeURIComponent(member.email) + "?subject=" +
      encodeURIComponent("Planning Assemblée — FOI VICTORIEUSE — " + monthLabel) +
      "&body=" + encodeURIComponent(message(member));
  }

  return <div className="share-center">
    <section className="card">
      <h2>Partager le planning — {monthLabel}</h2>
      <p className="muted">Prépare un message individuel pour chaque intervenant avec uniquement ses affectations. Tu choisis ensuite de l'envoyer par WhatsApp ou par e-mail.</p>
      <p className="muted small">Crée un lien personnel sécurisé pour chaque intervenant. Il expire au bout de 14 jours. « Copier le lien » copie uniquement l'adresse à tester dans une navigation privée ; « Copier le message » récupère le texte complet. WhatsApp et e-mail n'envoient rien automatiquement.</p>
      {invitationError&&<p className="alert error" role="alert">{invitationError}</p>}
      {scheduled.length===0
        ? <p className="muted">Aucun intervenant programmé pour ce mois.</p>
        : scheduled.map(m => {
          const jobs=tasks(m), wa=whatsappLink(m), mail=mailLink(m);
          return <div key={m.id} className="share-person">
            <div className="share-person-info">
              <strong>{m.full_name}</strong>
              <small>{m.country ?? "Pays à compléter"} · {jobs.length} responsabilité(s)</small>
              <small>{jobs.map(j=>formatFrenchDate(j.meeting.meeting_date)+" — "+ROLE_LABELS[j.assignment.role_key]).join(" ; ")}</small>
              {links[m.id] && <p className="share-link-display">
                <strong>Lien personnel :</strong>{" "}
                <a href={links[m.id]} target="_blank" rel="noopener noreferrer">{links[m.id]}</a>
              </p>}
            </div>
            <div className="share-actions">
              <button type="button" className="primary" disabled={creating!==null||busy||Boolean(links[m.id])}
                onClick={()=>void generateLink(m)}>{creating===m.id?"Création…":links[m.id]?"Lien créé":"Créer un lien"}</button>
              {links[m.id] && <>
                <button type="button" className="secondary" onClick={()=>void copyOnlyLink(m)}>Copier le lien</button>
                <a className="share-link" href={links[m.id]} target="_blank" rel="noopener noreferrer">Tester le lien</a>
              </>}
              <button type="button" className="secondary" onClick={()=>void copy(m)}>Copier le message</button>
              {wa && <a className="share-link" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              {mail && <a className="share-link" href={mail}>E-mail</a>}
            </div>
          </div>;
        })
      }
      {notice && <p role="status" className="alert success">{notice}</p>}
    </section>
    <section className="card">
      <h2>Confirmations reçues</h2>
      <p className="muted">Lorsqu'une personne confirme par WhatsApp ou par e-mail, valide séparément chacune de ses affectations ci-dessous.</p>
      {assignments.filter(a=>a.member_id && a.status==="pending").length===0
        ? <p className="muted">Aucune affectation en attente de confirmation.</p>
        : assignments.filter(a=>a.member_id && a.status==="pending").map(a=>{
          const member=members.find(m=>m.id===a.member_id);
          const meeting=meetingById.get(a.meeting_id);
          if(!member || !meeting)return null;
          return <div className="share-person" key={a.id}>
            <div className="share-person-info">
              <strong>{member.full_name}</strong>
              <small>{formatFrenchDate(meeting.meeting_date)} · {ROLE_LABELS[a.role_key]}</small>
            </div>
            <button type="button" className="secondary" disabled={busy} onClick={()=>void onManualConfirmation(a)}>
              Marquer confirmé
            </button>
          </div>;
        })
      }
    </section>
    <section className="card">
      <h2>Modifications approuvées à finaliser</h2>
      {!approvedAwaitingReplacement.length?<p className="muted">Aucune réattribution à finaliser.</p>:
        approvedAwaitingReplacement.map(request=>{
          const a=assignments.find(item=>item.id===request.assignment_id);
          const meeting=a?meetingById.get(a.meeting_id):null;
          const member=members.find(m=>m.id===request.member_id);
          return <div className="share-person" key={request.id}>
            <div className="share-person-info">
              <strong>{member?.full_name||"Intervenant"} — demande approuvée</strong>
              <small>{meeting?formatFrenchDate(meeting.meeting_date):"Réunion"} · {a?ROLE_LABELS[a.role_key]:"Responsabilité"}</small>
              <p>{request.message}</p>
              <small>Choisis un autre intervenant dans le groupe concerné, ou laisse la fonction non attribuée.</small>
            </div>
            {meeting&&<button className="primary" disabled={busy} type="button"
              onClick={()=>onGoToMeeting(meeting.id)}>Réattribuer dans le planning</button>}
          </div>;
        })}
    </section>
    <section className="card">
      <h2>Demandes de modification</h2>
      <p className="muted">Une demande ne modifie jamais automatiquement le planning. Accepte ou refuse, puis ajuste manuellement le responsable si nécessaire.</p>
      {!pendingRequests.length?<p className="muted">Aucune demande en attente.</p>:
      pendingRequests.map(r=>{
        const member=members.find(m=>m.id===r.member_id);
        const task=assignments.find(a=>a.id===r.assignment_id);
        const meeting=task?meetingById.get(task.meeting_id):null;
        return <div className="share-person" key={r.id}>
          <div className="share-person-info">
            <strong>{member?.full_name||"Intervenant"}</strong>
            <small>{meeting?formatFrenchDate(meeting.meeting_date):"Réunion"} · {task?ROLE_LABELS[task.role_key]:"Responsabilité"}</small>
            <p>{r.message}</p>
          </div>
          <div className="share-actions">
            <button className="primary" disabled={busy} onClick={()=>void onReviewRequest(r.id,"approved")}>Approuver</button>
            <button className="secondary" disabled={busy} onClick={()=>void onReviewRequest(r.id,"rejected")}>Refuser</button>
          </div>
        </div>;
      })}
    </section>
  </div>;
}
