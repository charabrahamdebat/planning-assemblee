"use client";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
function Formulaire(){
  const router=useRouter(), search=useSearchParams();
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false);
  const [error,setError]=useState(search.get("erreur")==="acces"?"Accès administrateur non autorisé.":"");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    const {error}=await createClient().auth.signInWithPassword({email,password});
    setBusy(false);
    if(error){setError("Connexion impossible. Vérifie les identifiants.");return;}
    router.replace("/administration");router.refresh();
  }
  return <main className="login"><section className="login-card"><div className="brand-mark">PA</div><p className="eyebrow">Espace administrateur</p>
    <h1>Planning Assemblée</h1><p className="muted">Organise les réunions du vendredi et du dimanche.</p>
    <form onSubmit={submit} className="stack">
      <label>Adresse e-mail<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      {error&&<p className="error" role="alert">{error}</p>}
      <button disabled={busy} className="primary" type="submit">{busy?"Connexion…":"Se connecter"}</button>
    </form><p className="muted small">Les intervenants n'ont pas besoin de compte.</p></section></main>;
}
export default function ConnexionPage(){return <Suspense fallback={<p>Chargement…</p>}><Formulaire/></Suspense>;}
