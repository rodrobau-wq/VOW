# CRM e app de campo — desenho para aprovação

> Versão navegável: https://claude.ai/code/artifact/87f64295-8e66-465c-a7d3-c1c80d039f52
> **Nada implementado.** Este documento é a decisão a tomar.

## A decisão que define tudo: são dois números

O prospect simula e vê **R$ 1,3 mi** na tela. Isso é a **exposição do cliente**, não a
receita da VOW. O honorário é uma fração disso.

| Número | De onde vem | Para que serve |
|---|---|---|
| `valorEmJogo` | do diagnóstico, automático | priorizar quem atender primeiro |
| `honorario` | digitado na fase de proposta | **a previsão de vendas** |

Somar os diagnósticos e chamar de forecast infla a previsão em dezenas de vezes. A previsão
é `honorario × probabilidade`.

## Três momentos, três operações

- **Antes** — chegar com agenda cheia. Mede-se por reuniões marcadas antes do dia 1.
- **Durante** — falar com quem acabou de ver o número, ainda no estande. Mede-se por
  abordados ÷ capturados.
- **Depois** — ligar antes de esfriar. Prazo de 48 h para o primeiro contato.

## Pipeline — seis fases, cada uma com critério de saída

| # | Fase | Para avançar | Meta |
|---|---|---|---|
| 01 | Capturado | alguém da VOW falou com a pessoa | 48 h |
| 02 | Qualificado | porte acima do mínimo e acesso ao decisor | 7 d |
| 03 | Reunião marcada | reunião aconteceu e autorizou o levantamento | 14 d |
| 04 | Levantamento | número real apurado e apresentado | 30 d |
| 05 | Proposta | resposta do cliente, sim ou não | 21 d |
| 06 | Fechado / Perdido | motivo obrigatório ao perder | — |

Motivos de perda são **lista fixa**: sem orçamento 2027 · contabilidade interna assumiu ·
foi para concorrente · porte abaixo do mínimo · sem resposta · momento errado (com data de
retomada). Texto livre inviabiliza qualquer leitura depois.

## Modelo de dados

Campos novos no `lead`: `estagio`, `responsavel`, `honorario`, `probabilidade`,
`proximaAcao{texto,quando}`, `motivoPerda`.
Já existem: `origem`, `faturamento`, `diagnosticos[]`, `agendar`.

Coleção nova **`interacao`** `{leadId, ts, tipo, autor, texto}` — **append-only**, pela
mesma razão que `verificacao` já é: histórico editável não reconstrói o que foi combinado
com o cliente. Ver a regra em [store.js](../store.js).

## PWA — por que não basta uma tela

1. **O wi-fi da feira vai cair.** Captura grava no aparelho e sincroniza depois. Perder lead
   na captura é o pior resultado da operação.
2. **Aviso na hora**: "terminou agora no totem 2" no celular do consultor, com a pessoa a
   três metros.
3. **Operável de pé, com uma mão.**

A fila offline também é append-only: o celular ao sincronizar nunca sobrescreve edição feita
no servidor.

## Telas

`/app/pipeline` funil · `/app/leads` carteira · `/app/leads/:id` oportunidade ·
`/app/hoje` o que vence hoje · `/app/feira` modo feira · `/app/resultado` fechados e perdidos

## Painel — quatro números

Leads na janela (por origem) · **fora do prazo de contato** (o único que faz alguém pegar o
telefone) · previsão ponderada · fechados contra perdidos.

## Ordem de construção

| Etapa | Pronto quando |
|---|---|
| Fases e dono | um lead do site anda de fase e tem dono |
| Histórico | uma ligação registrada aparece na linha do tempo |
| Fechado e perdido | a previsão ponderada aparece separada do valor em jogo |
| PWA de campo | captura com o avião ligado e sincroniza depois |
| Modo feira | um consultor recebe o aviso de quem acabou de simular |

As três primeiras já dão um CRM utilizável para os leads que o site captura hoje, sem
depender das decisões abaixo.

## Decisões pendentes — não são minhas

1. **Como a VOW cobra** — % do recuperado, fixo, ou fixo + êxito? Define a fórmula da previsão.
2. **Porte mínimo** — abaixo de que faturamento não compensa? Sem isso a qualificação é opinião.
3. **Quem são os responsáveis** — nomes e quantidade de consultores.
4. **A data da ABRAS** — [BRIEF-CLAUDE-CODE.md](../BRIEF-CLAUDE-CODE.md) diz 12 e 13 de abril
   de **2027**; o handoff de design fala em **ABRAS 2026**. As duas não podem estar certas, e
   a data governa o modo feira e os prazos.
