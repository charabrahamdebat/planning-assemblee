"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import ShareCenter from "@/components/ShareCenter";
import { generateMeetings, monthStart, nextMonth, formatFrenchDate, formatTime, ROLE_BY_KIND, ROLE_LABELS, type RoleKey, type MeetingKind } from "@/lib/planning";

type Member={id:string;full_name:string;email:string|null;whatsapp_phone:string|null;country:string|null;active:boolean;role_keys:RoleKey[]};
type Plan={id:string;month_start:string;status:"draft"|"published"|"archived"};
type Meeting={id:string;plan_id:string;meeting_date:string;meeting_kind:MeetingKind;starts_at:string;ends_at:string;ends_next_day:boolean;cancelled:boolean};
type Assignment={id:string;meeting_id:string;role_key:RoleKey;member_id:string|null;status:string;responded_at:string|null};

function MonthMeeting({meeting,assignments,members,busy,assign,saveTime}:{
  meeting:Meeting;assignments:Assignment[];members:Member[];busy:boolean;
  assign:(a:Assignment,id:string)=>Promise<void>;
  saveTime:(m:Meeting,start:string,end:string)=>Promise<void>;
}){
  const [start,setStart]=useState(meeting.starts_at.slice(0,5));
  const [end,setEnd]=useState(meeting.ends_at.slice(0,5));
  useEffect(()=>{setStart(meeting.starts_at.slice(0,5));setEnd(meeting.ends_at.slice(0,5));},[meeting.starts_at,meeting.ends_at]);
  const friday=meeting.meeting_kind==="friday";
  return <article className="card meeting">
    <div className="card-header"><div><p className="eyebrow">{friday?"Réunion de prière":"Culte du dimanche"}</p><h3>{formatFrenchDate(meeting.meeting_date)}</h3></div>
      <span className="chip">{formatTime(meeting.starts_at)} – {formatTime(meeting.ends_at)}{meeting.ends_next_day?" (samedi)":""}</span></div>
    <div className="role-list">{ROLE_BY_KIND[meeting.meeting_kind].map(role=>{
      const a=assignments.find(x=>x.role_key===role);
      return <label className="role-row" key={role}><span>{ROLE_LABELS[role]}</span><div>
        <select value={a?.member_id??""} disabled={busy||!a} onChange={e=>{if(a)void assign(a,e.target.value);}}>
          <option value="">Non attribué</option>
          {members.filter(m=>(m.active&&m.role_keys.includes(role))||m.id===a?.member_id).map(m=><option key={m.id} value={m.id}>{m.full_name}{m.country?` — ${m.country}`:""}{m.active&&m.role_keys.includes(role)?"":" (hors groupe / inactif)"}</option>)}
        </select>
        <small>{a?.status==="confirmed"?"Confirmé":a?.status==="pending"?"À confirmer":a?.status==="change_requested"?"Modification demandée":"À attribuer"}</small>
      </div></label>;
    })}</div>
    <div className="hours"><label>Début<input type="time" value={start} onChange={e=>setStart(e.target.value)} disabled={busy}/></label>
      <label>Fin<input type="time" value={end} onChange={e=>setEnd(e.target.value)} disabled={busy}/></label>
      <button className="secondary" disabled={busy||!start||!end||start===end||(start===meeting.starts_at.slice(0,5)&&end===meeting.ends_at.slice(0,5))}
      onClick={()=>void saveTime(meeting,start,end)}>Enregistrer les horaires</button>
    </div>
  </article>;
}

export default function AdminDashboard({userEmail}:{userEmail:string}){
  const router=useRouter(),supabase=useMemo(()=>createClient(),[]);
  const [year,setYear]=useState(new Date().getFullYear()),[month,setMonth]=useState(new Date().getMonth());
  const [tab,setTab]=useState<"planning"|"members"|"validations">("planning");
  const [members,setMembers]=useState<Member[]>([]),[plan,setPlan]=useState<Plan|null>(null);
  const [meetings,setMeetings]=useState<Meeting[]>([]),[assignments,setAssignments]=useState<Assignment[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState(""),[country,setCountry]=useState("");
  const [selectedRoles,setSelectedRoles]=useState<RoleKey[]>([]);
  const [editingMember,setEditingMember]=useState<string|null>(null);
  const [countryDraft,setCountryDraft]=useState("");
  const monthKey=monthStart(year,month);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const [mr,pr]=await Promise.all([
        supabase.from("members").select("id,full_name,email,whatsapp_phone,country,active,role_keys").order("full_name"),
        supabase.from("monthly_plans").select("id,month_start,status").eq("month_start",monthKey).maybeSingle()
      ]);
      if(mr.error)throw mr.error;if(pr.error)throw pr.error;
      setMembers((mr.data??[]) as Member[]);setPlan(pr.data as Plan|null);
      if(!pr.data){setMeetings([]);setAssignments([]);return;}
      const meet=await supabase.from("meetings").select("id,plan_id,meeting_date,meeting_kind,starts_at,ends_at,ends_next_day,cancelled")
        .eq("plan_id",pr.data.id).order("meeting_date");
      if(meet.error)throw meet.error;
      const items=(meet.data??[]) as Meeting[];setMeetings(items);
      if(!items.length){setAssignments([]);return;}
      const ass=await supabase.from("assignments").select("id,meeting_id,role_key,member_id,status,responded_at").in("meeting_id",items.map(m=>m.id));
      if(ass.error)throw ass.error;setAssignments((ass.data??[]) as Assignment[]);
    }catch(e){setError(e instanceof Error?e.message:"Erreur lors du chargement");}
    finally{setLoading(false);}
  },[monthKey,supabase]);
  useEffect(()=>{void load();},[load]);

  async function generateMonth(){
    setBusy(true);setError("");setNotice("");
    try{
      let current=plan;
      if(!current){
        const r=await supabase.from("monthly_plans").insert({month_start:monthKey}).select("id,month_start,status").single();
        if(r.error)throw r.error;current=r.data as Plan;
      }
      const old=await supabase.from("meetings").select("id,meeting_date,meeting_kind").eq("plan_id",current.id);
      if(old.error)throw old.error;
      const present=new Set((old.data??[]).map(m=>m.meeting_date));
      const missing=generateMeetings(year,month).filter(m=>!present.has(m.meeting_date));
      if(missing.length){
        const r=await supabase.from("meetings").insert(missing.map(m=>({...m,plan_id:current.id})));
        if(r.error)throw r.error;
      }
      const all=await supabase.from("meetings").select("id,meeting_kind").eq("plan_id",current.id);
      if(all.error)throw all.error;
      const ids=(all.data??[]).map(m=>m.id);
      if(ids.length){
        const existing=await supabase.from("assignments").select("meeting_id,role_key").in("meeting_id",ids);
        if(existing.error)throw existing.error;
        const keys=new Set((existing.data??[]).map(a=>a.meeting_id+":"+a.role_key));
        const additions=(all.data??[]).flatMap(m=>ROLE_BY_KIND[m.meeting_kind as MeetingKind]
          .filter(role=>!keys.has(m.id+":"+role)).map(role=>({meeting_id:m.id,role_key:role,status:"unassigned"})));
        if(additions.length){const result=await supabase.from("assignments").insert(additions);if(result.error)throw result.error;}
      }
      await load();setNotice("Planning mensuel généré. Il reste à attribuer les intervenants.");
    }catch(e){setError(e instanceof Error?e.message:"Impossible de générer ce mois.");}
    finally{setBusy(false);}
  }
  async function addMember(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");setNotice("");
    try{
      const result=await supabase.from("members").insert({full_name:name.trim(),email:email.trim()||null,whatsapp_phone:phone.trim()||null,country:country.trim(),role_keys:selectedRoles});
      if(result.error)throw result.error;setName("");setEmail("");setPhone("");setCountry("");setSelectedRoles([]);
      await load();setNotice("Intervenant ajouté.");
    }catch(e){setError(e instanceof Error?e.message:"Erreur d'enregistrement.");}
    finally{setBusy(false);}
  }
  async function updateMemberRoles(member:Member,role:RoleKey){
    setBusy(true);setError("");setNotice("");
    const role_keys=member.role_keys.includes(role)?member.role_keys.filter(r=>r!==role):[...member.role_keys,role];
    const r=await supabase.from("members").update({role_keys}).eq("id",member.id);
    if(r.error)setError(r.error.message);else setNotice("Liste des responsabilités mise à jour.");
    await load();setBusy(false);
  }
  function toggleMemberEditor(m:Member){
    if(editingMember===m.id){setEditingMember(null);return;}
    setEditingMember(m.id);
    setCountryDraft(m.country??"");
  }
  async function saveMemberCountry(m:Member){
    const value=countryDraft.trim();
    if(value.length<2||value.length>100){setError("Le pays doit comporter de 2 à 100 caractères.");return;}
    setBusy(true);setError("");setNotice("");
    try{
      const result=await supabase.from("members").update({country:value}).eq("id",m.id);
      if(result.error)throw result.error;
      await load();setNotice("Pays de l'intervenant enregistré.");
    }catch(e){setError(e instanceof Error?e.message:"Impossible de mettre à jour le pays.");}
    finally{setBusy(false);}
  }
  async function toggleMember(m:Member){
    setBusy(true);const r=await supabase.from("members").update({active:!m.active}).eq("id",m.id);
    if(r.error)setError(r.error.message);await load();setBusy(false);
  }
  async function assign(a:Assignment,id:string){
    setBusy(true);setError("");setNotice("");
    const r=await supabase.from("assignments").update({member_id:id||null,status:id?"pending":"unassigned",responded_at:null}).eq("id",a.id);
    if(r.error)setError(r.error.message);else setNotice("Affectation enregistrée. Le lien d'invitation sera ajouté ultérieurement.");
    await load();setBusy(false);
  }
  async function saveTime(m:Meeting,start:string,end:string){
    setBusy(true);const r=await supabase.from("meetings").update({starts_at:start,ends_at:end,ends_next_day:end<start}).eq("id",m.id);
    if(r.error)setError(r.error.message);await load();setBusy(false);
  }
  async function confirmAfterReply(a:Assignment){
    if(!a.member_id || a.status!=="pending")return;
    setBusy(true);setError("");setNotice("");
    try {
      const result=await supabase.from("assignments")
        .update({status:"confirmed",responded_at:new Date().toISOString()})
        .eq("id",a.id).eq("status","pending");
      if(result.error)throw result.error;
      await load();
      setNotice("Confirmation enregistrée après la réponse de l'intervenant.");
    } catch(e) {
      setError(e instanceof Error ? e.message : "La confirmation n'a pas pu être enregistrée.");
    } finally {setBusy(false);}
  }
  async function logout(){setBusy(true);await supabase.auth.signOut();router.replace("/connexion");router.refresh();}
  function changeMonth(delta:number){
    const result=nextMonth(year,month,delta);setYear(result.year);setMonth(result.monthIndex);setNotice("");
  }
  const confirmed=assignments.filter(x=>x.status==="confirmed").length;
  const pending=assignments.filter(x=>x.status==="pending").length;
  const empty=assignments.filter(x=>x.status==="unassigned").length;
  const title=new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month,1)));

  return <div className="layout">
    <aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark">PA</span><div><b>Planning Assemblée</b><small className="assembly-name">FOI VICTORIEUSE</small><small>Administration</small></div></div>
      <nav className="nav">
        <button className={tab==="planning"?"selected":""} onClick={()=>setTab("planning")}>▦ Planning mensuel</button>
        <button className={tab==="members"?"selected":""} onClick={()=>setTab("members")}>♙ Intervenants</button>
        <button className={tab==="validations"?"selected":""} onClick={()=>setTab("validations")}>✓ Partage et validations</button>
      </nav><div className="bottom"><small>{userEmail}</small><button className="secondary" disabled={busy} onClick={()=>void logout()}>Déconnexion</button></div>
    </aside>
    <main className="main"><header><p className="eyebrow">Planning Assemblée — FOI VICTORIEUSE</p><h1>{tab==="planning"?"Planning mensuel":tab==="members"?"Intervenants":"Validations"}</h1>
      <p className="muted">Vendredi 22h–01h (samedi) · Dimanche 16h–18h</p></header>
      {error&&<p className="alert error" role="alert">{error}</p>}{notice&&<p className="alert success" role="status">{notice}</p>}
      {tab==="planning"&&<><section className="month-head">
        <div className="month-nav"><button className="secondary" onClick={()=>changeMonth(-1)}>‹</button><h2>{title}</h2><button className="secondary" onClick={()=>changeMonth(1)}>›</button></div>
        <button className="primary" disabled={loading||busy} onClick={()=>void generateMonth()}>{plan?"Vérifier / compléter le mois":"Générer le mois"}</button></section>
        <section className="stats"><div><b>{meetings.length}</b>Réunions</div><div><b>{assignments.length}</b>Responsabilités</div><div><b>{pending}</b>À confirmer</div><div><b>{confirmed}</b>Confirmées</div></section>
        {loading?<p>Chargement du planning…</p>:!plan?<section className="card empty"><h2>Aucun planning pour ce mois</h2><p>Utilise « Générer le mois » pour créer toutes les réunions et leurs quatre fonctions.</p></section>:
        <><p className="muted">{empty} fonction(s) sans intervenant. Une personne peut assurer plusieurs fonctions.</p>
        <section className="meetings">{meetings.map(m=><MonthMeeting key={m.id} meeting={m} members={members} assignments={assignments.filter(a=>a.meeting_id===m.id)} busy={busy} assign={assign} saveTime={saveTime}/>)}</section></>}
      </>}
      {tab==="members"&&<section className="members"><div className="card"><h2>Ajouter un intervenant</h2>
        <form className="stack" onSubmit={e=>void addMember(e)}>
          <label>Nom complet<input value={name} onChange={e=>setName(e.target.value)} minLength={2} required/></label>
          <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Téléphone WhatsApp<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+33…"/></label>
          <label>Pays de l'intervenant<input type="text" list="assemblee-pays" autoComplete="country-name" maxLength={100}
            placeholder="Ex. : France, Bénin, Côte d'Ivoire…" value={country} onChange={e=>setCountry(e.target.value)} required/></label>
          <datalist id="assemblee-pays">
            {["France","Côte d'Ivoire","Bénin","Cameroun","République démocratique du Congo","République du Congo","Togo","Sénégal","Burkina Faso","Gabon","Mali","Guinée","Niger","Nigeria","Ghana","Belgique","Suisse","Canada","États-Unis","Haïti","Maroc","Algérie","Madagascar","Allemagne","Royaume-Uni"].map(p=><option key={p} value={p}/>)}
          </datalist>
          <fieldset className="role-groups"><legend>Groupes de responsabilités</legend>
            <p className="muted small">Une personne peut appartenir à plusieurs groupes.</p>
            {(Object.keys(ROLE_LABELS) as RoleKey[]).map(role=><label key={role} className="group-check">
              <input type="checkbox" checked={selectedRoles.includes(role)}
                onChange={e=>setSelectedRoles(prev=>e.target.checked?[...prev,role]:prev.filter(x=>x!==role))}/>
              {ROLE_LABELS[role]}
            </label>)}
          </fieldset>
          <button className="primary" type="submit" disabled={busy||name.trim().length<2||country.trim().length<2||selectedRoles.length===0}>Ajouter</button>
        </form></div>
        <div className="card"><h2>Intervenants ({members.length})</h2>
          {!members.length?<p className="muted">Aucun intervenant enregistré.</p>:members.map(m=><div className="member" key={m.id}>
          <div><b>{m.full_name}</b><small><strong>Pays :</strong> {m.country||"À renseigner"}</small><small>{m.email||m.whatsapp_phone||"Contact à compléter"}</small>
            <small>{m.role_keys.length ? m.role_keys.map(r=>ROLE_LABELS[r]).join(" · ") : "Aucun groupe"}</small>
            {editingMember===m.id&&<div className="role-edit">
              <label className="country-edit-label">Pays
                <input type="text" list="assemblee-pays" autoComplete="country-name" maxLength={100}
                  value={countryDraft} onChange={e=>setCountryDraft(e.target.value)} placeholder="Pays de l'intervenant" disabled={busy}/>
              </label>
              <button className="secondary" type="button" disabled={busy||countryDraft.trim().length<2||countryDraft.trim()===m.country}
                onClick={()=>void saveMemberCountry(m)}>Enregistrer le pays</button>
              <b className="small">Groupes de responsabilités</b>
              {(Object.keys(ROLE_LABELS) as RoleKey[]).map(role=><label key={role} className="group-check">
                <input type="checkbox" checked={m.role_keys.includes(role)} disabled={busy}
                  onChange={()=>void updateMemberRoles(m,role)}/>
                {ROLE_LABELS[role]}
              </label>)}
            </div>}
          </div>
          <div className="member-actions">
            <button className="secondary" disabled={busy} onClick={()=>toggleMemberEditor(m)}>
              {editingMember===m.id?"Fermer":"Modifier"}
            </button>
            <button className="secondary" disabled={busy} onClick={()=>void toggleMember(m)}>{m.active?"Retirer":"Réactiver"}</button>
          </div></div>)}
        </div></section>}
      {tab==="validations"&&<ShareCenter
        members={members} meetings={meetings} assignments={assignments}
        monthLabel={title} busy={busy} onManualConfirmation={confirmAfterReply}
      />}
      <footer>Première version · Accès réservé à l'administrateur · Projet Supabase indépendant</footer>
    </main>
  </div>;
}
