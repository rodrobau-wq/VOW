# Escopo de Produto — Suíte Reforma Tributária VOW para o Varejo Supermercadista

Versão 1.0 — 01/09/2026 (reunião Grupo VOW × Rodrigo Bauer). Alvo: Smart Market ABRAS 2027, 12–13/abr/2027 (a confirmar).

## 1. Visão e tese

A reforma transfere ao varejista responsabilidades que eram do governo (crédito de IBS/CBS depende do fornecedor ter recolhido) e transforma práticas comerciais (bonificações tributadas, contratos para tudo, split payment). A VOW resolve isso hoje manualmente; a tese é embarcar essa inteligência numa suíte plugável nos ERPs via API (podendo ser white label), automatizando o transacional (30–50% do pacote de consultoria) e deixando o interpretativo (societário, logística/CD) como serviço humano.

Princípios:
- Sistema cuida do repetitivo; consultoria do interpretativo. Um alimenta o outro.
- A inteligência embarcada é da VOW, segmentável por ramo.
- Resolver bem 20–30% da reforma já é produto vendável.
- Nunca vender velocidade. Vender segurança, compliance e ganho econômico.
- Todo envio de dados por prospect vira lead qualificado.

## 2. Produto 1 — Saneamento de Cadastro de Produtos (SKUs)

Dor: cClassTrib/NCM/CST errados se multiplicam pela operação. Falta double check com evidência.
Faz: importa base de itens, cruza com base mestre, aponta erros, calcula ganho pela venda histórica.
Já existe no protótipo interno da VOW: onboarding por CNPJ, upload assíncrono (worker em fila), painel de % saneado e ganho/mês, base mestre compartilhada, captura de lead, regras com vigência e push de anomalias.
A construir: peso variável, fonte de classificação própria (hoje terceiro), curadoria humana, projeção futura + retroativa (5 anos), book de entrega, monitoramento contínuo.
MVP feira: fluxo completo com dados fictícios por porte.

## 3. Produto 2 — Monitoramento de Fornecedores

Dor: crédito só com extinção do débito (ou RAD); fornecedor irregular = crédito travado; bloqueio = ruptura (estoques de 21–28 dias); ninguém consulta 500–2.000 CNPJs à mão.
Núcleo: sincronização do cadastro via API; enriquecimento (regime Lucro Real × Simples DAS × Simples híbrido, localização, situação fiscal); verificação diária + no pedido + na nota; semáforo e bloqueio configurável; alerta cruzado com projeção de compra e fornecedor alternativo; notificação ao fornecedor ("EDI tributário"); cobertura de contratos de fornecimento continuado; opção RAD com impacto de caixa.
Dependência crítica: API pública do governo ainda não existe. Ambiente simulado; destaque IBS/CBS na nota (0,9% + 0,1% em 2026) permite testar leitura.
MVP feira: painel simulado, semáforo, evento de bloqueio, alerta de ruptura.

## 4. Produto 3 — Contratos

Dor: de ~2.000 contratos de revenda para 2.500+ com serviços; grandes fornecedores impõem o contrato deles; bonificações exigem nota e previsão contratual; cláusulas novas (RAD, emissão, split); ERPs sem módulo decente.
Faz: ciclo de vida completo com inteligência embarcada. Não é repositório (commodity): é avaliador e orientador.
Núcleo: modelos VOW por tipo e regime; importação de contrato de terceiro com extração de regras; score 0–100 + wizard de adequação; cláusulas críticas monitoradas (RAD, emissão, bonificação vinculada a nota, SLA); assinador eletrônico próprio; processo demanda → RFP → cotação com comparação tributária → contratação → governança; simulador de desencaixe de caixa (RAD); gestão de prazos como commodity.
Ligação com Produto 2: contrato referencia regime/regularidade. Dois níveis de cliente (só monitoramento × pacote com contratos).
MVP feira: simulação guiada; mostrar gatilho/tema, não o texto da cláusula (entregável pago).

## 5. Fora de escopo (consultoria)

Estrutura societária/holdings; logística/CD e fim de benefícios regionais; estratégia de compra (estocar × segurar); comitês (evolução pós-feira); DRE de-para com dados reais.

## 6. Totem da feira

Interativo, sem coleta de base real, sem prometer resultado individual. Captura de lead ao final. Respostas preparadas: "para quem já fizeram?", "na minha região?", "qual o ganho?" → cases da consultoria, sem argumento de velocidade.
(Decisão posterior do cliente: **sem simulação de valores em reais**.)

## 7. Roadmap

- Fundação (set–out/2026): escopo por produto, fonte de classificação, processo de contratos, mock da API do governo.
- Protótipos (out–dez/2026): MVPs 1 e 2, modelos de contrato, validação paralela em 1–2 clientes.
- Piloto (jan–fev/2027): 1–3 clientes, pricing, formato ERP (white label × API).
- Feira (mar–abr/2027): totem, material, treinamento comercial, funil pós-feira.

## 8. Riscos

API pública inexistente → simulador + leitura de nota. Regulamentação pendente (split 2S/2027–2028) → motor de regras com vigência. Fonte de classificação de terceiro → migrar para base própria. Canibalização da consultoria → discurso de valor, automação como entrega contínua. Integração ERP → começar por parceiros que aceitam add-ons. Confiança em análise automatizada → curadoria humana + validação paralela publicada.

## Glossário

cClassTrib (classificação tributária IBS/CBS na NF-e) · CBS/IBS · CST/NCM · DAS · EDI tributário (aviso eletrônico de pendência fiscal ao fornecedor) · RAD (recolhimento pelo adquirente) · Regime híbrido (Simples com IBS/CBS por fora da DAS) · RFP · Ruptura · Score de risco (0–100) · Split payment · White label · Wizard.
