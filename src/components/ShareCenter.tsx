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
type Props = {
  members: Member[]; meetings: Meeting[]; assignments: Assignment[];
  monthLabel: string; busy: boolean;
  onManualConfirmation: (assignment: Assignment) => Promise<void>;
};

export default function ShareCenter({
  members, meetings, assignments, monthLabel, busy, onManualConfirmation
}: Props) {
  const [notice, setNotice] = useState("");
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
      "",
      "Merci de confirmer ta disponibilité.",
      "Si tu souhaites une modification, fais-nous le savoir."
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
      <p className="muted small">Ces boutons ouvrent WhatsApp ou ta messagerie : aucun message n'est envoyé automatiquement. Les liens de confirmation en ligne restent à développer.</p>
      {scheduled.length===0
        ? <p className="muted">Aucun intervenant programmé pour ce mois.</p>
        : scheduled.map(m => {
          const jobs=tasks(m), wa=whatsappLink(m), mail=mailLink(m);
          return <div key={m.id} className="share-person">
            <div className="share-person-info">
              <strong>{m.full_name}</strong>
              <small>{m.country ?? "Pays à compléter"} · {jobs.length} responsabilité(s)</small>
              <small>{jobs.map(j=>formatFrenchDate(j.meeting.meeting_date)+" — "+ROLE_LABELS[j.assignment.role_key]).join(" ; ")}</small>
            </div>
            <div className="share-actions">
              <button type="button" className="secondary" onClick={()=>void copy(m)}>Copier</button>
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
  </div>;
}
