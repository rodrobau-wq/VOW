# Grupo VOW · Suíte Reforma Tributária para o varejo supermercadista

Pacote de contexto para continuar o trabalho em outra sessão (Claude, Claude Code ou equipe).
Contém: manual de marca, narrativa comercial (3 decks), escopo de produto e histórico das decisões.

## O que está aqui

| Arquivo | O que é |
|---|---|
| `Manual de Marca Grupo VOW.dc.html` | Manual de marca em 12 capítulos, imprimível. Paleta, tipografia, grid, componentes de produto SaaS. |
| `VOW O que muda com a reforma.dc.html` | Deck de 11 slides. Argumento central: o que muda na operação do varejo e por que a VOW. |
| `VOW Gestão de Fornecedores.dc.html` | Deck de 10 slides. Jornada do Sistema 1 (monitoramento de fornecedores). |
| `VOW Gestão de Contratos.dc.html` | Deck de 7 slides. Jornada do Sistema 2 (contratos + e-procurement + matriz de verbas). |
| `deck-stage.js`, `doc-page.js`, `support.js` | Runtime dos arquivos acima. Abrir os `.dc.html` direto no navegador. |
| `escopo-produto.md` | Escopo dos 3 produtos, roadmap e riscos (fonte: reunião Grupo VOW × Rodrigo Bauer, 01/09/2026). |
| `decisoes.md` | Decisões tomadas e descartadas ao longo do trabalho, com o porquê. |

## Identidade visual (resumo)

Reconstruída a partir de grupovow.com.br. Valores marcados "a confirmar" precisam do arquivo original da marca.

- **Grafite** `#16181A` (ink) · **Cinza Storm** `#3F444A` · **Cinza Concrete** `#C9C9C7` · **Dourado VOW** `#B08A3E` (acento, a confirmar)
- Neutros: `#FFFFFF` surface · `#F6F6F5` canvas · `#EAEBEA` subtle · `#DDDEE0` border · `#7A7F86` muted · `#24272B` dark surface
- Semânticas: sucesso `#2E7D5B` · atenção `#B4551F` · risco `#A32B23` · informação `#35607F`
- Proporção 60% neutro claro / 30% grafite / 10% dourado. Dourado nunca preenche fundo grande.
- **Manrope** (300/500/700/800) para títulos e interface; **Source Serif 4** (300/400 + itálico) para manifesto e citações. Nunca serif em botão ou dado.
- Assinatura tipográfica: duas linhas em caixa-alta, primeira em peso 300, segunda em 800 ("Empresários / **são heróis**").
- Raio 0 em blocos institucionais; 4 px em componentes de produto; 999 px só em badges.
- Ícones lineares 1,5 px em grade 24 px. Sem emoji, sem degradê, sem sombra colorida.
- Números sempre em `tabular-nums`, padrão brasileiro (R$ 1.234.567,89).

## Tom de voz

Firme, preciso, claro, do lado do cliente. O herói é o empresário; a VOW é o meio.
**Nunca vender velocidade. Nunca prometer valor em reais não validado.** A promessa é "medimos na sua base".

## Estado atual

Protótipos navegáveis dos 3 produtos foram construídos e depois **descartados** a pedido do cliente (a jornada estava confusa). O trabalho recomeçou pela narrativa: primeiro o argumento (deck principal), depois a jornada de cada sistema (dois decks). As telas ainda não foram redesenhadas.

## Próximos passos sugeridos

1. Validar o argumento dos 3 decks com o time VOW.
2. Redesenhar as telas a partir dos **seis momentos da operação** (cadastrar item, cotar, emitir pedido, receber nota, pagar, fechar acordo), não a partir de módulos.
3. Confirmar hex, logo (caduceu) e tipografia licenciada com o arquivo original da marca.
4. Totem da feira: adaptar o deck principal para formato vertical 1080×1920 com captura de lead ao final (CNPJ + contato), sem simulação de valores.
5. Landing page com "testar grátis" quando as telas estiverem definidas.


## Revisão de 02/09/2026

Decks revisados a partir de `../../docs/review-decks-vow.md`. Originais em `_backup/`.

**Deck principal (9 → 11):** novos slides **Calendário** (2026 teste · set/26 janela do Simples · 2027 CBS cheia · 2028 split obrigatório · 2033 fim de ICMS e ISS) e **Saldo credor** (ressarcimento em 30, 60 ou 180 dias conforme programa de conformidade). Item 03 das três mudanças passou de "Contrato" para "O acordo comercial". A frase sem lastro sobre o dono do problema virou pergunta ao público. O fecho abre pela oferta do diagnóstico, com o "não prometemos um número" como razão e não como título.

**Fornecedores (8 → 10):** "Limites" movido para logo depois de "O problema" — honestidade adiantada desarma a objeção. Novos slides **Janela do Simples** (fecha 30/09/2026, define a classe de crédito e não é consultável por terceiros) e **Dois eixos** (matriz risco × classe de crédito: um fornecedor pode ser um problema sem ser irregular).

**Contratos (7 → 7):** novo slide **Matriz de verbas** (tratamento de cada linha do acordo sob o art. 5º da LC 214). "Tipos" promovido para antes das etapas. "Aprovação e assinatura" fundido na Jornada — o deck tinha três sequências numeradas e agora tem uma. "Assinador próprio" passou a **integração com assinador de mercado sob a marca VOW**.

Contexto completo, dados da reforma e fontes: `../../docs/dossie-vow-consolidado.html`.
