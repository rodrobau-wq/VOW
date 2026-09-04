# ABRAS · Sistema 3 — Itens

### Saneamento e classificação tributária do cadastro de produtos

**Data:** 02/09/2026 · Grupo VOW × Rodrigo Bauer
**Família:** `ABRAS - Sistema 1 - Fornecedores.md` · `ABRAS - Sistema 2 - Contratos.md`
**Numeração:** ordem de implantação. Comercialmente este é o **primeiro** a ser vendido — é o único com protótipo funcionando e o que abre a porta.

---

## 1. O que é

Importa a base de itens do cliente, cruza com a base mestre, aponta erro de classificação e calcula o ganho da correção sobre o histórico de vendas — com embasamento legal por SKU e curadoria humana da VOW sobre o resultado automático.

## 2. Por que existe

A classificação do item é o alicerce de tudo o mais. **Ela define a alíquota**, e a alíquota define o crédito, o débito e o valor em risco de cada fornecedor.

Um supermercado compra três coisas ao mesmo tempo: cesta básica a **alíquota zero**, itens com **redução de 60%** — cerca de 10,6% efetivos sobre a referência de 26,5% — e itens a **alíquota cheia**, entre 26,5% de trava e 27,91% estimados pelo Comitê Gestor. Some-se o Imposto Seletivo sobre bebidas açucaradas e alcoólicas, categorias relevantes no mix.

Desde **03/08/2026** a nota sem os campos de IBS/CBS consistentes é rejeitada na origem, e o `cClassTrib` é obrigatório. NCM errado no cadastro é imposto a mais em cada cupom, multiplicado por milhares de passagens por dia.

E há o problema humano, que é o argumento de venda de verdade: o gestor diz que já fez. A pergunta é sempre a mesma — **me traz a prova para eu ver**. Erro de cadastro não fica parado: ele se multiplica por toda a operação até o dia em que estoura, e aí se pergunta de quem foi a culpa.

## 3. O ganho

**Direto — imposto pago a mais.** Item com CST ou NCM errado paga alíquota que não deveria. A correção devolve isso para frente, mês a mês, e para trás: a recuperação retroativa de até cinco anos é o serviço clássico da VOW, e é onde o valor aparece em caixa de verdade.

**De legislação.** Item classificado errado, mesmo quando não gera imposto a mais, gera autuação. Corrigir é evitar multa, não só economizar tributo — e essa distinção é importante no discurso: nem toda correção rende dinheiro, mas toda correção evita risco.

**Estrutural, e é o maior.** Sem classificação correta **os outros dois sistemas calculam errado**. O valor em risco de um fornecedor é compras × alíquota efetiva creditável; usar alíquota cheia sobre tudo produz número falso, e número falso no painel do CFO custa o contrato. Um fornecedor de arroz e feijão movimenta muito e carrega pouco crédito; um de bebidas e limpeza carrega muito. **A exposição é proporcional ao imposto embutido, não ao volume.**

**De caixa, indireto.** Categorias de cesta básica somam de 35% a 50% do faturamento de supermercados de bairro, a alíquota zero. Isso produz saldo credor estrutural, que a LC 214 devolve em 30, 60 ou 180 dias conforme o contribuinte esteja ou não em programa de conformidade. Classificação correta é o que permite dimensionar e pleitear esse saldo.

## 4. Quem usa e quem decide

| Papel | O que recebe |
|---|---|
| Cadastro | Fila de correção priorizada por impacto, não por ordem alfabética |
| Fiscal | Embasamento legal por SKU e a evidência para a auditoria |
| Comprador | A classe tributária do item na hora de cotar |
| **Diretoria** — quem assina | O ganho identificado em R$ e o percentual da base já saneada |

## 5. Escopo funcional

**Já existe no protótipo, demonstrado em 01/09:**

- Onboarding por CNPJ, com busca automática dos dados e seleção de estados
- Upload de arquivo e processamento assíncrono — site, banco e worker de fila
- Painel de percentual do faturamento saneado contra não saneado
- Itens com CST ou NCM divergente, com o **ganho estimado por mês** sobre as últimas vendas
- **Base mestre compartilhada** — cada item classificado para um cliente fica classificado para todos; quanto mais dado entra, melhor a base
- Motor de regras com vigência, para simular impacto de mudança futura
- Push de anomalias com nota explicativa para diretor, CFO e analista
- Captura de lead de quem envia arquivo, alimentando o CRM

**A construir:**

- **Itens de peso variável** — carnes, hortifrúti, padaria. Hoje fora da curadoria, e é justamente a categoria de maior giro do supermercado
- **Fonte de classificação própria.** Hoje vem de empresa terceira. Enquanto vier de fora, o diferencial é alugado — a migração para base própria treinada com o conteúdo VOW é decisão pendente e estratégica
- Camada de **curadoria humana** da VOW sobre o resultado automático — é o que sustenta o posicionamento "IA com olhar humano"
- Saídas de projeção futura e de recuperação retroativa de cinco anos
- **Book de entrega** automático: embasamento legal, nota de comprovação da compra, e foto do produto — o material que faz o cliente reagir
- Monitoramento contínuo pós-projeto, a entrega periódica que transforma projeto em serviço

## 6. Fora de escopo

- **Regularidade e regime do fornecedor** — Sistema 1.
- **Contratos e cláusulas** — Sistema 2.
- Escrituração e transmissão de obrigações acessórias.
- Item de peso variável, benefício estadual e caso atípico: entram na curadoria humana, não no motor automático.

## 7. Dados e integrações

**Entrada:** base de itens do ERP (código, descrição, NCM, CST, cClassTrib, categoria), vendas dos últimos 6 a 12 meses, notas de entrada.
**Saída:** classificação corrigida por SKU com embasamento, ganho estimado, fila de correção priorizada, **alíquota efetiva por item** para os Sistemas 1 e 2, e o book.

## 8. Dependências e riscos

| Risco | Mitigação |
|---|---|
| **Commoditização** — classificação por IA já é oferecida por terceiros, inclusive sobre o programa do governo | Empacotar sempre com curadoria VOW e recuperação retroativa, que exigem a consultoria; e migrar para base própria |
| Fonte de terceiro | Plano de migração; validação paralela para calibrar |
| Peso variável fora da cobertura | Priorizar, porque é a categoria de maior giro |
| Cliente desconfia de análise automatizada | Validação paralela publicada como metodologia, e curadoria humana no resultado |
| **Canibalizar a consultoria** | Nunca vender velocidade. "Três horas contra quinze dias" é argumento interno de produtividade, jamais externo — destrói a âncora de preço |

## 9. A validação que precede a escala

Antes de escalar, rodar o sistema em paralelo com **um ou dois trabalhos reais feitos no método tradicional** e comparar. Se o manual encontrar muito mais, há o que calibrar; se encontrar menos, também é informação. Publicar essa metodologia é o que responde à desconfiança do mercado sem precisar de discurso.

## 10. MVP da feira

Fluxo completo com dados fictícios por porte, rotulado como exemplo: onboarding por CNPJ → painel de saneado contra não saneado → itens divergentes com o ganho da correção. Mensagem: **cadastro certo antes da virada**.

## 11. Métricas

**Produto:** % da base saneada, itens divergentes encontrados, tempo de processamento, cobertura de peso variável.
**Valor:** ganho identificado em R$/mês, valor recuperável retroativo, divergência contra a análise manual da VOW, leads gerados por envio de arquivo.

## 12. Modelo comercial

Projeto mais **success fee** sobre o valor recuperado — o modelo que a VOW já pratica há dez anos no retroativo. É o produto de **aquisição**: todo mundo precisa, já está pronto, e o envio do arquivo entrega um lead qualificado com CNPJ e contato.

A sequência do funil: este abre a porta e prova competência, o Sistema 1 cria a assinatura recorrente, o Sistema 2 retém por anos.

## 13. Pendências para a VOW

1. **Decidir a fonte de classificação** — seguir com terceiro ou construir base própria com conteúdo VOW. É a decisão mais estratégica dos três produtos.
2. Definir o tratamento de itens de peso variável.
3. Definir o formato e a periodicidade do book de entrega.
4. Planejar a validação paralela em um ou dois clientes reais.
5. Confirmar as reduções aplicáveis ao mix de supermercado além da cesta básica e dos 60%.

---

## Glossário

| Termo | Significado |
|---|---|
| Alíquota efetiva creditável | Alíquota média que o item de fato gera de crédito |
| Base mestre | Repositório compartilhado entre clientes com cada item já classificado |
| Book | Relatório de entrega com embasamento legal, nota de comprovação e foto do produto |
| cClassTrib | Código de Classificação Tributária do item na NF-e; obrigatório desde 03/08/2026 |
| Cesta Básica Nacional | Lista de alimentos com alíquota zero de IBS/CBS |
| CST / NCM | Código de Situação Tributária / Nomenclatura Comum do Mercosul |
| Imposto Seletivo | Tributo adicional sobre bens nocivos à saúde e ao meio ambiente |
| Peso variável | Item vendido por peso — carnes, hortifrúti, padaria |
| Programa de conformidade | Enquadramento que reduz o prazo de ressarcimento de saldo credor de 180 para 30 dias |
| Recuperação retroativa | Reaver tributo pago a mais nos últimos cinco anos |
| Saldo credor | Crédito acumulado por quem vende a alíquota zero e compra tributado |
| SKU | Item de cadastro e venda |
| Success fee | Remuneração percentual sobre o resultado obtido |

## Fontes

- [Lei Complementar 214/2025 — Planalto](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- [Cesta Básica Nacional e alíquota zero no varejo — Planning](https://planning.com.br/cesta-basica-aliquota-zero-varejo/)
- [Redução de 60% de IBS/CBS por anexo — Tax Radar](https://taxradar.app/blog/reforma-tributaria/reducao-60-ibs-cbs-lista-completa-anexos)
- [Comitê Gestor estima alíquota do IVA em 27,91% — FENACON](https://fenacon.org.br/reforma-tributaria/comite-gestor-estima-aliquota-do-iva-em-2791-acima-do-teto-previsto-na-reforma-tributaria/)
- [Ressarcimento de IBS e CBS: regras e prazos — Pallotta Martins](https://pallottamartins.com.br/2025/09/30/ressarcimento-ibs-cbs-regras-prazos/)
