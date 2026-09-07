import { cache } from "react";

const BASE = "https://www.estudantesdabiblia.com.br";
const SUMMARY = `${BASE}/cpad_sumario_2026_3t.htm`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface EbdLessonRef {
  n: number;
  key: string;
  title: string;
}
export interface EbdQuarter {
  quarterTitle: string;
  theme: string;
  commentator: string;
  lessons: EbdLessonRef[];
}
export interface EbdLesson {
  title: string;
  date: string;
  html: string;
}

async function fetchLatin1(url: string, revalidate: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new TextDecoder("latin1").decode(buf);
  } catch {
    return null;
  }
}

const decodeEntities = (s: string) =>
  s
    .replace(/&#8212;/g, "—")
    .replace(/&#8211;/g, "–")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#171;/g, "«")
    .replace(/&#187;/g, "»")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

export const getEbdQuarter = cache(async (): Promise<EbdQuarter | null> => {
  const html = await fetchLatin1(SUMMARY, 86400);
  if (!html) return null;

  const theme =
    decodeEntities(
      (html.match(/<strong>T[íi]tulo:<\/strong>([\s\S]*?)<\/p>/i)?.[1] ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    ) || "Lições Bíblicas CPAD";
  const commentator = decodeEntities(
    html.match(/<strong>Comentarista:<\/strong>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "",
  );

  const lessons: EbdLessonRef[] = [];
  const re =
    /<strong>Li[çc][ãa]o\s*(\d+):<\/strong>\s*<a href="licoes_cpad\/2026\/(\d{4}-\d{2}-\d{2})\.htm">([\s\S]*?)<\/a\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    lessons.push({
      n: Number(m[1]),
      key: m[2],
      title: decodeEntities(m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")),
    });
  }
  if (lessons.length === 0) return null;

  return {
    quarterTitle: "3º Trimestre de 2026",
    theme,
    commentator,
    lessons: lessons.sort((a, b) => a.n - b.n),
  };
});

function sanitizeLesson(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(?:nav|form|button|iframe|ins)\b[\s\S]*?<\/(?:nav|form|button|iframe|ins)>/gi, "")
    .replace(/<a\b[^>]*>/gi, "")
    .replace(/<\/a\s*>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/src="\.\.\/\.\.\/images\//gi, `src="${BASE}/images/`)
    .replace(/src="\/images\//gi, `src="${BASE}/images/`)
    .replace(/<img([^>]*?)\/?>/gi, '<img$1 loading="lazy" />')
    // remove class/style/width/height/align de tags de texto, mantém a tag
    .replace(
      /<(p|h1|h2|h3|h4|h5|h6|div|span|table|tr|td|th|ul|ol|li|blockquote)\b[^>]*>/gi,
      "<$1>",
    )
    .replace(/<div>\s*<\/div>/gi, "")
    .replace(/(<p>\s*<\/p>\s*){2,}/gi, "<p></p>")
    .trim();
}

export const getEbdLesson = cache(async (key: string): Promise<EbdLesson | null> => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const html = await fetchLatin1(`${BASE}/licoes_cpad/2026/${key}.htm`, 86400);
  if (!html) return null;

  const start = html.search(/<p class="titlic">\s*<strong>Li[çc][ãa]o\s*\d+:/i);
  const end = html.indexOf('<div id="footer"');
  if (start === -1 || end === -1 || end <= start) return null;

  const region = html.slice(start, end);
  const title = decodeEntities(
    region
      .match(/<strong>Li[çc][ãa]o\s*\d+:<\/strong>([\s\S]*?)<\/p>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      ?.replace(/\s+/g, " ") ?? "Lição",
  );
  const date = decodeEntities(
    region.match(/<strong>Data:<\/strong>\s*<em>([^<]+)<\/em>/i)?.[1] ?? "",
  );

  return { title, date, html: decodeEntities(sanitizeLesson(region)) };
});
