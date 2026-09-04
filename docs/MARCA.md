# Identidade visual — o que manda

> **Fonte única: `Marca/[Grupo Vow] Brandguide 2026.pdf`.**
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

Arquivos em `public/marca/`, copiados de `Marca/`.

## Pendências da marca

1. **Logotipo vetorial ou PNG transparente.** Os arquivos são JPG com fundo
   branco. Sobre fundo escuro não há mesclagem que resolva sem transparência,
   e aplicar `invert` deixaria a marca ilegível — o que a pág. 29 proíbe. Por
   isso todas as telas usam fundo claro. Com um SVG na versão SILVER, a
   combinação 03 fica disponível.
2. **Kit do Adobe Fonts** para a Obviously.
3. **Cor de estado.** Um CRM precisa distinguir atrasado de em dia, e o manual
   não prevê cor de sinalização. `--risco` e `--ok` estão isolados e
   assinalados em `tokens.css`, nos tons mais contidos que resolvem a função,
   **pendentes de aprovação**. A interface nunca depende só da cor: todo item
   colorido carrega o rótulo escrito.

## O que foi descartado

A versão anterior usava verde `#0E1B14` e dourado `#E0C48C`, com Instrument
Serif e IBM Plex Sans. Nenhum desses valores existe no manual — vieram do
handoff de design, que os marcava como "a confirmar". Saíram.
