import Link from "next/link";
import { Sym } from "@/components/ui/primitives";

const FEATURES = [
  {
    icon: "language",
    title: "Site pronto da igreja",
    text: "Endereço próprio, editor visual, horários, ministérios, agenda e a última transmissão fixada — sem depender de desenvolvedor.",
  },
  {
    icon: "volunteer_activism",
    title: "Pedidos de oração",
    text: "O visitante envia pelo site e a equipe pastoral acompanha cada pedido do início ao fim, com opção de confidencialidade.",
  },
  {
    icon: "workspaces",
    title: "Departamentos com liderança",
    text: "Crie os departamentos da igreja e delegue: cada líder gerencia a própria equipe sem acesso ao resto da administração.",
  },
  {
    icon: "pix",
    title: "Dízimos e ofertas por PIX",
    text: "QR Code e código copia-e-cola gerados automaticamente. Sem intermediário, sem taxa da plataforma.",
  },
  {
    icon: "install_mobile",
    title: "App instalável",
    text: "O membro adiciona o ícone da igreja à tela inicial do celular e abre como aplicativo.",
  },
  {
    icon: "groups",
    title: "Membros e acessos",
    text: "Cadastro pelo site, aprovação da equipe e papéis pastorais — visitante, membro, líder, pastor.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-16 items-center justify-between px-5 md:px-10">
        <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          <Sym name="church" className="text-[24px]" /> Pregai
        </span>
        <Link href="/entrar" className="btn btn-outline">
          Entrar
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-5 py-20 text-center md:py-28">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Plataforma para igrejas
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
            A presença digital da sua igreja, organizada em um só lugar.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Site institucional, portal de membros, departamentos, pedidos de
            oração e contribuição por PIX — com o cuidado de quem entende a vida
            da igreja.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/entrar" className="btn btn-primary !px-6 !py-3">
              Começar agora
            </Link>
            <a href="#recursos" className="btn btn-ghost !px-6 !py-3">
              Ver recursos
            </a>
          </div>
        </section>

        <section id="recursos" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl">
              Tudo que a igreja precisa
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <Sym name={f.icon} className="text-[26px]" />
                  <h3 className="mt-3 font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl">
              Comece em minutos
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Crie sua conta, cadastre a igreja, publique o site. Sem cartão de
              crédito para começar.
            </p>
            <Link href="/entrar" className="btn btn-primary mt-6 !px-6 !py-3">
              Criar conta
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground md:px-10">
        <p>© {new Date().getFullYear()} Pregai</p>
        <p className="mt-1 flex flex-wrap justify-center gap-x-4">
          <Link href="/privacidade" className="underline">Privacidade</Link>
          <Link href="/termos" className="underline">Termos</Link>
          <Link href="/entrar" className="underline">Entrar</Link>
        </p>
      </footer>
    </div>
  );
}
