import { permanentRedirect } from "next/navigation";

// A experiência do visitante agora vive na própria home, sem troca de página.
export default async function PrimeiraVezRedirect({
  params,
}: PageProps<"/igreja/[slug]/primeira-vez">) {
  const { slug } = await params;
  permanentRedirect(`/igreja/${slug}#primeira-vez`);
}
