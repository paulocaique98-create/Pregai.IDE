import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveHome } from "@/lib/home";
import { EntrarForm } from "./EntrarForm";

export const metadata = { title: "Entrar" };

export default async function EntrarPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(await resolveHome());
  return <EntrarForm />;
}
