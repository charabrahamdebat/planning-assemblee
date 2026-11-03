import test from "node:test";
import assert from "node:assert/strict";
import { generateMeetings, ROLE_BY_KIND, nextMonth, formatTime } from "../src/lib/planning.ts";
test("Novembre 2026 : neuf réunions",()=>{
 const items=generateMeetings(2026,10);
 assert.equal(items.length,9);
 assert.equal(items.filter(x=>x.meeting_kind==="friday").length,4);
 assert.equal(items.filter(x=>x.meeting_kind==="sunday").length,5);
});
test("Vendredi traverse minuit",()=>{
 const x=generateMeetings(2026,10).find(x=>x.meeting_kind==="friday");
 assert.equal(x.starts_at,"22:00");assert.equal(x.ends_at,"01:00");assert.equal(x.ends_next_day,true);
});
test("Huit fonctions hebdomadaires, sans prédication vendredi",()=>{
 assert.deepEqual(ROLE_BY_KIND.friday,["opening","meditation","intercession","worship"]);
 assert.deepEqual(ROLE_BY_KIND.sunday,["opening","prayer","worship","preaching"]);
});
test("Navigation de mois et année",()=>{
 assert.deepEqual(nextMonth(2026,11,1),{year:2027,monthIndex:0});
 assert.deepEqual(nextMonth(2026,0,-1),{year:2025,monthIndex:11});
});
test("Formatage horaire",()=>assert.equal(formatTime("22:00:00"),"22h00"));
