import type { Metadata } from "next"
import { ReviewSignup } from "@/components/review-signup"

export const metadata: Metadata = {
  title: "Revisar cadastro",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function ApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return <ReviewSignup token={token ?? ""} />
}
