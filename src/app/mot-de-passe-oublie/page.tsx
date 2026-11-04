"use client";
import Link from "next/link";
import {useEffect, useState, type FormEvent} from "react";
import {createClient} from "@/lib/supabase/browser";

export default function MotDePasseOublie() {
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    if(new URLSearchParams(window.location.search).get("erreur")==="lien")
      setError("Le lien est invalide, expiré ou déjà utilisé. Demande un nouveau lien.");
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError("");
    try {
      const site=process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo=new URL("/auth/confirm",site).toString();
      const {error:err}=await createClient().auth.resetPasswordForEmail(email.trim(),{redirectTo});
      if(err) {
        setError(/rate limit|too many/i.test(err.message)
          ?"Trop de demandes. Réessaie un peu plus tard."
          :"Envoi impossible. Vérifie la configuration des e-mails Supabase.");
      } else setSent(true);
    } catch {setError("Erreur de connexion au service. Réessaie.");}
    finally {setBusy(false);}
  }
  return <main className="login"><section className="login-card">
    <div className="brand-mark">PA</div>
    <p className="eyebrow">Sécurité du compte</p>
    <h1>Mot de passe oublié</h1>
    {sent?<p role="status" className="alert success">Si un compte correspond à cette adresse et si l'envoi est autorisé, un e-mail de réinitialisation arrivera. Vérifie aussi les spams.</p>:
    <><p className="muted">Saisis l'adresse e-mail du compte administrateur.</p>
      <form className="stack" onSubmit={submit}>
        <label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        {error&&<p className="alert error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>{busy?"Envoi en cours…":"Envoyer le lien de réinitialisation"}</button>
      </form></>}
    <p><Link className="text-link" href="/connexion">Retour à la connexion</Link></p>
  </section></main>;
}
