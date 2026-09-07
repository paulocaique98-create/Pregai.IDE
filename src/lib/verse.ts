import { cache } from "react";

export interface DailyVerse {
  text: string;
  reference: string;
  url: string;
  date: string;
}

const SOURCE = "https://www.bibliaon.com/versiculo_do_dia/";

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
