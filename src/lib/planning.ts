export type MeetingKind = "friday" | "sunday";
export type RoleKey = "opening" | "meditation" | "intercession" | "worship" | "prayer" | "preaching";
export type AssignmentStatus = "unassigned" | "pending" | "confirmed" | "change_requested";

export const ROLE_LABELS: Record<RoleKey,string> = {
  opening: "Ouverture de la réunion",
  meditation: "Méditation",
  intercession: "Intercession",
  worship: "Louange et adoration",
  prayer: "Prière",
  preaching: "Prédication"
};
export const ROLE_BY_KIND: Record<MeetingKind, readonly RoleKey[]> = {
  friday: ["opening","meditation","intercession","worship"],
  sunday: ["opening","prayer","worship","preaching"]
};
export type MeetingTemplate = {
  meeting_date: string; meeting_kind: MeetingKind;
  starts_at: string; ends_at: string; ends_next_day: boolean;
};
const pad = (n:number) => String(n).padStart(2,"0");
export function monthStart(year:number, monthIndex:number) {
  return String(year) + "-" + pad(monthIndex + 1) + "-01";
}
export function generateMeetings(year:number, monthIndex:number):MeetingTemplate[] {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || year<2000 || year>2100 || monthIndex<0 || monthIndex>11) throw new Error("Date invalide");
  const count = new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();
  const list:MeetingTemplate[]=[];
  for(let day=1;day<=count;day++){
    const weekday=new Date(Date.UTC(year,monthIndex,day)).getUTCDay();
    if(weekday!==5 && weekday!==0)continue;
    const friday=weekday===5;
    list.push({meeting_date:String(year)+"-"+pad(monthIndex+1)+"-"+pad(day),
      meeting_kind:friday?"friday":"sunday", starts_at:friday?"22:00":"16:00",
      ends_at:friday?"01:00":"18:00", ends_next_day:friday});
  }
  return list;
}
export function nextMonth(year:number,monthIndex:number,delta:number){
  const d=new Date(Date.UTC(year,monthIndex+delta,1));
  return {year:d.getUTCFullYear(),monthIndex:d.getUTCMonth()};
}
export function formatFrenchDate(iso:string){
  const [y,m,d]=iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"})
    .format(new Date(Date.UTC(y,m-1,d)));
}
export function formatTime(value:string){return value.slice(0,5).replace(":","h");}
