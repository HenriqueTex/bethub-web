# BetHub: sistema de interface

O produto é um registro pessoal de apostas feitas em outros serviços. A interface serve para revisão e controle; não pressupõe negociação em tempo real nem transmite urgência. "Garantido" na calculadora de surebet se refere aos cenários informados, não a uma confirmação externa.

## Identidade

O welcome e o login definem a linguagem, e o restante do app a estende:

- **Fundo quase preto** (`#0B0D0C`), sobre uma grade de linhas finas com pontos nas interseções.
- **Painéis:** cantos de 20px, borda de 10% e sombra longa e difusa.
- **Verde da marca:** usado em ações, foco e lucro, com um halo discreto atrás do elemento principal de cada tela.
- **Tema:** o escuro é o padrão. O claro reproduz a mesma forma com a paleta invertida.

`src/app/globals.css` é a fonte de verdade. Código novo não usa hexadecimal, `rgba()` nem `white/…` nos componentes: tudo vem dos tokens abaixo, inclusive gráficos, canvas, estados, menus e toasts.

O alinhamento das telas a esta linguagem acontece em fases, conforme `docs/PLAN-alinhamento-visual.md`. A Fase 0 (tokens, grade e este documento) está aplicada. Onde um componente ainda não segue o sistema, a seção "Componentes" indica o estado atual e o destino.

## Tokens

### Cor

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| background | `#f6f8f6` | `#0b0d0c` | Fundo da aplicação e da grade |
| foreground | `#0b0d0c` | `#ffffff` | Texto principal |
| muted-foreground | `rgba(11,13,12,.62)` | `rgba(255,255,255,.55)` | Texto secundário |
| card | `#ffffff` | `#0f1211` | Cartões opacos (ficam sobre a grade) |
| popover | `#ffffff` | `#101413` | Conteúdo sobreposto |
| primary | `#15803d` | `#22c55e` | Ações, seleção e foco |
| brand-bright | `#16a34a` | `#4ade80` | Hover do botão principal, acentos da marca no escuro |
| profit | `#14722f` | `#4ade80` | Lucro, resultado positivo |
| loss | `#c02626` | `#f87171` | Prejuízo, custo, exclusão |
| warning | `#946000` | `#f4c36a` | Pendência e aviso |
| ai / ai-surface / ai-border | `#08664f` / `#ecfdf5` / `#4c9b80` | `#92e7c7` / `#14372f` / `#40856f` | Campos preenchidos por importação |
| field-placeholder | `rgba(11,13,12,.5)` | `rgba(255,255,255,.5)` | Placeholder de campos (utilitário `text-placeholder`) |
| halo | verde a 10% | verde a 10% | Brilho atrás do elemento principal |

Texto verde sobre fundo claro usa `primary`, porque `brand-bright` não chega a 4,5:1. No escuro, links e acentos da marca podem usar `brand-bright` (`text-primary dark:text-brand-bright`).

### Forma e superfície

| Utilitário | Valor | Uso |
| --- | --- | --- |
| `rounded-panel` | 20px | Cards, dialogs, painéis de autenticação, tabelas |
| `rounded-menu` | 16px | Popover, dropdown, conteúdo de select |
| `rounded-control` | 17px | Controles de 44px (formulários principais, login) |
| `rounded-control-sm` | 12px | Controles de 32–36px (filtros, botões padrão) |
| `shadow-panel` | escuro: `0 24px 80px -40px rgba(0,0,0,.9)`; claro: sombra curta + difusa | Todo painel |
| `shadow-primary` | anel de 1px + brilho verde | Botão principal |
| `bg-glass` / `border-glass-border` | `--surface-glass` / `--surface-glass-border` | Cor do vidro, quando usada isoladamente |
| `panel-glass` | fundo e borda de vidro + blur de 24px | Superfícies de vidro |
| `grid-backdrop` | grade estática em CSS + halo no topo | Fundo do app autenticado |
| `chip-numeric` | borda fina, fundo de 3%, Roboto Mono tabular | Odds e números curtos em destaque |

### Vidro × opaco

- **Vidro** (`panel-glass`): sidebar, cabeçalho mobile, dialogs, sheets, popovers, menus, painéis de autenticação, o formulário "Nova aposta" e a calculadora de surebet.
- **Opaco** (`bg-card`): cards de indicadores, tabelas, filtros e listas. Números e tabelas precisam de fundo estável, e o blur em listas longas pesa na rolagem.

### Grade

| Token | Claro | Escuro |
| --- | --- | --- |
| `--grid-rgb` | `11 13 12` | `255 255 255` |
| `--grid-line-alpha` | 0,06 | 0,055 |
| `--grid-node-alpha` | 0,14 | 0,12 |
| `--grid-dot-alpha` | 0,05 | 0,035 |
| `--grid-active-rgb` | `21 128 61` | `34 197 94` |
| `--grid-node-active-rgb` | `22 163 74` | `74 222 128` |
| `--app-grid-line-alpha` | 0,035 | 0,028 |
| `--app-grid-node-alpha` | 0,07 | 0,06 |

- **No app autenticado:** `.grid-backdrop`, com célula de 32px e ponto nas interseções. É mais densa e mais apagada que a grade do login, para não competir com tabelas e números. É estática e sem canvas, fica fixa atrás do conteúdo e é colocada em `app/(app)/layout.tsx`.
- **No welcome e no login:** o `KineticGrid` (canvas interativo). Hoje ele ainda tem as cores fixas no código. A Fase 1 passa a ler os tokens acima, com fallback para valores padrão caso as variáveis não estejam disponíveis.

## Componentes

| Componente | Estado atual | Destino (Fase 1) |
| --- | --- | --- |
| Button | shadcn, 36px, `rounded-lg` | `default` com `shadow-primary` e hover `brand-bright`; `outline`/`ghost` no estilo secundário do login; `lg` de 44px com `rounded-control` |
| Input, Textarea, SelectTrigger | 36px, `rounded-lg` | `rounded-control-sm`, placeholder `text-placeholder`; 44px nos formulários principais |
| Card | `rounded-xl`, sem sombra | `rounded-panel` + `shadow-panel`, opaco; variante de vidro para destaques |
| Dialog, Sheet, Popover, Dropdown, Select | opacos, `rounded-lg`/`xl` | `panel-glass`, `rounded-panel` / `rounded-menu`, `shadow-panel` |
| Tabs | trilho `bg-muted`, aba ativa com override em `globals.css` | trilho e aba ativa em pílula com borda de vidro |
| Table | cabeçalho `text-xs` | microrrótulo (11px, maiúsculas, tracking de 0,06em); odds em `chip-numeric` |
| ResultBadge | badge com cor sólida (Green/Red) ou tingida | pílula com ponto colorido + texto |
| Shell | sidebar opaca, texto "BetHub" | sidebar e cabeçalho mobile em vidro, BrandMark, item ativo em pílula |
| Welcome, login, cadastro | sempre escuros; cadastro no card antigo | seguem o tema; cadastro no mesmo layout do login |

## Tipografia e números

- Roboto para interface e títulos; Roboto Mono para valores numéricos de tabelas e chips.
- **Tamanhos:**

  | Elemento | Tamanho | Peso / estilo |
  | --- | --- | --- |
  | Título de página | 24px | 700 |
  | Título das telas públicas | 26–30px | semibold, tracking apertado |
  | Título interno | 16–20px | 600 |
  | Texto de interface | 14px | — |
  | Texto de apoio | 12–13,5px | — |
  | Microrrótulo | 11px | maiúsculas |
  | KPI | 20px no mobile, 24px a partir de 640px | números tabulares, quebra só entre valores |

- **Formato:** moeda em BRL; lucro positivo com `+`; percentuais com duas casas e vírgula; odds com até três casas.
- **Unidades assinadas do resumo:** duas casas, como `+15.02u`, conforme o briefing.
- Campos decimais aceitam ponto e vírgula; placeholders usam vírgula.
- Nada de rótulo decorativo (eyebrow) acima dos títulos.

## Movimento

- **Nas telas públicas:** `rise` e `rise-scale` com `cubic-bezier(0.22,1,0.36,1)` na entrada, e a revelação por máscara radial do welcome para o login. A máscara acompanha a onda do KineticGrid a 800 px/s (cerca de 2s em 1440×900).
- **Overlays:** entrada em 150–200ms com leve escala, saída em 100–150ms.
- **Hover e pressão:** 100–150ms.
- **No app:** nenhuma entrada em cada tela.
- **`prefers-reduced-motion`:** zera as durações. O KineticGrid desenha um único quadro estático.

## Responsividade e acessibilidade

- **Navegação:** barra lateral de 240px (64px recolhida) a partir de 768px e gaveta abaixo disso. O cabeçalho mobile mantém o acesso ao tema. "Pular para o conteúdo" permite saltar a navegação.
- **Margens:** 16px em telas pequenas, 24px em médias e 32px em grandes. Páginas do app usam `max-w-6xl`; Configurações é mais estreita.
- **Indicadores:** 2 colunas a partir de 360px e 4 a partir de 1280px.
- **Toque:** alvo mínimo de 44px em telas pequenas ou dispositivos de toque. Inputs de 16px no mobile, para evitar zoom.
- **Tabelas:** conservam as colunas e rolam dentro do próprio painel, numa região focável.
- **Overlays:** diálogos limitados ao viewport, com altura em `dvh`; popovers respeitam o espaço disponível.
- **Leitores de tela e teclado:** todo botão só com ícone tem `aria-label`. Foco visível em verde, com seleção de texto, cursor e scrollbar tematizados.
- **Contraste:** texto ≥ 4,5:1 nos dois temas. Os resultados sempre têm texto; campos importados têm indicação de origem.

## Fluxos

### Dashboard

Cabeçalho com período, indicadores (lucro, ROI/acerto, saldo, apostas), evolução do lucro acumulado e desempenho por dimensão. O traço e o preenchimento do gráfico mudam de cor no zero. Com um único dia liquidado, o acumulado parte de zero no dia anterior.

### Punter e importação

- **Entrada:** manual, ou importação por imagem ou texto, com desfazer.
- **Upload:** no celular, por toque; no desktop, arrastar, selecionar ou colar.
- **Campos importados:** fundo `ai-surface`, borda `ai-border` e rótulo **IA · conferir**. Editar remove a marca, e desfazer preserva as correções manuais. O destaque indica a origem dos dados, não que eles estejam corretos.

### Surebet

A calculadora vem antes dos dados de registro, com pernas de 2 a 10 e back/lay, comissão, cashback, boost e freebet. Os dados opcionais ficam em "Mais detalhes". Os campos numéricos ocupam o espaço disponível, com mínimo de 125px, e os percentuais têm a unidade no rótulo.

### Listas e telas auxiliares

Todas as apostas, Casas & Contas, Freebets, Custos e Tipsters seguem a mesma linguagem de tabelas, badges e estados vazios.

## Validação

Usar Node 25 (`.nvmrc`). A cada mudança visual:

- TypeScript, testes existentes (`tests/punter-draft.test.mjs`) e ESLint sem diagnósticos novos em relação ao HEAD.
- Detector do impeccable sem achados novos.
- Telas em 320, 390, 768 e 1440px nos dois temas, com dados preenchidos, sem overflow horizontal nem erro de console.
