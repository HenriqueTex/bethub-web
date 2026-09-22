/**
 * Cookie, e não localStorage: a decisão de mostrar as boas-vindas acontece no
 * servidor, então a tela já chega pronta em vez de piscar depois da hidratação.
 */
export const WELCOME_COOKIE = "bethub_welcome_v1"

const MAX_AGE = 60 * 60 * 24 * 365

export function markWelcomeSeen() {
  document.cookie = `${WELCOME_COOKIE}=1; path=/; max-age=${MAX_AGE}; samesite=lax`
}

export function resetWelcome() {
  document.cookie = `${WELCOME_COOKIE}=; path=/; max-age=0; samesite=lax`
}
