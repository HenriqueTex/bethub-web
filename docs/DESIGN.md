# BetHub — sistema de interface

## Avaliação do documento original

A proposta acerta ao privilegiar números alinhados, superfícies discretas, cores financeiras consistentes e entrada rápida. Entretanto, o YAML e o texto usam paletas diferentes; Manrope/Inter conflitam com Roboto/Roboto Mono; a ausência de tema claro e o objetivo de encaixar seis pernas sem rolagem comprometem a leitura. Controles de 24px e rótulos de 10px também são inadequados ao toque.

O produto é um registro pessoal de apostas realizadas em outros serviços. A interface deve favorecer revisão e controle, sem pressupor negociação em tempo real ou transmitir urgência. “Garantido” na calculadora corresponde aos cenários informados, não a uma confirmação externa de execução.

## Direção aplicada

Interface analítica, com azul para navegação e ações, verde para lucro, rosa para perdas, âmbar para pendências e esmeralda com rótulo para informações importadas. Espaçamento de 4px como base; painéis com bordas discretas e cantos de 8px. Cabeçalhos apresentam título e contexto; o foco permanece nos dados e no próximo passo.

`src/app/globals.css` é a fonte de verdade. Evitar códigos hexadecimais nos componentes: usar tokens semânticos, inclusive nos gráficos, estados, menus e toasts.

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| background | #f3f6fa | #0c121c | Fundo da aplicação |
| card | #ffffff | #141e2b | Cartões e formulários |
| popover | #ffffff | #1c293a | Conteúdo sobreposto |
| foreground | #172536 | #e5edf5 | Texto principal |
| muted-foreground | #56677b | #a0b1c5 | Texto secundário |
| primary | #036b9a | #7bc9f4 | Ações, seleção e foco |
| primary-foreground | #ffffff | #082c43 | Texto sobre a ação principal |
| profit | #087749 | #53dba3 | Lucro e resultado positivo |
| loss | #be2347 | #ff8da3 | Prejuízo, custo, exclusão |
| warning | #946000 | #f4c36a | Pendência e aviso |
| ai | #08664f | #92e7c7 | Texto da indicação de importação |
| ai-surface | #ecfdf5 | #14372f | Campo importado |
| ai-border | #4c9b80 | #40856f | Limite do campo importado |

O tema escuro é o padrão. Claro e Sistema estão disponíveis na navegação, nas configurações e nas telas públicas. `next-themes` persiste a escolha em `bethub-theme`, aplica a classe antes da hidratação e acompanha mudanças do sistema quando essa opção está selecionada. Menus e toasts acompanham o tema.

## Tipografia e números

- Roboto para interface e títulos; Roboto Mono para valores numéricos de tabelas.
- Títulos de página: 24px, peso 700; títulos internos: 16–20px, peso 600.
- Texto de interface: 14px; contexto secundário: 12px. Rótulos de proveniência: 11px, sem esconder instruções essenciais.
- KPIs: 24px, números tabulares, quebra permitida para valores longos.
- Moeda em BRL; lucro positivo com `+`; percentuais com duas casas; odds com até três casas.
- Unidades assinadas do resumo com duas casas, como `+15.02u`, conforme o briefing.
- Campos decimais preservam o suporte existente a ponto e vírgula.

## Responsividade e acessibilidade

A navegação usa barra lateral de 240px (64px recolhida) a partir de 768px e menu em gaveta abaixo disso. O cabeçalho móvel mantém acesso ao tema. O link “Pular para o conteúdo” permite saltar a navegação por teclado.

O conteúdo usa margens de 16px em telas pequenas, 24px em médias e 32px em grandes. Grids devem permitir encolhimento (`min-width: 0`). Cabeçalhos e ações quebram linha. O produto admite rolagem vertical: não reduzir a legibilidade para encaixar toda a operação no primeiro quadro.

- Controles compartilhados com alvo mínimo de 44px em telas pequenas ou dispositivos de toque.
- Inputs de 16px no mobile para evitar ampliação automática durante edição.
- Tabelas conservam as colunas e rolam dentro do próprio painel; região focável para rolagem por teclado.
- Abas permanecem acessíveis por rolagem horizontal, sem expandir a página.
- Diálogos têm largura limitada ao viewport e altura máxima baseada em `dvh`; o conteúdo rola com teclado virtual ou telas baixas.
- Popovers respeitam largura e altura disponíveis.
- Foco visível, rótulos de ações, estado selecionado e suporte à preferência de movimento reduzido.
- Não depender somente de cor: resultados mantêm texto; importação tem indicação de origem.

## Fluxos

### Dashboard

Cabeçalho com período; indicadores de lucro, ROI/acerto, saldo e apostas; evolução; desempenho por dimensão. Cores do gráfico vêm dos tokens. Os gradientes de traço e preenchimento mudam de cor no zero; cada um considera sua própria extensão vertical. O corte é preservado também quando toda a série é positiva ou negativa.

### Punter e importação

O formulário em destaque conserva entrada manual, importação por imagem/texto e ações de desfazer. Upload por toque substitui a dependência de Ctrl+V no celular; desktop mantém arrastar, selecionar e colar. O alvo reage ao arraste.

Campos importados recebem fundo esmeralda, borda e rótulo **IA · conferir**. O aviso explica que os dados precisam de revisão. Ao editar um campo, o reducer existente remove sua marca de importação; desfazer preserva correções manuais. O destaque significa origem dos dados, não validação de precisão.

### Surebet

A calculadora antecede os dados de registro. Retorno, lucro, ROI e odd ficam próximos ao investimento. Cada perna tem identidade, conta, seleção, valores e ações próprias. Os campos numéricos distribuem-se por espaço disponível, com largura mínima de 125px; não impor seis colunas em tablets.

Dados opcionais da operação ficam em “Mais detalhes”. As pernas de 2 a 10 e os cálculos existentes de back/lay, comissão, cashback, boost e freebet são preservados. Percentuais têm unidade no rótulo. Back usa cor de operação, evitando sugerir lucro antes de um resultado.

### Listas e telas auxiliares

Casas & Contas conserva busca, filtros e tabelas de contas. Cabeçalhos permitem quebra e formulário de movimentação empilha campos no mobile. Todas as apostas mantém edição, liquidação, exclusão e filtros; datas compartilham espaço flexível. Freebets, custos e tipsters herdam a mesma linguagem de tabelas e estados. Login e cadastro permanecem centrados e minimalistas.

## Validação e limites

Usar Node 25 (`.nvmrc`). Executar TypeScript, testes existentes e lint. Verificar 320, 390, 768 e 1440px em ambos os temas, incluindo dados preenchidos, menu móvel, modal, persistência do tema e 10 pernas. Testes visuais com respostas de API simuladas não comprovam integração com autenticação, OCR ou servidor real.

O lint original possui 20 erros e 10 avisos, reproduzidos em uma cópia de HEAD e sem acréscimos nesta revisão. A auditoria das dependências também tem pendências preexistentes; a revisão visual não altera versões de pacotes.

### Resultado desta implementação

- Build de produção e TypeScript aprovados com Node 25.
- Oito testes existentes de importação/edição passaram.
- Chromium: 11 telas × quatro larguras (320, 390, 768, 1440px) × dois temas, sem overflow horizontal da página ou erros de execução, com respostas de API simuladas.
- Interações verificadas na versão de produção: mudança/persistência de tema; acompanhamento da preferência do sistema; menu móvel; modal e Escape; cálculo com ponto/vírgula; inclusão até dez pernas e remoção; origem e tonalidade dos campos de IA; correção manual e desfazer.
- Nenhum novo diagnóstico de lint em relação a HEAD. Integração real com OCR/backend e navegadores/dispositivos físicos não foram validados nesta revisão.
