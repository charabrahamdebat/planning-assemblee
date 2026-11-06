"use client";
import {useMemo,useState} from "react";
import {formatFrenchDate,ROLE_LABELS,type RoleKey} from "@/lib/planning";

type Member={id:string;full_name:string;country:string|null};
type Meeting={id:string;meeting_date:string;starts_at:string;ends_at:string;ends_next_day:boolean};
type Assignment={id:string;meeting_id:string;member_id:string|null;role_key:RoleKey;status:string};
type ChangeRequest={id:string;assignment_id:string;status:string;created_at:string};
type Filter="pending"|"confirmed"|"change_requested"|"unassigned"|"all";
type Props={
 members:Member[];meetings:Meeting[];assignments:Assignment[];requests:ChangeRequest[];
 monthLabel:string;loading:boolean;
 onRefresh:()=>Promise<void>;onGoToMeeting:(meetingId:string)=>void;
};
const filters:{key:Filter;label:string}[]=[
 {key:"pending",label:"Sans réponse"},{key:"confirmed",label:"Confirmées"},
 {key:"change_requested",label:"Modifications"},{key:"unassigned",label:"Non attribuées"},
 {key:"all",label:"Toutes"}
];
export default function ResponseOverview({members,meetings,assignments,requests,monthLabel,loading,onRefresh,onGoToMeeting}:Props){
 const [filter,setFilter]=useState<Filter>("pending");
 const [search,setSearch]=useState("");
 const byMeeting=useMemo(()=>new Map(meetings.map(m=>[m.id,m])),[meetings]);
 const byMember=useMemo(()=>new Map(members.map(m=>[m.id,m])),[members]);
 const counts={
  pending:assignments.filter(a=>a.status==="pending").length,
  confirmed:assignments.filter(a=>a.status==="confirmed").length,
  change_requested:assignments.filter(a=>a.status==="change_requested").length,
  unassigned:assignments.filter(a=>a.status==="unassigned").length,
  all:assignments.length
 };
 const latestRequest=new Map<string,ChangeRequest>();
 for(const request of requests){
  if(!latestRequest.has(request.assignment_id))latestRequest.set(request.assignment_id,request);
 }
 const matches=assignments.filter(a=>{
  if(filter!=="all"&&a.status!==filter)return false;
  if(!search.trim())return true;
  const m=byMeeting.get(a.meeting_id),person=a.member_id?byMember.get(a.member_id):null;
  const haystack=[person?.full_name||"Non attribué",person?.country||"",ROLE_LABELS[a.role_key],m?.meeting_date||""].join(" ").toLocaleLowerCase("fr");
  return haystack.includes(search.trim().toLocaleLowerCase("fr"));
 }).sort((a,b)=>{
  const da=byMeeting.get(a.meeting_id)?.meeting_date||"";
  const db=byMeeting.get(b.meeting_id)?.meeting_date||"";
  return da.localeCompare(db)||ROLE_LABELS[a.role_key].localeCompare(ROLE_LABELS[b.role_key],"fr");
 });
 const grouped=new Map<string,Assignment[]>();
 for(const assignment of matches){
  const key=assignment.member_id||"unassigned";
  grouped.set(key,[...(grouped.get(key)||[]),assignment]);
 }
 const groups=Array.from(grouped.entries()).sort(([idA],[idB])=>
  (byMember.get(idA)?.full_name||"ZZZ - Non attribué").localeCompare(byMember.get(idB)?.full_name||"ZZZ - Non attribué","fr")
 );
 const uniquePeople=new Set(matches.map(a=>a.member_id).filter(Boolean)).size;
 function statusLabel(a:Assignment){
  if(a.status==="confirmed")return "Confirmé";
  if(a.status==="pending")return "Sans réponse";
  if(a.status==="unassigned")return "Non attribué";
  if(latestRequest.get(a.id)?.status==="approved")return "Modification approuvée : à réattribuer";
  return "Modification demandée";
 }
 return <section className="response-monitor">
  <div className="monitor-heading">
   <div><h2>Suivi des réponses — {monthLabel}</h2>
    <p className="muted">Chaque responsabilité est suivie séparément, même lorsqu'une personne intervient plusieurs fois.</p>
   </div>
   <button className="secondary" type="button" onClick={()=>void onRefresh()} disabled={loading}>
    {loading?"Actualisation…":"Actualiser"}
   </button>
  </div>
  <div className="monitor-stats" role="group" aria-label="Filtrer par état">
   {filters.map(item=><button key={item.key} type="button"
    className={filter===item.key?"monitor-stat active":"monitor-stat"}
    aria-pressed={filter===item.key} onClick={()=>setFilter(item.key)}>
     <strong>{counts[item.key]}</strong><span>{item.label}</span>
   </button>)}
  </div>
  <div className="monitor-toolbar">
   <label htmlFor="monitor-search">Rechercher un intervenant, un pays ou une responsabilité</label>
   <input id="monitor-search" type="search" value={search} onChange={e=>setSearch(e.target.value)}
    placeholder="Ex. : Dolly, intercession, 2026-11-08"/>
  </div>
  <p className="muted small" aria-live="polite">
   {matches.length} responsabilité(s) affichée(s) · {uniquePeople} intervenant(s) concerné(s)
  </p>
  {loading?<div className="card">Chargement des réponses…</div>:
   groups.length===0?<div className="card"><p>Aucun résultat pour ce filtre.</p></div>:
   groups.map(([id,items])=>{
    const person=byMember.get(id);
    return <article className="card monitor-person" key={id}>
      <div className="monitor-person-header">
       <div><h3>{person?.full_name||"Responsabilités non attribuées"}</h3>
         <p className="muted small">{person?.country||"Aucun pays"} · {items.length} responsabilité(s)</p>
       </div>
      </div>
      {items.map(a=>{
       const m=byMeeting.get(a.meeting_id);if(!m)return null;
       return <div className="monitor-task" key={a.id}>
        <div className="monitor-task-content">
         <strong>{formatFrenchDate(m.meeting_date)} — {ROLE_LABELS[a.role_key]}</strong>
         <small>{m.starts_at.slice(0,5)}–{m.ends_at.slice(0,5)}{m.ends_next_day?" (fin le lendemain)":""}</small>
        </div>
        <span className={"monitor-status status-"+a.status}>{statusLabel(a)}</span>
        <button className="secondary" type="button" onClick={()=>onGoToMeeting(m.id)}>Voir le culte</button>
       </div>;
      })}
    </article>;
   })
  }
  <p className="muted small">« Sans réponse » signifie qu'une responsabilité est attribuée mais n'a pas été confirmée. Ce statut ne prouve pas que le message WhatsApp ou l'e-mail a été envoyé ou lu.</p>
 </section>;
}
