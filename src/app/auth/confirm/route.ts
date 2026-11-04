import {NextRequest, NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
  const token_hash=request.nextUrl.searchParams.get("token_hash");
  const type=request.nextUrl.searchParams.get("type");
  const code=request.nextUrl.searchParams.get("code");
  const supabase=await createClient();
  let accepted=false;
  try {
    if(token_hash&&type==="recovery") {
      const {error}=await supabase.auth.verifyOtp({type:"recovery",token_hash});
      accepted=!error;
    } else if(code) {
      const {error}=await supabase.auth.exchangeCodeForSession(code);
      accepted=!error;
    }
  } catch {accepted=false;}
  const site=process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  return NextResponse.redirect(new URL(accepted
    ?"/reinitialiser-mot-de-passe":"/mot-de-passe-oublie?erreur=lien",site));
}
