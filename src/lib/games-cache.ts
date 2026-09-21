import { resources, type GameOption } from "@/lib/resources"

const CHAVE = "bethub_games_v1"

interface Cache {
  dia: string
  jogos: GameOption[]
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

/** Sem acento, minúsculo e sem pontuação: "Atlético-MG" casa com "atletico mg". */
export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * A agenda inteira cabe em memória, então baixamos uma vez por dia e filtramos no
 * cliente — digitar não custa requisição.
 */
export async function carregarJogos(): Promise<GameOption[]> {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const cache = JSON.parse(bruto) as Cache
      if (cache.dia === hoje()) return cache.jogos
    }
  } catch {
    // cache corrompido ou indisponível: segue e busca da API
  }

  const jogos = await resources.games.list()

  try {
    localStorage.setItem(CHAVE, JSON.stringify({ dia: hoje(), jogos } satisfies Cache))
  } catch {
    // sem espaço ou modo privado: funciona igual, só sem cache
  }

  return jogos
}

export function filtrarJogos(jogos: GameOption[], termo: string, limite = 30) {
  const busca = normalizar(termo)
  if (!busca) return jogos.slice(0, limite)

  const partes = busca.split(" ").filter(Boolean)
  return jogos
    .filter((jogo) => {
      const alvo = normalizar(`${jogo.name} ${jogo.competition ?? ""}`)
      return partes.every((parte) => alvo.includes(parte))
    })
    .slice(0, limite)
}
