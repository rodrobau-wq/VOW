# Prompt — Raio-X de Verbas (hoje × depois)

Copie tudo abaixo da linha e cole no Claude. Ajuste os dois campos marcados `>>` antes de enviar.

---

## Contexto

Você vai construir o **Raio-X de Verbas**, um produto do Grupo VOW — consultoria tributária que atende redes de supermercado. O produto compara, linha a linha, como cada verba do acordo comercial entre varejo e indústria é tratada **hoje** e como passa a ser tratada **depois** da reforma tributária, e mostra o que precisa ser renegociado.

Público: diretor comercial e CFO de rede supermercadista. Ele conhece o acordo comercial de cor e não conhece a regra tributária nova. O produto tem que falar a língua dele.

`>> Formato: [ artifact HTML autocontido / componente React para o app da VOW ]`
`>> Uso: [ ferramenta interna de consultoria / simulador público para captação ]`

## O que o produto faz

Três cenários lado a lado, sempre — nunca dois:

1. **Hoje** — tratamento atual de cada linha de verba, com o resultado líquido que o varejo fica.
2. **Depois, sem recompor** — a verba continua no mesmo valor nominal e o tributo sai de dentro dela.
3. **Depois, com recomposição** — a verba sobe pelo valor do tributo e o varejo fica inteiro.

O terceiro cenário é o ponto do produto. Sem ele isto vira uma calculadora de desgraça; com ele vira uma ferramenta de negociação, porque mostra que existe uma saída e qual é o pedido exato a fazer à indústria.

## A regra tributária — use exatamente isto, não pesquise de novo

Base: **LC 214/2025** (arts. 5º, 27, 47 e 48) e **Decreto 12.955/26**.

O art. 5º traz as operações não onerosas para o campo de incidência e só abre exceção (§ 1º, I) quando a vantagem **consta do documento fiscal e não depende de evento posterior**. O Decreto 12.955/26 define bonificação como "fornecimento a maior de bem ou serviço objeto da atividade do contribuinte em substituição a desconto no valor da operação".

Três naturezas possíveis, e a natureza é que decide:

- **Remuneração por utilidade econômica** → o varejo entrega algo (espaço, mídia, veiculação, logística) → é serviço → **tributa**, e o varejo emite documento fiscal.
- **Desconto comercial** → reduz a base, se constar do documento e não depender de evento posterior → **não tributa**.
- **Indenizatória** → recompõe perda, não remunera → **não tributa**, desde que documentada.

Matriz por linha do acordo:

| Linha | Natureza | Depois | Observação |
|---|---|---|---|
| Marketing e propaganda cooperada (encarte, mídia, ativação) | Utilidade econômica | Tributa | Exige CNAE e estrutura de emissão |
| Retail media, impulsionamento, cessão de dados | Utilidade econômica | Tributa | Linha que mais cresce e a que menos gente sabe faturar |
| Ponta de gôndola e espaço de exposição | Utilidade econômica | Tributa | |
| Inauguração e enxoval de loja | Utilidade econômica, se há contrapartida | Tributa | Separar ativação de desconto de abertura |
| Verba logística (entrega em CD, paletização) | Utilidade econômica | Tributa | O varejo presta a distribuição |
| Crescimento e performance (meta de volume) | Depende da forma | Depende | Na nota reduz base; apurada depois, tributa |
| Sell-in (verba na compra, na nota) | Desconto incondicional | Não tributa | Forma mais eficiente — preservar |
| **Sell-out (apurado pela venda ao consumidor)** | Não onerosa, sem a exceção | **Tributa** | **Depende de evento posterior por construção** |
| Bonificação em mercadoria na mesma nota | Exceção do art. 5º | Não tributa | Única bonificação que segue limpa |
| Bonificação apurada depois | Não onerosa, sem exceção | Tributa | Acabou o acerto retroativo |
| Avaria e quebra | Indenizatória | Não tributa | Sem documento, vira receita |

**Insight que precisa aparecer no produto:** o mercado migra de sell-in para sell-out porque sell-out mede o que de fato vendeu — e sell-out é exatamente a estrutura que a reforma tributa. Modernização comercial e eficiência tributária apontam para lados opostos.

**Sobre o "hoje":** o tratamento atual das verbas é juridicamente disputado — parte é tratada como redução de custo, parte como receita, e há litígio antigo em PIS/Cofins. **Não afirme um tratamento atual único.** Faça o "hoje" configurável por linha (tributado / não tributado / parcial), com um padrão razoável e um aviso visível de que a posição atual de cada rede deve ser confirmada com o time fiscal.

## A matemática — implemente exatamente assim

Sendo `V` o valor da linha, `t` a alíquota de IBS+CBS e `x` a fração tributável da linha (1, 0 ou parcial):

```
base_tributavel   = V * x
recomposicao      = base_tributavel * t
perda_sem_recompor = base_tributavel * t / (1 + t)
```

Por quê: IBS/CBS é calculado **por fora**. Se a verba negociada sobe para `V + V*t`, o varejo mantém `V` e a indústria credita `V*t` — **custo líquido dela não muda**. Se o pagamento total continuar `V`, a base vira `V/(1+t)` e o varejo perde `V*t/(1+t)`.

Com `t = 26,5%`, a perda é **20,95% de cada real tributável**. Confira: esse número precisa bater na tela.

Compare a perda anual com o lucro (`faturamento × margem líquida`) e mostre como percentual — é o número que faz o CFO reagir.

## Entradas

Faturamento bruto anual · verba total como % do faturamento · alíquota de IBS+CBS (padrão 26,5%, que é a trava; o Comitê Gestor estimou 27,91%) · margem líquida da rede · e o mix das onze linhas acima em % da verba total, com a fração tributável ajustável por linha.

Normalize o mix se a soma não fechar 100% e avise visivelmente, sem travar a interface.

## Saídas

Quatro números em destaque: verba total no ano, parcela que passa a ser tributada, recomposição a negociar, e perda se não recompor — este último com o percentual do lucro anual ao lado.

Uma tabela ou barras por linha mostrando hoje × depois sem recompor × depois com recompor, em reais.

Um bloco de texto explicando por que a recomposição não custa nada à indústria: ela credita o imposto que paga. Esse é o argumento que o cliente leva para a mesa.

Um resumo de ações por linha: preservar, migrar para desconto na nota, recompor, ou documentar.

## Marca

Grafite `#16181A` · Storm `#3F444A` · Concrete `#C9C9C7` · Dourado `#B08A3E` (acento) · surface `#FFFFFF` · canvas `#F6F6F5` · subtle `#EAEBEA` · border `#DDDEE0` · muted `#7A7F86` · dark surface `#24272B`. Semânticas: sucesso `#2E7D5B`, atenção `#B4551F`, risco `#A32B23`, informação `#35607F`.

Proporção 60% neutro claro, 30% grafite, 10% dourado — o dourado nunca preenche fundo grande. **Manrope** (300/500/700/800) em títulos e interface, **Source Serif 4** (300/400) em texto corrido e citação; nunca serif em botão ou dado. Raio 0 em blocos institucionais, 4px em componentes de produto, 999px só em badge. Ícone linear de 1,5px em grade de 24px. Sem emoji, sem degradê, sem sombra colorida. Números sempre em `tabular-nums` e padrão brasileiro: `R$ 1.234.567,89`.

Assinatura tipográfica: duas linhas em caixa-alta, a primeira em peso 300 e a segunda em 800.

Claro e escuro, os dois desenhados — não inverta automaticamente.

## Restrições — leia antes de escrever a primeira linha

1. **Nenhum número inventado.** Todo valor na tela sai de entrada do usuário ou de cálculo sobre ela. Nada de benchmark de mercado, "empresas como a sua economizam X" ou percentual típico do setor. Se precisar de um valor inicial, marque como exemplo editável.
2. **Não prometa resultado.** O texto é "estimativa sobre premissas que você declarou", nunca "você vai economizar". A promessa da VOW é medir na base do cliente, não estimar de fora.
3. **Não venda velocidade.** Nada de "em segundos" ou "o que levava 15 dias". Desvaloriza a consultoria.
4. **Não use banco de dados da plataforma para captar lead.** Um artifact que declara `db` vira interno da organização e o prospect não consegue abrir a página. Se houver captação, ela é um POST para o backend da VOW.
5. **Cor não decide sozinha.** Vermelho de tributado e verde de não tributado são um par ruim para daltonismo (ΔE 7,6 em deuteranopia). Todo item colorido carrega o rótulo escrito — "Tributada" / "Não tributada" — ou use vermelho contra um neutro em vez de vermelho contra verde.
6. **Marque as zonas cinzentas na própria interface.** Inauguração sem contrapartida de exposição, o limite entre verba de crescimento como desconto e como bonificação, e a estrutura societária para faturar retail media são pontos a confirmar com o time fiscal da VOW. O produto ganha credibilidade dizendo o que ainda não sabe.

## Antes de construir

Se algo acima estiver ambíguo para o seu caso, pergunte. Se estiver claro, construa direto — sem preâmbulo, sem plano intermediário. Ao final, confira a aritmética rodando os números do exemplo e me diga se `perda ÷ base tributável` deu 20,95% com alíquota de 26,5%.

---

## Glossário

| Termo | Significado |
|---|---|
| CBS / IBS | Novos tributos da reforma: federal (substitui PIS/Cofins) e estadual-municipal (substitui ICMS/ISS) |
| Evento posterior | Condição futura (meta, sell-out, volume) que afasta a exceção do art. 5º e torna a verba tributada |
| Por fora | Tributo calculado sobre o valor e somado a ele, não embutido |
| Recomposição | Reajuste da verba pelo valor do tributo, para preservar o resultado líquido do varejo |
| Retail media | Venda de espaço publicitário do varejo (digital, loja, dados) à indústria |
| Sell-in / sell-out | Venda da indústria ao varejo / venda do varejo ao consumidor |
| Utilidade econômica | Entrega de vantagem mediante remuneração — critério que caracteriza operação tributável |
| Verba | Valor pago pela indústria ao varejo por contrapartida comercial |
