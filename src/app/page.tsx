import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-5xl">Pregai</h1>
      <p className="max-w-md text-muted-foreground">
        Sites e operação para igrejas. Do acolhimento do visitante à organização
        da obra.
      </p>
      <Link
        href="/entrar"
        className="rounded-[var(--radius)] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Começar
      </Link>
    </main>
  );
}
