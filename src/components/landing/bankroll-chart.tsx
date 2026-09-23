const VALUES = [4000, 4350, 4200, 4700, 4850, 5240]
const LABELS = ["MAR", "ABR", "MAI", "JUN", "JUL", "AGO"]

const W = 360
const H = 132
const PAD_X = 6
const PAD_TOP = 12
const PAD_BOTTOM = 10

const min = Math.min(...VALUES)
const max = Math.max(...VALUES)

const points = VALUES.map((v, i) => ({
  x: PAD_X + (i * (W - PAD_X * 2)) / (VALUES.length - 1),
  y: PAD_TOP + (1 - (v - min) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM),
}))

function smoothPath(pts: { x: number; y: number }[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

const linePath = smoothPath(points)
const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`

const approxLength = Math.round(
  points.reduce((acc, p, i) => {
    if (i === 0) return acc
    const prev = points[i - 1]
    return acc + Math.hypot(p.x - prev.x, p.y - prev.y)
  }, 0) * 1.15,
)

const last = points[points.length - 1]

export function BankrollChart() {
  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between">
        <span className="text-[11.5px] font-medium text-muted-foreground">Evolução da banca</span>
        <span className="numeric text-[11.5px] font-medium text-profit">
          R$ 4.000 → R$ 5.240
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[104px] w-full sm:h-[126px]"
        role="img"
        aria-label="Gráfico de linha da evolução da banca de março a agosto: R$ 4.000, R$ 4.350, R$ 4.200, R$ 4.700, R$ 4.850 e R$ 5.240."
      >
        <defs>
          <linearGradient id="bankroll-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#bankroll-area)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="draw-line"
          style={{ ["--line-length" as string]: approxLength }}
        />
        <circle cx={last.x} cy={last.y} r="7" fill="var(--primary)" opacity="0.18" />
        <circle cx={last.x} cy={last.y} r="3" fill="var(--brand-bright)" />
      </svg>

      <ul className="numeric mt-2 flex justify-between px-1 text-[10px] font-medium tracking-[0.06em] text-muted-foreground">
        {LABELS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </figure>
  )
}
