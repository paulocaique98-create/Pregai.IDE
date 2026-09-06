import { requireUser } from "@/lib/auth";

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  await requireUser();
  return <>{children}</>;
}
