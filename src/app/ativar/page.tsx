import type { Metadata } from "next"
import { ActivateAccount } from "@/components/activate-account"

export const metadata: Metadata = {
  title: "Ativar conta",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return <ActivateAccount token={token ?? ""} />
}
