const LOGOS = new Set([
  "apostabet",
  "apostaganha",
  "bandbet",
  "bet365",
  "bet7k",
  "betano",
  "betao",
  "betbratradeball",
  "betdasorte",
  "betesporte",
  "betfair",
  "betfast",
  "betfusion",
  "betmgm",
  "betnacional",
  "betpix365",
  "betsson",
  "betvip",
  "bolsatradeball",
  "br4bet",
  "brbet",
  "cassinobet",
  "esportesdasorte",
  "esportiva",
  "estrelabet",
  "f12bet",
  "ganheibet",
  "goldbet",
  "hiperbet",
  "jogodeouro",
  "kingpanda",
  "kto",
  "lotogreen",
  "marjosports",
  "mcgames",
  "novibet",
  "pagol",
  "pixbet",
  "r7",
  "reidopitaco",
  "segurobet",
  "sortenabet",
  "sportingbet",
  "sportybet",
  "stake",
  "superbet",
  "vera",
  "vivasorte",
])

const SLUG_OVERRIDES: Record<string, string> = {
  goldebet: "goldbet",
}

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export function bookmakerLogo(name: string) {
  const slug = slugify(name)
  const file = SLUG_OVERRIDES[slug] ?? slug
  return LOGOS.has(file) ? `/bookmakers/${file}.webp` : null
}
