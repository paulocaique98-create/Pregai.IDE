/** #rrggbb -> "H S% L%" (formato dos tokens CSS). Retorna null se inválido. */
export function hexToHslTriplet(hex?: string): string | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Texto que contrasta com a cor de fundo dada (branco ou quase-preto). */
export function contrastTriplet(hex?: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return "0 0% 100%";
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "0 0% 8%" : "0 0% 100%";
}

/** Estilo com os tokens de marca, para o wrapper do site público. */
export function brandStyle(primary?: string): React.CSSProperties | undefined {
  const triplet = hexToHslTriplet(primary);
  if (!triplet) return undefined;
  return {
    "--primary": triplet,
    "--primary-foreground": contrastTriplet(primary),
    "--accent": triplet,
    "--border-strong": triplet,
  } as React.CSSProperties;
}
