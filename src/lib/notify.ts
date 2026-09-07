import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BOYcDesu7zBvwGzOFwTlH-hbxUiWs0NmVf0F9FLHsY7pjboMph7UbL5QeP-YDDieBjVHLrBQchNUuh3ZryETK4c";

const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:no-reply@pregai-ide.vercel.app";
if (PRIV) {
  try {
    webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC, PRIV);
  } catch {
    /* chave inválida — push vira no-op */
  }
}

export type Notice = {
  org_id?: string | null;
  kind: string;
  title: string;
  body?: string;
  url?: string;
};

/** Cria a notificação in-app e (se houver VAPID) envia push para os dispositivos do usuário. */
export async function notify(userId: string, n: Notice): Promise<void> {
  const db = createAdminClient();
  await db.from("notifications").insert({
    user_id: userId,
    org_id: n.org_id ?? null,
    kind: n.kind,
    title: n.title,
    body: n.body ?? null,
    url: n.url ?? null,
  });

  if (!PRIV) return;
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  const payload = JSON.stringify({
    title: n.title,
    body: n.body ?? "",
    url: n.url ?? "/",
  });

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );
}

/** Notifica vários usuários de uma vez. */
export async function notifyMany(userIds: string[], n: Notice): Promise<void> {
  await Promise.all([...new Set(userIds)].map((id) => notify(id, n)));
}
