# ABRAS · Sistema 1 — Fornecedores

### Vigilância tributária contínua da base de fornecedores

**Data:** 02/09/2026 · Grupo VOW × Rodrigo Bauer
**Família:** `ABRAS - Sistema 2 - Contratos.md` · `ABRAS - Sistema 3 - Itens.md`
**Numeração:** ordem de implantação, não de prioridade comercial. Fornecedor validado é a base sobre a qual os outros dois rodam.

---

## 1. O que é

Uma vigia diária de todos os CNPJs do ERP que devolve, dentro do próprio fluxo de compra, duas respostas que o comprador hoje não tem: **este fornecedor está regular?** e **quanto do imposto que eu pagar a ele volta como crédito?**

## 2. Por que existe

Três dispositivos da LC 214/2025 explicam o produto inteiro.

O **art. 27** lista as cinco formas de extinguir o débito do fornecedor: compensação, pagamento, split payment, recolhimento pelo adquirente e pagamento por responsável. O **art. 47** condiciona o crédito do comprador à extinção desse débito — o crédito deixa de nascer com a nota idônea e passa a nascer com o comportamento de um terceiro. O **art. 48** dispensa o requisito enquanto split payment e RAD não estiverem implementados, e é essa válvula que segura a bomba hoje.

O efeito de fundo: **a apuração fiscal do varejo vira análise de risco de contraparte.**

A janela comercial vem do calendário. O split payment foi adiado para 2028 e fica opcional em 2027, com adesão gradual de mais de 200 instituições financeiras. Ou seja: 2027 é o ano de se preparar com risco baixo e 2028 é quando se descobre quem preparou. Vender em abril de 2027 é vender no ponto em que a dor já é entendida e ainda não dói.

Há ainda uma camada de dever: a LC 214 atribui responsabilidade solidária ao adquirente em determinadas hipóteses de não recolhimento. Verificar a regularidade deixa de ser boa prática e vira diligência documentável — o log com carimbo de tempo é a defesa.

## 3. O ganho

Seis, em ordem de valor. Todos calculados sobre a base do cliente, nunca prometidos de fora.

| Ganho | Como se mede | Ordem de grandeza |
|---|---|---|
| **Crédito preservado** | compras × alíquota efetiva creditável × probabilidade de não extinção | Rede de R$ 300 mi: crédito de R$ 27 mi/ano. Perder 5% = R$ 1,35 mi — **15% a 45% do lucro anual** |
| **Caixa** | crédito mensal × dias até a extinção × custo de capital | R$ 2,25 mi/mês imobilizados por mês de atraso |
| **Custo líquido por fornecedor** | preço da nota − crédito apropriável | Ver o alerta abaixo |
| **Ruptura evitada** | dias de cobertura × giro × margem | Bloqueio sem alternativa = margem cheia perdida |
| **Conformidade** | CNPJs × frequência × tempo por consulta | 1.000 fornecedores por semana ≈ 50 h — mais de um analista, num trabalho que expira em 7 dias |
| **Defesa documentada** | log imutável de verificações | Diligência comprovada frente à responsabilidade solidária |

> **Cuidado com o argumento "4% contra 27,9%".** Direcionalmente certo, numericamente exagerado — o preço do optante pela guia única já embute a carga dele a uma alíquota menor. Sobre o mesmo líquido ao fornecedor (R$ 94): o de crédito integral emite R$ 120,23 e devolve R$ 26,23 → custo líquido **R$ 94,00**; o da guia única cobra R$ 100 e devolve R$ 4 → custo líquido **R$ 96,00**. Vantagem de R$ 2: **2,1% de desconto já empata**. Todo mundo vai repetir "4% × 27,9%" no estande; a VOW mostra o custo líquido real por fornecedor e por item.

## 4. Quem usa e quem decide

| Papel | O que faz hoje | O que recebe |
|---|---|---|
| Comprador | Emite pedido sem saber a situação fiscal | Semáforo no pedido, bloqueio com motivo, alternativa homologada |
| Analista fiscal | Consulta manual, amostral, desatualizada | Varredura da base inteira, fila de exceções, log de diligência |
| Gerente de suprimentos | Descobre a ruptura quando acontece | Alerta antecipado cruzando risco com cobertura de estoque |
| **CFO** — quem assina | Não tem visibilidade do crédito em risco | Valor em risco em R$, carrego e decisão RAD × aguardar |
| Cadastro | Base desatualizada | Enriquecimento automático e fila de correção |

**Jornada crítica, a que o totem demonstra:** o comprador lança um pedido → o sistema verifica em segundos → retorna vermelho com o motivo → mostra o crédito em risco daquele pedido → oferece três caminhos: bloquear com o impacto de ruptura calculado, liberar sob RAD com o desembolso calculado, ou liberar com exceção registrada e alçada.

## 5. Escopo funcional

**M1 · Base.** Sincronização do cadastro do ERP via API. Enriquecimento por CNPJ: razão social, situação cadastral, porte, CNAE, regime, filiais, UF de origem. Deduplicação por raiz. **Base mestre compartilhada** — cada CNPJ consultado uma vez serve a todos os clientes, e a cobertura vira ativo da VOW.

**M2 · Verificação em três camadas**, porque a fonte oficial ainda não existe:
1. Fontes públicas disponíveis hoje — situação cadastral, CND, CNDT, CRF do FGTS, CEIS e CNEP.
2. **Evidência das próprias notas.** Desde 03/08/2026 a nota sem os campos de IBS/CBS consistentes é rejeitada na origem. Ausência de destaque, inconsistência ou padrão anômalo de emissão são sinais legítimos e já disponíveis. **É esta camada que faz o produto funcionar antes da API do governo.**
3. Consulta oficial de extinção do débito, ligada quando o governo publicar. Arquitetura pronta, contrato de dados definido, mock funcional para demonstração.

Frequência: varredura diária da base ativa; verificação sob demanda no pedido e no recebimento da nota; revalidação a cada emissão em fornecimento continuado — entregas parceladas contra saldo de pedido não podem ser verificadas uma vez só.

**M3 · Dois eixos, não um semáforo.** Risco pergunta se o débito será extinto; classe de crédito pergunta quanto volta. São independentes, e **um fornecedor pode ser um problema sem ser irregular** — um MEI perfeitamente regular é verde em risco e péssimo em crédito. Score 0–100 decomposto e auditável, porque o comprador precisa justificar o bloqueio para o fornecedor. Dimensões: regularidade, consistência documental, reincidência, regime, materialidade e criticidade de abastecimento. Pesos calibrados pela VOW — o cliente recebe a régua pronta, não uma configuração em branco.

**M4 · Valor em risco e decisão de caixa.** Crédito em risco em R$ por fornecedor e por carteira, carrego por dias de atraso, comparação RAD × aguardar com o custo de capital como parâmetro, e comparador de custo líquido entre fornecedores concorrentes com o ponto de virada em % de desconto.

**M5 · Alertas, bloqueio e continuidade.** Regras por evento; bloqueio com motivo, alçada e trilha — nunca automático sem aprovação. Cruzamento com a projeção de compra do ERP: fornecedor em risco atendendo item cuja cobertura acaba em X dias gera alerta com impacto de ruptura e alternativa. **Notificação ao próprio fornecedor** — o "EDI tributário" — com a pendência, o motivo e o prazo, o que resolve na origem e gera demanda espontânea de regularização para a consultoria.

**M6 · Log de diligência e relatório mensal** de crédito preservado. É o documento que renova o contrato.

## 6. Fora de escopo

- **Contratos** — Sistema 2. O S1 não gera, avalia nem armazena contrato; a ligação é de dados, o S2 consome o cadastro e o regime que o S1 mantém.
- **Classificação de itens** — Sistema 3. O S1 consome a alíquota efetiva, não a produz.
- Recolhimento efetivo, emissão de guias e execução do RAD: o produto calcula, recomenda e registra; a execução é do ERP e do banco do cliente.
- Análise societária, logística e estratégia de compra: consultoria.

## 7. Dados e integrações

**Entrada:** ERP (fornecedores, pedidos, notas de entrada, cobertura por SKU, curva de compras), classificação vinda do S3, fontes públicas, consulta oficial quando existir.
**Saída:** status e score por fornecedor via API, webhook de mudança de faixa, bloqueio no pedido, painéis, relatório mensal, notificação ao fornecedor.
**Não funcionais:** resposta da verificação no pedido em até 3 segundos — o comprador não espera; varredura diária completa; retenção do log por 5 anos e 1 dia; operação degradada quando a fonte externa cai, usando o último status conhecido com carimbo de validade visível na tela — nunca silenciar.

## 8. O ponto cego que vira oportunidade

A opção do Simples pelo regime regular abriu em 01/09/2026, fecha em **30/09/2026**, produz efeito em janeiro de 2027 e é revisável em março e setembro de cada ano — mas **só o próprio contribuinte a consulta**. Nenhum concorrente resolve isso com API, porque API não existe.

Resolve-se com **coleta declarada**: o portal do fornecedor, que o M5 já prevê para o aviso de pendência, pede a declaração do regime e o comprovante; a plataforma guarda, data e revalida nas janelas. A partir de 2027 a nota confirma sozinha, porque quem optou destaca por fora. Essa base de regimes declarados vira ativo proprietário da VOW e cresce com cada cliente.

## 9. Dependências e riscos

| Risco | Mitigação |
|---|---|
| API oficial de extinção não sai a tempo | Camadas 1 e 2 sustentam o produto sozinhas; a 3 é plug-in |
| Falso positivo bloqueia fornecedor bom | Score decomposto, alçada de exceção, canal de contestação, faixa amarela como amortecedor |
| Adesão desigual ao split payment em 2027 | O score já trata regime e modalidade de extinção como dimensões separadas |
| "4% × 27,9%" derrubado por um controller na feira | Comparador de custo líquido — vira diferencial em vez de vulnerabilidade |

## 10. MVP da feira

Demonstração de 90 segundos, dados fictícios com rótulo visível: painel de carteira com o crédito em risco no topo → comprador lança pedido → verificação em tempo real → vermelho com motivo → tela de decisão com bloquear, RAD ou exceção → notificação disparada ao fornecedor.

**Fora do MVP:** integração real com ERP, consulta oficial e comparador completo de custo líquido, que entra como tela estática.

## 11. Métricas

**Produto:** fornecedores monitorados, % da base verificada nas últimas 24h, tempo de resposta no pedido, exceções tratadas, falsos positivos reportados.
**Valor — as que renovam contrato:** crédito preservado em R$, rupturas evitadas, horas de analista liberadas, dias de carrego reduzidos.

## 12. Modelo comercial

Assinatura recorrente por carteira de CNPJs monitorados. É o produto que sustenta o negócio: o Sistema 3 abre a porta, este cria a recorrência, o Sistema 2 retém.

O **Raio-X gratuito** da base de fornecedores é a porta de entrada — entrega valor antes do contrato, mede na base do cliente sem prometer número, e o insumo é trivial: um extrato de fornecedores e doze meses de notas de entrada, que qualquer ERP exporta.

## 13. Pendências para a VOW

1. Definir os pesos das seis dimensões do score — é conteúdo VOW, não decisão técnica.
2. Definir a política padrão de bloqueio recomendada por porte de cliente.
3. Confirmar as hipóteses de responsabilidade solidária aplicáveis ao varejo.
4. Validar a aritmética de custo líquido antes de virar material comercial.
5. Decidir o modelo de cobrança: por CNPJ monitorado, por faixa de carteira, ou % do crédito preservado.

---

## Glossário

| Termo | Significado |
|---|---|
| Alíquota efetiva creditável | Alíquota média que a compra de fato gera de crédito, considerando cesta zero e reduções |
| Base mestre | Repositório compartilhado entre clientes com cada CNPJ já classificado |
| Carrego | Custo de manter capital imobilizado entre o desembolso e a recuperação do crédito |
| CEIS / CNEP | Cadastros de empresas inidôneas e punidas |
| Classe de crédito | Quanto do imposto pago volta como crédito, conforme o regime do fornecedor |
| CND / CNDT / CRF | Certidões de débitos federais, trabalhistas e de FGTS |
| EDI tributário | Aviso eletrônico automático de pendência fiscal ao fornecedor |
| Extinção do débito | Quitação do IBS/CBS pelo fornecedor — condição do crédito do comprador (art. 47) |
| Materialidade | Peso do fornecedor na carteira de compras; pondera o risco |
| RAD | Recolhimento pelo Adquirente |
| Regime regular de IBS/CBS | Opção do Simples de recolher por fora da guia única, gerando crédito integral |
| Ruptura | Falta do produto na gôndola |
| Split payment | Separação e recolhimento do tributo na liquidação financeira da nota |

## Fontes

- [Lei Complementar 214/2025 — Planalto](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- [Crédito de IBS e CBS: a não cumulatividade que depende do fornecedor — Migalhas](https://www.migalhas.com.br/depeso/461774/credito-de-ibs-e-cbs-a-nao-cumulatividade-que-depende-do-fornecedor)
- [Receita adia obrigatoriedade do split payment para 2028 — Mix Vale](https://www.mixvale.com.br/2026/08/30/receita-federal-adia-obrigatoriedade-do-split-payment-da-reforma-tributaria-para-2028/)
- [Opção do Simples pelo regime regular de IBS/CBS — Agência Gov](https://agenciagov.ebc.com.br/noticias/202609/empresas-do-simples-nacional-ja-podem-optar-pelo-recolhimento-de-ibs-e-cbs-fora-do-regime-unificado)
- [Responsabilidade solidária pelo pagamento do IBS e da CBS — EY](https://www.ey.com/pt_br/newsroom/2025/05/reforma-tributaria-empresas-solidariamente-responsaveis-pagamento-ibs-cbs)
