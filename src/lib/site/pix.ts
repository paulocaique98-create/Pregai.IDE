// Gera o payload "PIX copia e cola" (BR Code / EMV) estático.
// Sem valor fixo — o pagador informa o quanto quer doar.

function tlv(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export function pixPayload(opts: { key: string; name: string; city: string }) {
  const key = opts.key.trim();
  if (!key) return "";
  const name = sanitize(opts.name || "IGREJA", 25) || "IGREJA";
  const city = sanitize(opts.city || "BRASIL", 15) || "BRASIL";

  const mai = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  let payload =
    tlv("00", "01") +
    tlv("26", mai) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("58", "BR") +
    tlv("59", name) +
    tlv("60", city) +
    tlv("62", tlv("05", "***")) +
    "6304";
  return payload + crc16(payload);
}
