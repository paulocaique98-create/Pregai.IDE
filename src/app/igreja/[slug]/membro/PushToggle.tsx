"use client";

import { useEffect, useState } from "react";
import { Sym } from "@/components/ui/primitives";
import { savePushSubscription, removePushSubscription } from "./push-actions";

const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BOYcDesu7zBvwGzOFwTlH-hbxUiWs0NmVf0F9FLHsY7pjboMph7UbL5QeP-YDDieBjVHLrBQchNUuh3ZryETK4c";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "loading" | "unsupported" | "on" | "off" | "denied";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const j = sub.toJSON();
        await savePushSubscription({
          endpoint: j.endpoint!,
          p256dh: j.keys!.p256dh,
          auth: j.keys!.auth,
        });
        setState("on");
      } else {
        setState("off");
      }
    });
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const j = sub.toJSON();
      await savePushSubscription({
        endpoint: j.endpoint!,
        p256dh: j.keys!.p256dh,
        auth: j.keys!.auth,
      });
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="card flex items-center gap-3 p-4">
      <Sym name="notifications_active" className="text-[22px]" />
      <div className="flex-1">
        <p className="text-sm font-medium">Notificações no celular</p>
        <p className="text-xs text-muted-foreground">
          {state === "denied"
            ? "Bloqueadas nas configurações do navegador."
            : state === "on"
              ? "Ativadas — você é avisado de escalas e avisos."
              : "Receba avisos de escala, oração e recados da igreja."}
        </p>
      </div>
      {state === "off" && (
        <button onClick={enable} disabled={busy} className="btn btn-primary !px-3 !py-1.5 text-xs">
          {busy ? "..." : "Ativar"}
        </button>
      )}
      {state === "on" && (
        <button onClick={disable} disabled={busy} className="btn btn-outline !px-3 !py-1.5 text-xs">
          Desativar
        </button>
      )}
    </div>
  );
}
