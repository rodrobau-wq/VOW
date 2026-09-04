# Identidade visual — o que manda

> **Fonte da verdade do desenho: `public/abras/*.dc.html`** — os protótipos do
> Claude Design, servidos em `/abras` e `/plataforma`. Quando o produto e eles
> divergirem, quem está errado é o produto.
>
> **Fonte da marca: `Marca/[Grupo Vow] Brandguide 2026.pdf`.**
> Antes de mexer em cor, fonte ou logotipo, abra o manual. Nada aqui é
> escolha de design: cada valor tem página citada. O que não estiver no
> manual não entra sem aprovação dos gestores da marca.

## Paleta — pág. 28

Quatro cinzas e o preto. **Só isso.**

| Nome | Hex | Cinza |
|---|---|---|
| — | `#000000` | K100 |
| PIANO | `#3d3d3d` | 90% |
| STORM | `#707070` | 70% |
| CONCRETE | `#bfbfbf` | 30% |
| SILVER | `#e8e8e8` | 10% |

O manual, com essas palavras: *"As aplicações da marca em outras cores são
desaconselhadas e não devem ser realizadas sem aprovação dos gestores da
marca."*

Sem cor de acento. O destaque se faz por contraste — preto sobre claro.

### Combinações aprovadas — pág. 29

`01` logo 30% / fundo 70% · `02` logo 90% / fundo 30% ·
`03` logo 10% / fundo 90% · `04` logo 70% / fundo 10%

A interface usa a **04** (marca STORM sobre fundo SILVER). A escala escura
existe em `tokens.css` como `.escuro` (combinação 03), mas **não está em uso**
— ver a pendência do logotipo abaixo.

## Tipografia — págs. 31 e 32

**Obviously**, do Adobe Fonts. Pesos Light a Bold.

| | Peso | Tamanho / entrelinha |
|---|---|---|
| H1 destaque | Semibold | 80 / 100 |
| H2 título | Medium | 48 / 60 |
| H3 subtítulo | Regular | 28 / 48 |

Entreletra 0. Caixa alta permitida em títulos.

⚠️ **A Obviously é licenciada e não está carregada.** Sem o kit da conta Adobe
do Grupo VOW ela não sobe, e nenhuma fonte gratuita é a Obviously. A pilha em
`tokens.css` já a traz em primeiro lugar e cai num sans neutro do sistema —
de propósito, para não substituir a marca por outra fonte e chamar de VOW.

**Para ativar:** inclua o kit no `<head>` das telas. Nada mais muda.
```html
<link rel="stylesheet" href="https://use.typekit.net/SEU-KIT.css">
```

## Logotipo — págs. 20 a 22

Duas asas formando o V, do caduceu de Mercúrio. Elmo (pensamento elevado),
bastão (poder), asas (zelo), serpentes (sabedoria).

- **Redução mínima digital: 115 px de altura.** Por isso o logotipo completo
  não entra em barra de aplicativo — ali vai o **caduceu sozinho**, que é
  elemento gráfico próprio e não o logotipo reduzido abaixo do permitido.
- **Respiro:** proporcional à letra "O" do logotipo, no tamanho da aplicação.
- Proibido: outras cores, gradiente, sombra, ou qualquer efeito que
  descaracterize a marca.

Arquivos em `public/marca/`, com o `README.md` que descreve cada variação.
O símbolo também existe como máscara SVG embutida no `tokens.css`, na classe
`.caduceu` — é o que a barra do app usa, herdando a cor do texto.

## Pendências da marca

1. ~~Logotipo vetorial ou PNG transparente~~ — **resolvido.** Chegaram em
   `public/marca/`: PNG transparente do logotipo, do logotipo com slogan e do
   símbolo, em preto, piano, storm, concrete, silver e branco, mais
   `simbolo.svg`. A combinação 03 (peça escura) está disponível: use
   `*-silver.png` sobre fundo PIANO, com `.escuro` no `<body>`.
2. **Kit do Adobe Fonts** para a Obviously. **Decidido em 04/09/2026: seguir
   com o fallback.** As telas rodam num sans neutro do sistema, e a
   tipografia oficial do manual não está aplicada. Basta uma linha no
   `<head>` no dia em que o kit existir.
3. **Cor de estado — decidido em 04/09/2026: manter e levar para aprovação.** Um CRM precisa distinguir atrasado de em dia, e o manual
   não prevê cor de sinalização. `--risco` e `--ok` estão isolados e
   assinalados em `tokens.css`, nos tons mais contidos que resolvem a função,
   **pendentes de aprovação**. A interface nunca depende só da cor: todo item
   colorido carrega o rótulo escrito.

## O que foi descartado

A versão anterior usava verde `#0E1B14` e dourado `#E0C48C`, com Instrument
Serif e IBM Plex Sans. Nenhum desses valores existe no manual — vieram do
handoff de design, que os marcava como "a confirmar". Saíram.
