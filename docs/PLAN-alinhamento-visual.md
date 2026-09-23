# Plano: alinhar o app à linguagem do welcome/login

## Objetivo

O welcome e o login definem a identidade visual do BetHub. O resto do app ficou com a forma genérica do shadcn: cantos de 8px, controles de 36px, cards quase sem sombra e nenhum vestígio da grade. Este plano leva a linguagem do login para todas as telas e faz o login e o welcome respeitarem o tema escolhido.

Trata-se de **extensão de um mundo visual existente**, não de redesign. O welcome/login é a referência e não muda de identidade. Continuam intactos o conteúdo, as funcionalidades, os fluxos, os cálculos e os textos das telas internas.

## Status

- [x] Fase 0: tokens, grade estática, DESIGN.md
- [x] Fase 1: componentes base, shell, KineticGrid com tema (com fallback), welcome/login com tema, cadastro no `AuthShell`
- [ ] Fase 2: telas principais
- [ ] Fase 3: telas auxiliares e fechamento

## Decisões tomadas

| Tema | Decisão |
| --- | --- |
| Tema claro | Continua no app. Welcome e login também passam a respeitar o tema (claro, escuro e sistema). O escuro continua sendo o padrão. |
| Grade de fundo | Dentro do app, grade **estática** e sutil: os mesmos pontos e linhas, sem animação nem reação ao mouse. O KineticGrid animado fica só no welcome/login. |
| Superfícies | **Vidro só em destaques:** sidebar, formulário "Nova aposta", calculadora de surebet, dialogs e sheets. Cards, tabelas e filtros ficam com a forma do login (cantos, borda, sombra), mas com fundo opaco. |
| Entrega | Em três fases, com revisão ao fim de cada uma. |

## Linguagem de referência (extraída do código atual)

Arquivos-fonte: `components/login-screen.tsx`, `components/landing/*`, `components/ui/kinetic-grid.tsx`.

- **Fundo:** `#0B0D0C` e grade de 62px com pontos a cada 30px (linha branca a 5,5%, ponto a 12%).
- **Painel de vidro:** `rgba(10,12,11,0.70)`, `backdrop-blur-xl`, borda `white/10`, canto de 20px e sombra `0 24px 80px -40px rgba(0,0,0,.9)`.
- **Halo:** brilho verde (`primary/10`, `blur-[120px]`) atrás do elemento principal.
- **Controles:** 44px de altura, canto de 17px, fundo `white/3%`, borda `white/10`, placeholder `white/30`.
- **Botão principal:** verde, com anel `0 0 0 1px rgba(34,197,94,.35)` e brilho `0 16px 40px -20px rgba(34,197,94,.8)`. No hover usa `brand-bright`.
- **Botão secundário:** fundo `white/3%` e borda `white/12`. No hover, `white/7%` e `white/20`.
- **Tipografia:**
  - Título: 26–30px, semibold, tracking apertado.
  - Texto de apoio: 13,5px com `white/55`.
  - Rótulo: 13px com `white/80`.
  - Microrrótulo: 11px, maiúsculas, tracking de 0,06em.
- **Números:** Roboto Mono tabular, em "chip" de borda fina para odds.
- **Resultados:** ponto colorido dentro de um círculo tingido (`profit/10`, `loss/10`).
- **Movimento:** `rise` / `rise-scale` com `cubic-bezier(0.22,1,0.36,1)`, apenas na entrada das telas públicas.

## Fases e tarefas

### Fase 0: fundação (tokens e documentação)

Tudo depende desta fase. Nenhuma tela muda de aparência sozinha aqui, a não ser pelos componentes base.

| # | Tarefa | Arquivos | Skill / agente |
| --- | --- | --- | --- |
| 0.1 | Criar os tokens de forma em `globals.css`. Raios: `--radius-panel: 20px`, `--radius-control: 17px` (controle de 44px) e `--radius-control-sm: 12px` (compacto, 32–36px). Sombras: `--shadow-panel` e `--shadow-primary` (anel + brilho). Superfícies: `--surface-glass`, `--surface-glass-border`, `--field-placeholder`. Todos com valores para claro e escuro. | `src/app/globals.css` | `impeccable extract` |
| 0.2 | Definir a versão clara da linguagem. Fundo `#F6F8F6`, grade escura com alfa baixo (linha ~6%, ponto ~14%), vidro `rgba(255,255,255,0.72)` com borda `rgba(11,13,12,0.10)`, sombra de painel mais curta e verde `#15803D`. Medir o contraste de todos os pares de texto (≥ 4,5:1). | `globals.css` | `impeccable colorize` + validação de contraste |
| 0.3 | Utilitário de grade estática `.grid-backdrop` em CSS puro, com gradientes repetidos de linhas e pontos a partir dos tokens. Nada de canvas. Fica atrás do `<main>` do app, em posição fixa, com um único halo verde no topo. | `globals.css`, `app/(app)/layout.tsx` | `impeccable layout` |
| 0.4 | Reescrever o DESIGN.md. O atual descreve a paleta azul antiga. O novo documenta a linguagem acima, os tokens das duas versões e as regras de vidro × opaco. | `docs/DESIGN.md` | `impeccable document` |

### Fase 1: componentes base, shell e telas públicas

| # | Tarefa | Arquivos | Skill / agente |
| --- | --- | --- | --- |
| 1.1 | `Button`: variante padrão com `--shadow-primary` e hover `brand-bright`. `outline` e `ghost` no estilo secundário do login. Tamanhos: `lg` = 44px com `--radius-control`, `default`/`sm` com `--radius-control-sm`. Feedback de toque com `active:scale-[0.98]` (transform de 100ms). | `components/ui/button.tsx` | `emil-design-eng` |
| 1.2 | `Input`, `Textarea`, `SelectTrigger`, `DecimalInput`: 44px no formulário principal e 36px nos filtros. Fundo `--field`, borda `white/10`, placeholder por token e foco com anel verde. | `ui/input.tsx`, `ui/textarea.tsx`, `ui/select.tsx`, `components/decimal-input.tsx` | `emil-design-eng` |
| 1.3 | `Card`: canto `--radius-panel`, borda por token e `--shadow-panel`, sempre opaco. Criar uma variante `glass` (prop ou classe `.panel-glass`) só para os destaques. | `ui/card.tsx` | `impeccable extract` |
| 1.4 | `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Select` (conteúdo): superfície de vidro, canto de 20px (16px em menus), sombra de painel. Entrada com `rise-scale` curto (150–200ms) e saída mais rápida. | `ui/dialog.tsx`, `ui/sheet.tsx`, `ui/popover.tsx`, `ui/dropdown-menu.tsx`, `ui/select.tsx` | `animate` + `review-animations` |
| 1.5 | `Tabs`: lista com fundo `white/3%` e borda. O item ativo vira "pílula" com borda `white/10`, igual ao seletor "Últimos 30 dias" da splash. | `ui/tabs.tsx`, `globals.css` (remover o override `[data-slot="tabs-trigger"]`) | `emil-design-eng` |
| 1.6 | `Table`: cabeçalho em microrrótulo (11px, maiúsculas, tracking de 0,06em, `muted-foreground`), divisórias `white/7%` e odds no chip mono do preview. | `ui/table.tsx`, `globals.css` | `impeccable typeset` |
| 1.7 | `ResultBadge`: adotar o padrão do preview (ponto colorido em círculo tingido + texto), sem depender só de cor. | `components/result-badge.tsx` | `impeccable polish` |
| 1.8 | Shell: sidebar em vidro sobre a grade estática, `BrandMark` no lugar do texto "BetHub", item ativo como pílula com borda `primary/20`. O cabeçalho mobile ganha vidro e `env(safe-area-inset-top)`. A tela "Carregando..." usa o fundo com grade e o BrandMark. | `app/(app)/layout.tsx`, `components/landing/brand-mark.tsx` | `impeccable layout` + `mobile-native` |
| 1.9 | **KineticGrid com tema:** tirar as cores fixas do canvas, ler as variáveis CSS (`--grid-line`, `--grid-node`, `--grid-glow`, `--background`) e redesenhar quando o tema mudar (`MutationObserver` na classe do `<html>` ou `useTheme`). | `components/ui/kinetic-grid.tsx` | `frontend-specialist` |
| 1.10 | **Welcome/login com tema:** tirar o `className="dark"` forçado e trocar `text-white`, `white/xx`, `bg-[rgba(10,12,11,.7)]` e as sombras fixas por tokens. O degradê do título ("mais que uma planilha.") vira foreground → primary para funcionar nos dois temas; o design original é mantido, sem trocar por cor sólida. | `components/login-screen.tsx`, `components/landing/splash-hero.tsx`, `metric-card.tsx`, `portfolio-preview.tsx`, `bankroll-chart.tsx` | `impeccable polish` |
| 1.11 | **Cadastro:** refazer sobre o mesmo layout do login (KineticGrid, header com BrandMark, painel de vidro de 420px, campos de 44px, botão com brilho, link de volta para o login). Validação e texto continuam os mesmos. | `app/register/page.tsx` (extrair um `AuthShell` compartilhado com o login) | `impeccable extract` |

**Revisão da fase 1:** screenshots de login, welcome, cadastro e do shell vazio em 390/1440 × claro/escuro.

### Fase 2: telas principais (Punter, Surebet, Dashboard, Todas as apostas)

| # | Tarefa | Arquivos | Skill / agente |
| --- | --- | --- | --- |
| 2.1 | Cabeçalho de página padronizado: título de 26–30px semibold com tracking apertado e texto de apoio de 13,5px, via componente `PageHeader` (título, descrição, ações). Sem eyebrow. | novo `components/page-header.tsx`; `dashboard/page.tsx`, `method-space.tsx`, `bets-view.tsx` | `impeccable typeset` |
| 2.2 | KPIs: remodelar os cards de indicadores no padrão `MetricCard` do preview (microrrótulo, valor mono, linha de tendência com ícone). Um único componente `KpiCard` para Dashboard, Punter e Surebet. | novo `components/kpi-card.tsx`; `dashboard/page.tsx`, `method-space.tsx` | `impeccable extract` |
| 2.3 | "Nova aposta" (Punter) e calculadora (Surebet) em painel de vidro com halo verde, porque são o destaque da tela. Campos de 44px e botão "Registrar" no estilo do botão "Entrar". | `components/punter-create-form.tsx`, `bets-view.tsx` (SurebetCreateForm) | `high-end-visual-design` (como referência de acabamento) |
| 2.4 | Trocar os `<select>` nativos do formulário Punter pelo `Select` do sistema, para que abram no mesmo estilo dos filtros. Preservar navegação por teclado e a lógica de rascunho/importação. | `punter-create-form.tsx` | `emil-design-eng` |
| 2.5 | Gráfico "Lucro acumulado" com o tratamento do `BankrollChart`: moldura interna `white/3%`, eixo em mono, ponto final destacado e resumo "início → atual" no canto. | `dashboard/page.tsx` | `dataviz` |
| 2.6 | Lista de apostas: faixa de filtros em cartão opaco, tabela com cabeçalho em microrrótulo, odds em chip, ações agrupadas. No mobile, avaliar a lista no formato "Últimas apostas" do preview (linha com ponto de resultado) em vez da tabela com rolagem lateral. | `bets-view.tsx` | `impeccable adapt` + `mobile-native` |
| 2.7 | Movimento no app: nada de `rise` em cada tela. Um único momento: a entrada do painel principal (Nova aposta/calculadora) na primeira carga, curta (≤ 300ms). Transições de hover e pressionar em 100–150ms. Respeitar `prefers-reduced-motion` com alternativa sem deslocamento, em vez do kill global de 0,01ms. | `globals.css`, componentes da fase | `animate` + `review-animations` |

**Revisão da fase 2:** screenshots das quatro telas em 320/390/768/1440 × claro/escuro, com dados preenchidos e 10 pernas no Surebet.

### Fase 3: telas auxiliares e fechamento

| # | Tarefa | Arquivos | Skill / agente |
| --- | --- | --- | --- |
| 3.1 | Casas & Contas: `PageHeader`, cartão por casa com canto de 20px, logo em moldura com borda fina, "Saldo total" como KPI em linha. Formulário de movimentação em dialog de vidro. | `bookmakers/page.tsx` | `impeccable polish` |
| 3.2 | Freebets, Tipsters, Custos: `PageHeader`, tabelas no novo padrão e estados vazios com ícone e ação ("Nenhum tipster ainda · Novo tipster"). | `freebets/page.tsx`, `tipsters/page.tsx`, `costs/page.tsx` | `impeccable onboard` (só os estados vazios) |
| 3.3 | Configurações: seções em cartão, seletor de tema como grupo segmentado (Claro / Escuro / Sistema) em vez do dropdown. | `settings/page.tsx`, `components/theme-switcher.tsx` | `emil-design-eng` |
| 3.4 | Toasts (Sonner) com a superfície de vidro, borda por token e cores de resultado por token. | `components/ui/sonner.tsx` | `ask-sonner` |
| 3.5 | Varredura final: nenhuma cor fixa (`#`, `rgba`, `emerald-*`, `rose-*`, `amber-*`, `white/…`) fora de `globals.css`. Rodar o detector do impeccable em `src`. | todo `src` | `impeccable audit` |
| 3.6 | Auditoria e polimento geral, comparando com a nota de 13/20 da auditoria anterior. | — | `impeccable audit` → `impeccable polish` |

## Riscos e cuidados

- **Desempenho do vidro:** `backdrop-blur` em superfícies grandes com rolagem pesa no mobile. Por isso o vidro fica restrito aos destaques e a grade do app é CSS estático. Validar a rolagem da lista de apostas em aparelho real.
- **Contraste no claro:** os valores `white/55` e `white/30` do login não têm equivalente direto. Todo texto secundário precisa vir de token e passar por medição.
- **Degradê do título no claro:** branco → verde some em fundo claro. A proposta é foreground → primary. Se não agradar, a alternativa é peso ou cor sólida no trecho final, decidido na revisão da fase 1.
- **`<select>` nativo → `Select`:** o formulário Punter tem lógica de rascunho, importação por IA e desfazer. A troca precisa manter os testes de `tests/punter-draft.test.mjs` passando e a marca de "IA · conferir" nos campos importados.
- **Raio de 17px em controles compactos** vira pílula. Por isso existe um token separado de 12px para os tamanhos de 32–36px.
- **Lint preexistente:** há erros `react-hooks/set-state-in-effect` em várias páginas. Não corrigir neste trabalho; apenas não acrescentar novos.

## Verificação (a cada fase)

- [ ] `npx tsc --noEmit` sem erros.
- [ ] `node --test tests/punter-draft.test.mjs`: os 8 testes passando.
- [ ] ESLint nos arquivos alterados sem novos diagnósticos em relação ao HEAD.
- [ ] Detector do impeccable (`impeccable detect --json`) sem achados novos.
- [ ] Screenshots em 320, 390, 768 e 1440px × claro e escuro de todas as telas da fase, com dados fictícios (banco `bethub_preview`), sem overflow horizontal e sem erros de console.
- [ ] Contraste ≥ 4,5:1 em texto e ≥ 3:1 em bordas de controle e anel de foco, nos dois temas.
- [ ] Teclado: foco visível, ordem lógica, Escape fecha dialogs, "Pular para o conteúdo" funcionando.
- [ ] `prefers-reduced-motion`: sem deslocamentos, mas estados ainda perceptíveis.
- [ ] Troca de tema ao vivo no login e no app, incluindo o KineticGrid.
- [ ] Fluxos preservados: registrar aposta manual e importada, surebet com 2 e 10 pernas, liquidar, editar, excluir, filtros, movimentar conta.
- [ ] DESIGN.md atualizado e coerente com o código.

## Fora do escopo

- Mudanças de API, regras de cálculo, textos factuais ou novas funcionalidades.
- "Ver demonstração" e "Esqueci minha senha" continuam como estão, sem destino, até existir fluxo real.
- Upgrade de dependências.
