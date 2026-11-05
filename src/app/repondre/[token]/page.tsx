"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {ROLE_LABELS,formatFrenchDate,type RoleKey} from "@/lib/planning";
type Item={id:string;meeting_id:string;role_key:RoleKey;status:string;meeting:{meeting_date:string;starts_at:string;ends_at:string;ends_next_day:boolean}};
type Info={name:string;country:string|null;month:string;assignments:Item[]};
export default function Repondre(){
 const {token}=useParams<{token:string}>(),db=useMemo(()=>createClient(),[]);
 const [info,setInfo]=useState<Info|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[edit,setEdit]=useState<string|null>(null),[message,setMessage]=useState("");
 const refresh=useCallback(async()=>{
  if(!/^[a-f0-9]{64}$/.test(token||"")){setError("Lien invalide.");setLoading(false);return;}
  const {data,error}=await db.functions.invoke("planning-member-response",{body:{action:"view",token}});
  if(error||!data?.assignments){setError(data?.error||"Lien invalide, expiré ou remplacé.");setInfo(null);}
  else{setInfo(data as Info);setError("");}
  setLoading(false);
 },[db,token]);
 useEffect(()=>{void refresh();},[refresh]);
 async function respond(id:string,action:"confirm"|"change"){
  if(busy)return;setBusy(true);setNotice("");setError("");
  const {data,error}=await db.functions.invoke("planning-member-response",{body:{action:"respond",token,assignmentId:id,response:action,message}});
  if(error||!data?.ok)setError(data?.error||"La réponse n'a pas été enregistrée.");
  else{setEdit(null);setMessage("");await refresh();setNotice(action==="confirm"?"Responsabilité confirmée.":"Demande transmise à l'administrateur pour validation.");}
  setBusy(false);
 }
 return <main className="response-page"><div className="response-shell">
  <div className="response-brand"><div className="brand-mark">PA</div><div><strong>Planning Assemblée</strong><small>FOI VICTORIEUSE</small></div></div>
  <p className="eyebrow">Confirmation individuelle</p><h1>Mes responsabilités</h1>
  <p className="muted">Confirme tes disponibilités ou demande une modification. Seul l'administrateur peut approuver un changement.</p>
  {loading?<div className="card">Vérification du lien…</div>:error&&!info?<p className="alert error">{error} Demande un nouveau lien à l'administrateur.</p>:null}
  {info&&<><section className="card"><h2>Bonjour {info.name}</h2><p className="muted">{info.country||""} · {info.month.slice(0,7)} · Horaires de France</p></section>
   {notice&&<p className="alert success" role="status">{notice}</p>}{error&&<p className="alert error" role="alert">{error}</p>}
   {info.assignments.map(a=><section className="card response-task" key={a.id}>
    <p className="eyebrow">{formatFrenchDate(a.meeting.meeting_date)}</p><h2>{ROLE_LABELS[a.role_key]}</h2>
    <p>{a.meeting.starts_at.slice(0,5)} – {a.meeting.ends_at.slice(0,5)}{a.meeting.ends_next_day?" (le lendemain)":""}</p>
    <p className="muted">Statut : {a.status==="confirmed"?"Confirmé":a.status==="change_requested"?"Demande en attente":"À confirmer"}</p>
    {(a.status==="pending"||a.status==="confirmed")&&<div className="response-buttons">
      {a.status==="pending"&&<button className="primary" disabled={busy} onClick={()=>void respond(a.id,"confirm")}>Je confirme</button>}
      <button className="secondary" disabled={busy} onClick={()=>{setEdit(edit===a.id?null:a.id);setMessage("");}}>Demander une modification</button>
    </div>}
    {edit===a.id&&<div className="response-change"><label>Motif de la modification<textarea rows={3} maxLength={500} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Explique la modification souhaitée…"/></label>
      <button className="primary" disabled={busy||message.trim().length<8} onClick={()=>void respond(a.id,"change")}>Envoyer la demande</button>
    </div>}
   </section>)}
   {!info.assignments.length&&<p className="card">Aucune responsabilité pour ce mois.</p>}
  </>}
  <p className="muted small">Lien personnel : ne le transfère pas.</p>
 </div></main>;
}
