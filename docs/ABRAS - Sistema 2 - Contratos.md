# ABRAS · Sistema 2 — Contratos

### Ciclo de vida do contrato com inteligência tributária embarcada

**Data:** 02/09/2026 · Grupo VOW × Rodrigo Bauer
**Família:** `ABRAS - Sistema 1 - Fornecedores.md` · `ABRAS - Sistema 3 - Itens.md`
**Briefs de conteúdo:** `ABRAS - Contrato de Revenda.md` e `ABRAS - Contrato de Indiretos.md` — este documento é o produto; aqueles são a regra que ele aplica.

---

## 1. O que é

Não é onde guardar o contrato. **Repositório é commodity.** É o avaliador que diz o que falta, a minuta que resolve, e o gate que impede o problema de voltar — dentro do ciclo de compra, com aprovação e assinatura.

## 2. Por que existe

"Quem não tiver contrato para tudo vai para a guerra desarmado." A rede sai de contratos só de revenda para contratos de serviço, verba, mídia e locação — de cerca de 2.000 para 2.500 ou mais. E o ERP não tem módulo decente para isso: fora o SAP, pouco usado no setor, nenhum resolve contrato de serviço, nem para orçamento nem para revisão de cláusula.

Três mudanças concretas fazem o contrato deixar de ser papel de arquivo:

**O acordo comercial virou operação tributada.** O art. 5º da LC 214/2025 traz as operações não onerosas para o campo de incidência e só abre exceção quando a vantagem consta do documento fiscal e **não depende de evento posterior**. Traduzindo para o comprador: acabou o acerto retroativo. Aceitar mercadoria com preço errado hoje e compensar com bonificação no mês que vem depende, por definição, de evento posterior.

**Serviço passou a gerar crédito.** Facilities, frete, TI, marketing e locação — mas só com contrato, nota e prestador em regime que gere crédito.

**O fornecedor grande impõe o contrato dele.** Sem cláusula de RAD, de obrigação de emissão, de tratamento da verba. Quem assina sem ler assume o risco, e é o varejo que assina.

## 3. O ganho

O ganho deste produto não é uma economia — é **exposição evitada e margem preservada na renegociação**. Duas frentes, cada uma com o seu brief.

**Revenda.** Com o mix padrão do varejo, **70,5% da verba passa a ser tributada**. Numa rede de R$ 300 mi com verba de 3%, são R$ 6,3 mi de base tributável: R$ 1,68 mi de recomposição a negociar e **R$ 1,33 mi de perda se não recompor — 22% do lucro anual**. E o argumento que ganha a mesa: a indústria credita integralmente o imposto que paga, então recompor a verba **não custa nada a ela**. Não se está pedindo dinheiro a mais, e sim que o tributo novo não saia do bolso do varejo.

**Indiretos.** A pergunta inverte: quanto de cada real pago volta como crédito. Uma base inteira de gasto que nunca devolveu nada passa a devolver — mas o quanto depende do regime do prestador e da extinção do débito dele. Duas propostas com o mesmo preço deixaram de ser a mesma proposta.

**Ganho estrutural comum às duas:** cobertura contratual. Todo CNPJ pago sem contrato é crédito sem sustentação e verba sem natureza declarada — e é o primeiro cruzamento que uma fiscalização faz.

## 4. Quem usa e quem decide

| Papel | O que recebe |
|---|---|
| **Comprador** | Minuta pronta pelo tipo e pelo regime; cotação comparada por custo líquido; fornecedor vermelho inelegível |
| Fiscal | Cláusulas da sua área marcadas; alçada em paralelo; natureza declarada de cada verba |
| Jurídico | Score de risco por contrato; cláusulas obrigatórias travadas |
| **Diretor comercial** — o abridor | A matriz de tratamento por linha do acordo e o cálculo de recomposição para levar ao JBP |
| Financeiro | Gate de pagamento; nenhum título liquidado sem contrato vinculado |

## 5. Escopo funcional

**M1 · Cobertura.** Varredura de contas a pagar dos últimos 12 meses cruzada com a carteira. Todo CNPJ pago sem contrato vira alerta, priorizado por valor. É o inventário que revela o tamanho real do buraco.

**M2 · Minuta ou avaliação.** Minutas VOW por tipo, categoria, regime e meio de pagamento. Para contrato de terceiro imposto pelo fornecedor: importação e extração de regras, score 0–100 e aditivo de adequação. **Wizard** que aponta a lacuna e conduz a correção — respeitando a curva de adoção, porque apontar o problema sem dar o caminho só transfere o trabalho.

**M3 · Cotação.** RFP com propostas comparadas pelo **custo líquido de crédito**, não pelo bruto. Fornecedor vermelho é inelegível. O vencedor sai com minuta.

**M4 · Aprovação em alçadas.** Fiscal e jurídico em paralelo, cada um vendo as cláusulas da sua área. Ressalva volta ao comprador com a cláusula apontada; duas aprovações liberam a assinatura. Alçada por valor e por tipo.

**M5 · Assinatura.** **Integração com assinador de mercado, sob a marca VOW.** O fornecedor assina pelo portal; o contrato vigente vai ao ERP vinculado ao CNPJ.

**M6 · Gate e governança.** Regra de ouro: **nenhum título é pago sem contrato vinculado e fornecedor fora do vermelho.** Trava no ERP, ligada depois de cerca de 30 dias de implantação — antes disso apenas alerta, senão o financeiro para de operar no primeiro dia. Vencimentos, renovações, reajustes e RAD monitorados, com trilha de auditoria.

## 6. Os oito tipos de contrato

| Tipo | Cláusulas próprias |
|---|---|
| Revenda direta | NCM e cClassTrib por item, devolução com estorno, ST em transição |
| Distribuidor e atacado | O regime dele define o crédito, não o da indústria. Rastreio de origem |
| Consignação | Nota só na venda ao consumidor; crédito casado com o fato gerador |
| Produtor rural e cooperativa | Crédito presumido; ato cooperativo identificado por documento |
| Acordos comerciais | Bonificação, verba, rebate, gôndola, retail media: nota e previsão contratual |
| Serviços | Frete, TI, facilities, marketing. NFS-e nacional, retenções, SLA |
| Locação e ocupação | Regime específico de imóveis; locador PF diferente de PJ |
| Marketplace e delivery | Comissão como serviço; responsabilidade da plataforma digital |

Empréstimo, antecipação de recebíveis, adquirência e seguros são inventariados na varredura, mas têm **regime específico** e ficam fora do motor de cláusulas — vão para a consultoria.

## 7. Fora de escopo

- **Regularidade e regime do fornecedor** — Sistema 1. O S2 consome; não monitora.
- **Classificação de itens** — Sistema 3.
- Execução financeira do pagamento e do recolhimento.
- Estrutura societária, logística e o desenho do JBP em si — o JBP é argumento comercial e ritual de negociação, não módulo.

## 8. Dados e integrações

**Entrada:** contas a pagar e receber de 12 meses, cadastro de fornecedores e regime vindos do S1, base de contratos existente, contratos de terceiros em PDF.
**Saída:** contrato vigente vinculado ao CNPJ e à natureza do título no ERP, status para o gate de pagamento, score por contrato, agenda de vencimentos, trilha de auditoria.

## 9. Dependências e riscos

| Risco | Mitigação |
|---|---|
| Virar "mais um GED" | O valor é o score e a minuta, não o armazenamento. Se o wizard não for forte, o produto não se diferencia |
| Assinador com validade jurídica é caro | Já resolvido: integração com assinador de mercado sob marca VOW, não desenvolvimento próprio |
| Ciclo de venda longo | Entra como expansão depois do S1, não como primeira venda |
| Gate trava a operação no dia 1 | 30 dias em modo alerta antes de ligar a trava |
| Cliente confunde S2 com S1 na venda | Materiais, preço e demo separados |

## 10. MVP da feira

Simulação guiada no totem: o visitante escolhe um cenário — por exemplo, fornecedor de serviços no Simples híbrido — e vê o score do contrato-exemplo e os gatilhos de cláusula. **Mostrar o gatilho e o tema, nunca o texto integral da cláusula**, que é entregável pago.

A **matriz de tratamento por linha do acordo** é o melhor slide que este produto tem: mostra conhecimento específico em vinte segundos e é mais persuasiva que qualquer diagrama de fluxo.

## 11. Métricas

**Produto:** contratos avaliados, score médio da carteira, % adequado após wizard, tempo médio da minuta à assinatura.
**Valor:** cobertura contratual (%), valor pago sem contrato (R$, tendendo a zero), recomposição efetiva, exposição evitada.

## 12. Modelo comercial

Assinatura por contrato ativo mais implantação. É o produto de **retenção**: quem carrega 2.500 contratos com score e assinatura dentro do sistema não troca de fornecedor.

**A porta de entrada é o acordo comercial, não o software.** A pergunta de abertura no estande — *"vocês já fecharam o acordo de 2027?"* — fala com o diretor comercial, que tem orçamento e decide rápido, enquanto o fiscal não tem. E há receita antes da feira: o acordo de 2027 é negociado entre setembro e dezembro de 2026, a janela contratual fecha em dezembro, e **essa oferta não depende de software** — é consultoria com método, vendável em outubro, que financia parte do build e produz os casos reais que o estande vai precisar.

## 13. Pendências para a VOW

1. Validar a matriz de tratamento linha a linha, sobretudo bonificação apurada por sell-out e cessão de dados.
2. Confirmar a tese de neutralidade da indústria na recomposição da verba — é o argumento comercial central.
3. Definir a estrutura de prestador de serviço que a rede precisa ter para faturar retail media: CNAE, emissão, apuração.
4. Confirmar o regime específico de imóveis e a diferença entre locador PF e PJ.
5. Escolher o assinador de mercado e o modelo de rotulagem sob a marca VOW.

---

## Glossário

| Termo | Significado |
|---|---|
| Alçada | Nível de aprovação exigido por valor ou tipo de contrato |
| cClassTrib | Código de Classificação Tributária do item na NF-e |
| Cobertura contratual | Proporção do valor pago que tem contrato vigente vinculado |
| Custo líquido de crédito | Preço da nota menos o crédito apropriável — substitui o preço na decisão |
| Evento posterior | Condição futura que afasta a exceção do art. 5º e torna a verba tributada |
| Gate de pagamento | Trava no ERP que retém título sem contrato vinculado ou com fornecedor irregular |
| GED | Gestão eletrônica de documentos — repositório simples |
| JBP | Joint Business Plan — plano conjunto anual entre indústria e varejo |
| Minuta | Modelo de contrato parametrizado por tipo e regime |
| RAD | Recolhimento pelo Adquirente |
| Recomposição | Reajuste da verba pelo valor do tributo, para preservar o líquido do varejo |
| Regime específico | Tratamento próprio na LC 214 para setores como imóveis e financeiros |
| Score de contrato | Nota 0–100 de adequação às cláusulas exigidas pela reforma |
| Wizard | Assistente passo a passo que conduz a correção |

## Fontes

- [Lei Complementar 214/2025 — Planalto](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- [A bonificação no IBS e na CBS: a exceção do art. 5º — Migalhas](https://www.migalhas.com.br/depeso/463074/a-bonificacao-no-ibs-e-na-cbs-a-excecao-do-art-5)
- [Verbas comerciais no varejo: o novo risco fiscal que exige governança imediata — ConJur](https://www.conjur.com.br/2026-mai-10/reforma-tributaria-e-verbas-comerciais-no-varejo-o-novo-risco-fiscal-que-exige-governanca-imediata/)
- [Reforma tributária: verbas comerciais geram CBS/IBS? — BMS Consultoria Tributária](https://bmsprojetos.com/reforma-tributaria-verbas-comerciais-varejo-risco-fiscal/)
