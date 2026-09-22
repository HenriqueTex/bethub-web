import { apiFetch } from "@/lib/api"

type PushConfig = { configured: boolean; publicKey: string | null }

export type PushState = "unsupported" | "denied" | "off" | "on"

function base64ToUint8Array(base64: string) {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js")
}

export async function currentState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported"
  if (Notification.permission === "denied") return "denied"

  const existing = await (await registration()).pushManager.getSubscription()
  return existing ? "on" : "off"
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported"

  const config = await apiFetch<PushConfig>("/push/config")
  if (!config.configured || !config.publicKey) return "off"

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return permission === "denied" ? "denied" : "off"

  const reg = await registration()
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(config.publicKey),
    }))

  const json = subscription.toJSON() as { endpoint?: string; keys?: Record<string, string> }
  await apiFetch("/push/subscriptions", {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })

  return "on"
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported"

  const subscription = await (await registration()).pushManager.getSubscription()
  if (!subscription) return "off"

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await apiFetch("/push/subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined)

  return "off"
}
