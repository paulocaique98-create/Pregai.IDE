import { cache } from "react";

export interface DailyVerse {
  text: string;
  reference: string;
  url: string;
  date: string;
}

const SOURCE = "https://www.bibliaon.com/versiculo_do_dia/";
const DEVO_SOURCE = "https://www.bibliaon.com/devocional_diario/";

export interface DailyDevotional {
  title: string;
  dateLabel: string;
  bodyHtml: string;
  url: string;
}

function sanitizeDevotional(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(?:iframe|img|link|meta|bib-bookmark|button|svg|i)\b[^>]*>/gi, "")
    .replace(/<a\b[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    // mantém só tags de formatação; remove atributos das demais
    .replace(
      /<(\/?)(?!p\b|br\b|strong\b|em\b|b\b|i\b|h3\b|h4\b|ul\b|ol\b|li\b|blockquote\b|div\b)[a-z][a-z0-9]*[^>]*>/gi,
      "",
    )
    .replace(/<(p|h3|h4|ul|ol|li|blockquote|div)\b[^>]*>/gi, "<$1>")
    .trim();
}

/** Devocional diário (BíbliaOn) — reflexão completa. */
export const getDailyDevotional = cache(async (): Promise<DailyDevotional | null> => {
  try {
    const res = await fetch(DEVO_SOURCE, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PregaiBot/1.0)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const meta = html.match(
      /prompt-type="devocional"[\s\S]*?data-title="([^"]+)"[\s\S]*?url="([^"]+)"/i,
    );
    const title = meta?.[1]?.trim() ?? "Devocional de hoje";
    const url = meta?.[2] ? `https://www.bibliaon.com${meta[2]}` : DEVO_SOURCE;

    const month = html.match(/devcal-month">([^<]+)</i)?.[1]?.trim() ?? "";
    const day = html.match(/devday-number">([^<]+)</i)?.[1]?.trim() ?? "";
    const weekday = html.match(/devday-txt">([^<]+)</i)?.[1]?.trim() ?? "";
    const dateLabel = [weekday, day, month].filter(Boolean).join(", ").toLowerCase();

    const box = html.indexOf("color-box devocional-diario");
    if (box === -1) return null;
    const marker = '<div class="articlebody">';
    const abStart = html.indexOf(marker, box);
    if (abStart === -1) return null;
    const end = html.indexOf('<div class="daily-card__footer"', abStart);
    let body = html.slice(abStart + marker.length, end === -1 ? undefined : end);
    body = body.replace(/<\/div>\s*$/i, "");
    const bodyHtml = sanitizeDevotional(body);
    if (!bodyHtml) return null;

    return { title, dateLabel, bodyHtml, url };
  } catch {
    return null;
  }
});

/** Versículo do dia (BíbliaOn). Revalida de hora em hora; a fonte atualiza 1x/dia. */
export const getDailyVerse = cache(async (): Promise<DailyVerse | null> => {
  try {
    const res = await fetch(SOURCE, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PregaiBot/1.0)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const block = html.match(/id="versiculo_hoje"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
    const text = block
      .split(/<br\s*\/?>/i)[0]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return null;

    const reference =
      html.match(/data-title="([^"]+)"/i)?.[1]?.trim() ??
      block.match(/<a[^>]*>([^<]+)<\/a>/i)?.[1]?.trim() ??
      "";

    const path =
      html.match(/<bib-bookmark[^>]*url="([^"]+)"/i)?.[1] ??
      block.match(/href="(\/versiculo\/[^"]+)"/i)?.[1] ??
      "";
    const url = path ? `https://www.bibliaon.com${path}` : SOURCE;

    const date = html.match(/class="v_date"[^>]*>([^<]+)<\/h4>/i)?.[1]?.trim() ?? "";

    return { text, reference, url, date };
  } catch {
    return null;
  }
});
