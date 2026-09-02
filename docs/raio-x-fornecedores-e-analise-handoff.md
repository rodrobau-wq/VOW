# Raio-X do Fornecedor + Leitura do pacote Claude Design

**Data:** 02/09/2026 · Grupo VOW × Rodrigo Bauer
**Entrada:** `VOW visual identity search.zip` → `handoff_vow_reforma/` (manual de marca, 3 decks, escopo, decisões)
**Saída:** (1) leitura crítica da ideia, (2) o modelo analítico de avaliação de CNPJ — o "Raio-X", (3) data pack da reforma com fontes.

---

# PARTE I — LEITURA DO PACOTE

## 1. O que o pacote acertou

O trabalho está bem mais maduro do que o material anterior. Três acertos estruturais:

**O eixo narrativo é o certo.** "A operação física não muda; muda de quem depende o imposto que você recupera" é a frase que organiza tudo o resto. Ela desarma o terrorismo de reforma que o empresário já ouviu de dez fornecedores e reposiciona a conversa em algo verificável.

**Os seis momentos da operação** (cadastrar o item, cotar, emitir o pedido, receber a nota, pagar, fechar acordo) são melhores do que módulos e melhores do que fases de implantação. O varejista reconhece o próprio dia nesses seis pontos, e cada um deles vira um lugar onde o produto aparece. Manter.

**"Não prometemos um número. Medimos na sua base."** Essa é a decisão comercial mais forte do pacote — e ela colide com o PRD que entreguei ontem, cheio de exemplos em reais. A colisão se resolve por camada, não por escolha: os números vão para o **material interno e para o diagnóstico**, nunca para o totem, o deck ou o site. O que dimensiona a oportunidade para vocês decidirem investir não é o que se diz ao prospect. Vale corrigir isso no meu PRD: a Parte I dele é munição de vocês, não roteiro de estande.

**Um acerto que talvez tenha passado despercebido:** o slide "Dá para fazer sozinho? Sim." é a melhor peça do deck. Conceder o ponto antes de derrubá-lo compra credibilidade que nenhuma lista de features compra. Não suavizar.

## 2. Onde a ideia está frágil

**A afirmação "Compras não olha regime. Fiscal não vê o pedido. Financeiro paga o que chegou" precisa de dado.** É a frase mais forte do deck e a única totalmente asseverada sem lastro. Ou vira uma constatação da própria VOW ("em X diagnósticos que fizemos, nenhum tinha dono para isso"), ou vira pergunta ao público no totem — que é melhor ainda, porque o prospect responde sozinho.

**Falta o dado que dimensiona o interlocutor.** O deck fala com "o varejista" em abstrato. O setor movimentou R$ 1,14 trilhão em 2025, tem 439.728 lojas e representa 9,02% do PIB — e **15% do faturamento setorial está em empresas do Simples**. Esse último número é o argumento do regime do fornecedor em uma linha: uma fatia enorme da cadeia está exatamente no regime que limita crédito.

**A janela do Simples está fora do material, e ela é o gatilho de urgência mais concreto que existe hoje.** O prazo termina em **30/09/2026** — daqui a quatro semanas. E há um detalhe que o `decisoes.md` já registrou e que ninguém explorou: **a opção não é consultável por terceiros.** O varejista não tem como saber qual regime cada fornecedor escolheu. Isso não é um obstáculo do produto; é a razão de ele existir. Ver a seção 6.

**O acúmulo de crédito não aparece em lugar nenhum — e é o maior número do setor.** Categorias de cesta básica somam de 35% a 50% do faturamento de supermercados de bairro, com alíquota zero. Venda a zero com insumos e serviços tributados (energia, aluguel, frete, facilities, TI — todos agora creditáveis) produz **saldo credor estrutural e recorrente**. E a LC 214 devolve esse saldo em **30, 60 ou 180 dias conforme o contribuinte esteja ou não em programa de conformidade**. Isso muda a natureza do produto: ele deixa de ser só defesa e vira **a evidência que sustenta o pedido de ressarcimento e o enquadramento em conformidade**. Um supermercado que acumula R$ 2 milhões por mês e sai de 180 para 30 dias de espera libera cinco meses de caixa. Esse é o argumento que faz um CFO assinar — e ele está ausente do deck.

**"Assinador próprio" é uma promessa cara.** Validade jurídica, carimbo de tempo e cadeia ICP-Brasil não são um sprint. Ou vira integração com assinador de mercado sob marca VOW, ou sai do MVP.

**Risco e crédito estão misturados no semáforo.** Um MEI perfeitamente regular é verde em risco e péssimo em crédito. O deck do Sistema 1 já intui isso ("pedido liberado; classe de crédito informada"), mas o modelo precisa assumir **dois eixos independentes**. É o ponto de partida da Parte II.

---

# PARTE II — O RAIO-X DO CNPJ

## 3. O princípio: dois eixos, não um semáforo

Avaliar fornecedor na reforma responde a duas perguntas que não se confundem:

| Eixo | Pergunta | Consequência se ruim |
|---|---|---|
| **Risco** | O débito dele vai ser extinto? Ele existe, opera e paga? | Crédito travado, responsabilidade solidária, nota inidônea |
| **Classe de crédito** | Quanto do imposto volta para mim quando compro dele? | Custo líquido maior — sem nenhuma irregularidade envolvida |

Cruzando os dois, sai a matriz que orienta a decisão de compra:

| | **Crédito integral** | **Crédito limitado** | **Crédito quase nulo** |
|---|---|---|---|
| **Risco baixo** | Fornecedor preferencial | Aceitável com desconto compensatório | Só se não houver alternativa |
| **Risco médio** | Monitorar de perto; exigir regularização | Renegociar ou substituir | Substituir |
| **Risco alto** | Bloqueio sugerido, mesmo com bom crédito | Bloqueio | Bloqueio |

A leitura importante: **um fornecedor pode ser um problema sem ser irregular**. Essa é a novidade da reforma e é o que o comprador ainda não sabe.

## 4. Os sete blocos do Raio-X

### Bloco 1 · Identidade e existência
*O CNPJ é real, está ativo e é quem diz ser?*

| O que se olha | Por que importa | Fonte | Hoje |
|---|---|---|---|
| Situação cadastral (ativa/suspensa/inapta/baixada) | Inapta ou suspensa inviabiliza crédito e sugere nota inidônea | Dados Abertos CNPJ, Serpro, agregadores | ✅ |
| Data de abertura, capital social, porte | Empresa recém-aberta com volume alto é sinal clássico | Idem | ✅ |
| CNAE principal e secundários × o que ele te vende | Divergência entre CNAE e mercadoria é indício de operação irregular | Idem | ✅ |
| Quadro societário (QSA) | Base do cruzamento de grupo econômico — ver Bloco 7 | Idem | ✅ |
| UF de origem da operação | IBS é destino; origem muda o tratamento e a fiscalização | Idem + nota | ✅ |

### Bloco 2 · Regime tributário — o bloco que a reforma criou
*Quanto do imposto volta para mim?*

| Situação do fornecedor | Classe de crédito | Consultável hoje? |
|---|---|---|
| Lucro Real / Presumido | Integral | ✅ parcial (agregadores) |
| Simples optante pelo **regime regular de IBS/CBS** (híbrido) | Integral | ❌ **não consultável por terceiros** |
| Simples por dentro da DAS | Limitado | ✅ (Consulta Optantes Simples) |
| MEI | Praticamente nulo | ✅ |
| Produtor rural / cooperativa | Presumido | ✅ parcial |

**Este é o ponto cego do mercado e a oportunidade do produto.** A opção pelo regime regular abriu em 01/09/2026, fecha em 30/09/2026, produz efeito a partir de janeiro de 2027 e é revisável em março e setembro de cada ano — mas **só o próprio contribuinte a consulta**. Nenhum concorrente vai resolver isso com API, porque API não existe. Resolve-se com **coleta declarada**: o portal do fornecedor (que o deck do Sistema 1 já prevê para o aviso de pendência) pede a declaração do regime e o comprovante; a plataforma guarda, data e revalida nas janelas de março e setembro. Depois de janeiro de 2027, a nota confirma sozinha — quem optou destaca IBS/CBS por fora.

**Consequência prática:** a base de regimes declarados vira ativo proprietário da VOW e cresce com cada cliente. É a mesma lógica da base mestre de itens, aplicada a CNPJs.

### Bloco 3 · Regularidade fiscal
*O débito dele tende a ser extinto?*

CND/CPEN federal (RFB/PGFN) ✅ · CNDT trabalhista (TST) ✅ · CRF FGTS (Caixa) ✅ · CEIS/CNEP, inidôneos e sancionados (Portal da Transparência) ✅ · Sintegra/CCC estadual, 27 portais ⚠️ parcial · SITFIS e Integra Contador ⚠️ só com procuração do fornecedor · **consulta de extinção do débito de IBS/CBS por documento ❌ não existe** (prevista, não publicada).

A ausência da última é conhecida e está assumida no material. O que fecha o buraco: o Bloco 4.

### Bloco 4 · Comportamento documental — a camada que ninguém mais tem
*O que as notas dele já dizem hoje?*

Desde 03/08/2026 a nota sem os campos de IBS/CBS consistentes é rejeitada na origem. Isso significa que **o dado já circula**, e ele é a melhor proxy disponível enquanto a consulta oficial não sai:

- Destaque de IBS/CBS presente, ausente ou inconsistente
- `cClassTrib` coerente com o NCM e com o produto real
- **Divergência entre regime declarado e destaque na nota** — o sinal mais forte do conjunto: quem declara híbrido e não destaca por fora está errado em algum dos dois lugares
- Padrão de emissão: frequência, cancelamentos, devoluções, saltos de numeração
- Coerência entre valor da nota e histórico de compra

Esta é a camada que sustenta o produto antes de 2027 e continua útil depois, como validação cruzada da consulta oficial.

### Bloco 5 · Materialidade e exposição
*Quanto esse fornecedor pesa no meu crédito e na minha gôndola?*

- Volume comprado em 12 meses; % da categoria; posição no ranking de compras
- **Itens que ele fornece × classe tributária desses itens** (cesta zero / redução 60% ≈ 10,6% efetivos / alíquota cheia ~26,5–27,9%). Um fornecedor de arroz e feijão movimenta muito e carrega pouco crédito; um fornecedor de bebidas e limpeza carrega muito. **A exposição não é proporcional ao volume — é proporcional ao imposto embutido.** Só o P1 (saneamento) entrega esse dado; sem ele, o Raio-X estima errado.
- Cobertura de estoque dos itens dele → dias até a ruptura se houver bloqueio
- Existe alternativa homologada para os mesmos itens?
- Prazo médio de pagamento → carrego entre o desembolso e o crédito

### Bloco 6 · Saúde e continuidade
*Ele vai existir daqui a seis meses?*

Protestos, recuperação judicial e falência; tempo de relacionamento; reincidência de pendências resolvidas e reabertas; mudança recente de sócio, endereço ou CNAE; score de crédito de agregadores. Reincidência pesa mais que uma pendência isolada — fornecedor que já regularizou três vezes vai irregularizar de novo.

### Bloco 7 · Sinais compostos — onde está o valor real
*O que só aparece no cruzamento.*

Nenhum destes se vê olhando um CNPJ por vez. É aqui que o Raio-X deixa de ser consulta e vira análise:

1. **Concentração escondida por sócio.** N fornecedores diferentes, mesmo QSA. O comprador acha que tem três fontes para a categoria e tem uma. Um bloqueio derruba as três.
2. **Fornecedor crítico em risco.** Volume alto + item sem alternativa homologada + amarelo ou vermelho. É a lista de cinco nomes que o diretor precisa ver, não a lista de oitocentos.
3. **Divergência regime × nota.** Declarou híbrido, não destaca por fora — ou o contrário.
4. **Mapa da janela do Simples.** Quem optou, quem não optou, quem ainda não respondeu. Gera três ações comerciais distintas: renegociar preço, pressionar a optar, ou substituir.
5. **Exposição de crédito concentrada.** Ranking de fornecedores por *imposto embutido*, não por faturamento. Costuma ser uma lista bem diferente da curva ABC de compras — e essa surpresa é uma boa cena de demonstração.
6. **Suspeita de operação inidônea.** CNAE incompatível + abertura recente + volume desproporcional ao capital + endereço compartilhado.
7. **Custo líquido enganoso.** Fornecedor com o melhor preço bruto e crédito limitado, comparado ao segundo colocado com crédito integral. O ponto de virada em % de desconto é calculável por item.
8. **Deriva silenciosa.** Fornecedor que estava verde e escorregou de faixa sem que ninguém percebesse — o alerta é a mudança de estado, não o estado.

## 5. O que sai do Raio-X (entregáveis)

| Artefato | Para quem | Conteúdo |
|---|---|---|
| **Ficha do fornecedor** (1 página) | Comprador | Identidade, regime e classe de crédito, semáforo com motivo, itens fornecidos, alternativas, histórico |
| **Mapa da carteira** | Diretoria / CFO | Matriz risco × classe de crédito, com o tamanho da bolha pela exposição de imposto |
| **Ranking de exposição** | Fiscal | Top 20 por imposto embutido em risco — não por volume |
| **Fila de ação** | Fiscal + comprador | FCA com responsável e prazo, como o material já define |
| **Mapa da janela do Simples** | Comercial / compras | Quem optou, quem não, quem falta responder |

## 6. O Raio-X como porta comercial

O deck termina em "diagnóstico gratuito na sua base". O Raio-X é exatamente o formato desse diagnóstico, e ele tem três qualidades comerciais raras: entrega valor antes de qualquer contrato, não exige nenhuma promessa em reais (o número sai da base do próprio cliente, cumprindo a regra do pacote) e o insumo é trivial de obter — um extrato de fornecedores e 12 meses de notas de entrada, que qualquer ERP exporta.

**Roteiro sugerido do estande:** o prospect informa o CNPJ da rede → agenda o Raio-X → recebe em dias o mapa da própria carteira com os cinco fornecedores críticos nomeados. Nenhum concorrente vai conseguir responder a isso com um folheto.

---

# PARTE III — DATA PACK DA REFORMA

Números verificados para usar nos materiais. Todos com fonte; os marcados ⚠️ precisam de confirmação da VOW antes de virar material público.

## Mecânica do crédito
- **Art. 47, LC 214/2025:** o adquirente apropria o crédito **quando extinto o débito** do fornecedor.
- **Art. 27:** cinco modalidades de extinção — compensação, pagamento pelo contribuinte, split payment, recolhimento pelo adquirente (RAD), pagamento por responsável.
- **Art. 48:** o requisito de extinção **fica dispensado** enquanto split payment e RAD não estiverem implementados. É a válvula que segura a bomba hoje.
- Efeito de fundo: a apuração fiscal do varejo vira análise de risco de contraparte.

## Calendário
- **2026:** fase de teste — CBS 0,9% + IBS 0,1%. Desde **03/08/2026**, nota sem os campos de IBS/CBS consistentes é rejeitada na origem.
- **01/09 a 30/09/2026:** janela de opção do Simples pelo regime regular de IBS/CBS, no Portal de Serviços da Receita Federal. Efeitos a partir de **janeiro/2027**; revisável em **março e setembro** de cada ano; quem não optar permanece na guia única. **Não consultável por terceiros.**
- **2027:** CBS em vigor cheia (substitui PIS/Cofins), IBS em transição. **Split payment opcional.**
- **2028:** obrigatoriedade do split payment — a Receita anunciou o adiamento em 30/08/2026; a infraestrutura fica pronta no início de 2027 e mais de 200 instituições financeiras aderem gradualmente.
- **2029–2032:** transição do IBS. **2033:** fim de ICMS e ISS.

## Alíquotas
- Alíquota de referência estimada: **26,5%** (trava legal) — o Comitê Gestor estimou **27,91%**.
- **Cesta Básica Nacional: alíquota zero** (arroz, feijão, carnes, leite, ovos, farinhas, óleos, hortifrúti in natura, açúcar, sal, café, pão francês, massas).
- **Redução de 60%** (Anexos IV a XI: alimentos para consumo humano fora da cesta, higiene e limpeza, dispositivos médicos, insumos agropecuários, entre outros) → **≈ 10,6% efetivos** sobre a referência de 26,5%.
- ⚠️ Reduções de 30% (profissões regulamentadas) e o regime específico de locação de imóveis: divergência entre fontes — confirmar com a VOW antes de usar.
- **Imposto Seletivo** incide sobre bebidas açucaradas, alcoólicas e cigarros — categorias relevantes no mix de supermercado. ⚠️ Alíquotas ainda em definição.

## Ressarcimento de saldo credor — o número que faltava
- Prazos de análise da LC 214: **30 dias** para contribuintes em programa de conformidade reconhecido; **60 dias** para quem atende aos critérios do art. 40 sem conformidade; **180 dias** para os demais. Sem resposta no prazo, o pagamento sai em até 15 dias após o vencimento; a partir do segundo mês do pedido há atualização pela Selic acumulada mais 1% no mês do pagamento.
- Categorias de cesta básica representam **35% a 50% do faturamento** de supermercados de bairro. Venda a zero com insumos e serviços tributados produz saldo credor estrutural.
- ⚠️ **Hipótese a validar com a VOW:** se a diligência documentada sobre fornecedores contar como critério de programa de conformidade, o produto passa a ser o caminho para sair de 180 para 30 dias de espera — o maior ganho de caixa da tese inteira.

## Mercado (Ranking ABRAS 2026, ano-base 2025)
- Varejo alimentar: **R$ 1,14 trilhão**, alta nominal de 7,32% e real de 3,68%.
- **439.728 lojas**, 9 milhões de empregos diretos e indiretos, **9,02% do PIB**.
- Autosserviço R$ 563,6 bi (49%) · atacarejo R$ 327,7 bi (29%) · **empresas do Simples R$ 167,1 bi (15%)** · mercearias R$ 79,4 bi (7%) · marketplaces R$ 7,3 bi (1%).
- Empresas do ranking: R$ 708,3 bi (+9,33%). Líderes: Carrefour R$ 123,59 bi e Assaí R$ 84,73 bi.

## Responsabilidade
- A LC 214 atribui **responsabilidade solidária** ao adquirente em determinadas hipóteses de não recolhimento pelo fornecedor. O efeito prático: verificar regularidade deixa de ser boa prática e vira dever de diligência documentável — o log com carimbo de tempo é a defesa.

---

# PARTE IV — O QUE MUDAR NO MATERIAL

| # | Ação | Onde |
|---|---|---|
| 1 | Trocar "2026 teste 1%" pelos números exatos (CBS 0,9% + IBS 0,1%) e corrigir o calendário do split payment para **obrigatório em 2028, opcional em 2027** | Deck principal, slide do calendário |
| 2 | Incluir um slide de saldo credor e ressarcimento (30/60/180 dias) — é o maior argumento de caixa e está faltando | Deck principal |
| 3 | Incluir a janela do Simples (30/09/2026) e o fato de **não ser consultável por terceiros** como razão de existir do Sistema 1 | Deck Fornecedores |
| 4 | Substituir "1.500 CNPJs" por dado do setor (R$ 1,14 tri, 439.728 lojas, 15% do faturamento no Simples) para dimensionar o interlocutor | Deck principal |
| 5 | Separar **risco** de **classe de crédito** em dois eixos explícitos, com a matriz da seção 3 | Deck Fornecedores |
| 6 | Ancorar "não tem dono para isso" em constatação da VOW ou virar pergunta ao público | Deck principal |
| 7 | Rebaixar "assinador próprio" para integração sob marca VOW, ou tirar do MVP | Deck Contratos |
| 8 | Manter os R$ do meu PRD apenas no material interno e no diagnóstico — nunca no deck, totem ou site | Todos |

## Pendências para a VOW

1. Confirmar as reduções de 30% e o regime de locação de imóveis (fontes divergem).
2. Validar a hipótese de que diligência sobre fornecedores conta para programa de conformidade — se confirmada, é o principal argumento de venda.
3. Validar a aritmética de custo líquido (Simples DAS × crédito integral) já levantada no PRD do P2.
4. Definir os pesos dos sete blocos no score — é conteúdo VOW, não decisão técnica.
5. Decidir se o Raio-X gratuito entra como oferta de estande e qual o limite de esforço por diagnóstico.

---

## Glossário

| Termo | Significado |
|---|---|
| Base mestre | Repositório compartilhado entre clientes com cada CNPJ e cada item já classificado |
| cClassTrib | Código de Classificação Tributária do item na NF-e; obrigatório desde 03/08/2026 |
| CEIS / CNEP | Cadastros de empresas inidôneas, suspensas e punidas (Portal da Transparência) |
| Cesta Básica Nacional | Lista de alimentos com alíquota zero de IBS/CBS |
| Classe de crédito | Quanto do imposto pago na compra retorna como crédito, conforme o regime do fornecedor |
| CND / CNDT / CRF | Certidões de débitos federais, trabalhistas e de FGTS |
| Extinção do débito | Quitação do IBS/CBS pelo fornecedor — condição do crédito do comprador (art. 47) |
| FCA | Fato, Causa, Ação — formato do plano de ação com responsável e prazo |
| Imposto Seletivo | Tributo adicional sobre bens nocivos à saúde e ao meio ambiente |
| Programa de conformidade | Enquadramento que reduz o prazo de ressarcimento de saldo credor de 180 para 30 dias |
| QSA | Quadro de Sócios e Administradores |
| RAD | Recolhimento pelo Adquirente: o comprador recolhe em nome do fornecedor e garante o crédito |
| Regime regular de IBS/CBS | Opção do Simples de recolher IBS/CBS fora da guia única, gerando crédito integral ("híbrido") |
| Ressarcimento | Devolução em dinheiro do saldo credor acumulado |
| Saldo credor | Crédito acumulado por quem vende com alíquota zero ou reduzida e compra tributado |
| Split payment | Separação e recolhimento do tributo na liquidação financeira da nota |

## Fontes

- [Lei Complementar 214/2025 — Planalto](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- [Crédito de IBS e CBS: a não cumulatividade que depende do fornecedor — Migalhas](https://www.migalhas.com.br/depeso/461774/credito-de-ibs-e-cbs-a-nao-cumulatividade-que-depende-do-fornecedor)
- [Direito ao crédito de IBS e CBS no contexto da reforma tributária — ConJur](https://conjur.com.br/2026-mai-18/direito-ao-credito-de-ibs-e-cbs-no-contexto-da-reforma-tributaria-2/)
- [Empresas do Simples já podem optar pelo recolhimento de IBS e CBS fora do regime unificado — Agência Gov](https://agenciagov.ebc.com.br/noticias/202609/empresas-do-simples-nacional-ja-podem-optar-pelo-recolhimento-de-ibs-e-cbs-fora-do-regime-unificado)
- [Receita Federal adia obrigatoriedade do split payment para 2028 — Mix Vale](https://www.mixvale.com.br/2026/08/30/receita-federal-adia-obrigatoriedade-do-split-payment-da-reforma-tributaria-para-2028/)
- [Ressarcimento de IBS e CBS: regras e prazos — Pallotta Martins Advogados](https://pallottamartins.com.br/2025/09/30/ressarcimento-ibs-cbs-regras-prazos/)
- [Cesta Básica Nacional e alíquota zero: o que muda para o varejo — Planning](https://planning.com.br/cesta-basica-aliquota-zero-varejo/)
- [Redução de 60% IBS/CBS: lista completa por anexo — Tax Radar](https://taxradar.app/blog/reforma-tributaria/reducao-60-ibs-cbs-lista-completa-anexos)
- [Comitê Gestor estima alíquota do IVA em 27,91% — FENACON](https://fenacon.org.br/reforma-tributaria/comite-gestor-estima-aliquota-do-iva-em-2791-acima-do-teto-previsto-na-reforma-tributaria/)
- [Varejo alimentar faturou R$ 1,14 trilhão em 2025 — Ranking ABRAS 2026](https://centraldovarejo.com.br/varejo-alimentar-brasileiro-faturou-r-114-trilhao-em-2025-aponta-ranking-abras-2026/)
- [Empresas serão solidariamente responsáveis pelo pagamento do IBS e da CBS — EY](https://www.ey.com/pt_br/newsroom/2025/05/reforma-tributaria-empresas-solidariamente-responsaveis-pagamento-ibs-cbs)
