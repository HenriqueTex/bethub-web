import { cookies } from "next/headers"
import { LoginScreen } from "@/components/login-screen"
import { WELCOME_COOKIE } from "@/lib/welcome"

export default async function LoginPage() {
  const store = await cookies()
  return <LoginScreen showWelcome={!store.has(WELCOME_COOKIE)} />
}
