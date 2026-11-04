"use client";
import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";

function validatePassword(v:string) {
  return v.length>=12 && /[a-z]/.test(v) && /[A-Z]/.test(v)
    && /[0-9]/.test(v) && /[^a-zA-Z0-9]/.test(v);
}
export default function ReinitialiserMotDePasse() {
  const supabase=useMemo(()=>createClient(),[]);
  const router=useRouter();
  const [checking,setChecking]=useState(true),[authorized,setAuthorized]=useState(false);
  const [password,setPassword]=useState(""),[confirmation,setConfirmation]=useState("");
  const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    supabase.auth.getUser().then(({data,error})=>{
      if(alive){setAuthorized(!error&&Boolean(data.user));setChecking(false);}
    }).catch(()=>{if(alive){setAuthorized(false);setChecking(false);}});
    return ()=>{alive=false;};
  },[supabase]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    if(!validatePassword(password)){
      setError("Utilise 12 caractères minimum, avec majuscule, minuscule, chiffre et symbole.");return;
    }
    if(password!==confirmation){setError("Les deux mots de passe ne correspondent pas.");return;}
    setBusy(true);setError("");
    try {
      const {data:{user},error:userError}=await supabase.auth.getUser();
      if(userError||!user){setError("La session a expiré. Demande un nouveau lien.");return;}
      const {error:changeError}=await supabase.auth.updateUser({password});
      if(changeError){setError("Modification refusée. Vérifie les règles de mot de passe puis réessaie.");return;}
      await supabase.auth.signOut();
      router.replace("/connexion?mot_de_passe=modifie");
      router.refresh();
    }catch {setError("Une erreur technique est survenue. Réessaie.");}
    finally {setBusy(false);}
  }
  return <main className="login"><section className="login-card">
    <div className="brand-mark">PA</div><p className="eyebrow">Sécurité du compte</p>
    <h1>Choisir un nouveau mot de passe</h1>
    {checking?<p>Vérification du lien sécurisé…</p>:!authorized?
      <><p className="alert error" role="alert">Lien invalide ou expiré.</p>
        <p><Link href="/mot-de-passe-oublie" className="text-link">Demander un nouveau lien</Link></p></>:
      <form className="stack" onSubmit={submit}>
        <p className="muted">12 caractères minimum, avec majuscule, minuscule, chiffre et symbole.</p>
        <label>Nouveau mot de passe<input type={visible?"text":"password"} minLength={12} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <label>Confirmer le mot de passe<input type={visible?"text":"password"} minLength={12} required autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
        <label className="checkline"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/> Afficher les mots de passe</label>
        {error&&<p className="alert error" role="alert">{error}</p>}
        <button className="primary" disabled={busy} type="submit">{busy?"Enregistrement…":"Enregistrer mon nouveau mot de passe"}</button>
      </form>}
    <p><Link href="/connexion" className="text-link">Retour à la connexion</Link></p>
  </section></main>;
}
