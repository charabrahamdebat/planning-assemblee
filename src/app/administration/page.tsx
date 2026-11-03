import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/AdminDashboard";
export const dynamic="force-dynamic";
export default async function AdministrationPage(){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) redirect("/connexion");
  const check=await supabase.from("app_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(check.error || !check.data) redirect("/connexion?erreur=acces");
  return <AdminDashboard userEmail={user.email ?? "Administrateur"}/>;
}
