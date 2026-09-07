export type SectionKey =
  | "hero"
  | "firstTime"
  | "schedule"
  | "about"
  | "ministries"
  | "media"
  | "events"
  | "prayer"
  | "contact"
  | "giving";

export const SECTION_ORDER: SectionKey[] = [
  "hero",
  "media",
  "firstTime",
  "schedule",
  "about",
  "ministries",
  "events",
  "prayer",
  "contact",
  "giving",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Boas-vindas (Hero)",
  firstTime: "Primeira vez",
  schedule: "Horários dos cultos",
  about: "Quem somos",
  ministries: "Ministérios",
  media: "Mídia / vídeos",
  events: "Eventos",
  prayer: "Pedido de oração",
  contact: "Contato",
  giving: "Dízimos e ofertas",
};

export const SECTION_DEFAULT_TITLES: Record<SectionKey, { title: string; subtitle: string }> = {
  hero: { title: "Bem-vindo à {nome}", subtitle: "Um lugar de fé, amor e comunhão" },
  firstTime: {
    title: "É sua primeira vez por aqui?",
    subtitle:
      "Queremos tornar sua visita leve, simples e acolhedora. Aqui você encontra uma comunidade que ama a Deus, ama pessoas e deseja caminhar com você.",
  },
  schedule: {
    title: "Horários dos cultos",
    subtitle: "Confira os dias e horários dos nossos cultos e programações.",
  },
  about: {
    title: "Quem somos",
    subtitle:
      "Somos uma igreja comprometida com o evangelho de Jesus, com a centralidade da Palavra e com uma vida cristã vivida em comunidade.",
  },
  ministries: {
    title: "Há um lugar para você aqui",
    subtitle: "A vida da igreja acontece de muitas formas ao longo da semana.",
  },
  media: {
    title: "Reassista a última transmissão",
    subtitle:
      "Não pôde estar presente? Assista ao culto mais recente e acompanhe a mensagem.",
  },
  events: {
    title: "Próximos encontros",
    subtitle: "Fique por dentro dos próximos cultos e eventos especiais.",
  },
  prayer: {
    title: "Podemos orar por você?",
    subtitle:
      "Você não precisa caminhar sozinho. Envie seu pedido de oração. Nossa equipe terá alegria em interceder pela sua vida.",
  },
  contact: { title: "Fale com a gente", subtitle: "Estamos aqui para ajudar você." },
  giving: {
    title: "Dízimos e ofertas",
    subtitle:
      "Sua generosidade coopera com a missão, o cuidado com pessoas e o avanço da obra de Deus.",
  },
};

export interface SiteConfig {
  is_published: boolean;
  branding: { name?: string; logoUrl?: string; primaryColor?: string; secondaryColor?: string };
  contact: { whatsapp?: string; email?: string; address?: string; mapsUrl?: string };
  social_links: { instagram?: string; youtube?: string; facebook?: string };
  hero: {
    welcomeLabel?: string;
    title?: string;
    subtitle?: string;
    coverImageUrl?: string;
  };
  about: { description?: string; values?: string[] };
  first_time?: {
    intro?: string;
    duration?: string;
    dressCode?: string;
    kids?: string;
    parking?: string;
    whatToBring?: string;
    arrival?: string;
  };
  schedule: { label: string; time: string }[];
  faq: { q: string; a: string }[];
  media: { youtubeEmbedUrl?: string; lastLiveLabel?: string; lastLiveDate?: string };
  giving: {
    description?: string;
    pixKey?: string;
    pixName?: string;
    pixCity?: string;
    showSection?: boolean;
  };
  sections_visibility: Partial<Record<SectionKey, boolean>>;
  section_titles: Partial<Record<SectionKey, { title?: string; subtitle?: string }>>;
  theme_config: { defaultMode: "dark" | "light"; allowToggle: boolean };
  seo: { title?: string; description?: string; ogImageUrl?: string };
}

export const DEFAULT_VISIBILITY: Record<SectionKey, boolean> = {
  hero: true,
  firstTime: true,
  schedule: true,
  about: true,
  ministries: true,
  media: true,
  events: true,
  prayer: true,
  contact: true,
  giving: true,
};

/** Aceita link do YouTube (watch, youtu.be, live, shorts) ou já-embed e devolve URL de embed. */
export function toYoutubeEmbed(url?: string): string | undefined {
  if (!url) return undefined;
  const u = url.trim();
  if (u.includes("/embed/")) return u;
  const m =
    u.match(/[?&]v=([\w-]{11})/) ||
    u.match(/youtu\.be\/([\w-]{11})/) ||
    u.match(/\/live\/([\w-]{11})/) ||
    u.match(/\/shorts\/([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : u;
}

export function resolveTitle(
  cfg: Pick<SiteConfig, "section_titles" | "branding">,
  key: SectionKey,
): { title: string; subtitle: string } {
  const custom = cfg.section_titles?.[key] ?? {};
  const base = SECTION_DEFAULT_TITLES[key];
  const name = cfg.branding?.name ?? "nossa igreja";
  return {
    title: (custom.title ?? base.title).replace("{nome}", name),
    subtitle: custom.subtitle ?? base.subtitle,
  };
}
