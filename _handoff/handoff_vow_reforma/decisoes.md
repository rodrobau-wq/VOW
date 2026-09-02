# Decisões e aprendizados

## Mantidas

- **Marca**: base em cinzas (Concrete, Storm) + um acento dourado. Site atual é só cinza; um SaaS precisa de cor de sinalização. Dourado é proposta, não confirmado.
- **Produto SaaS assina como submarca endossada**: símbolo (caduceu) + nome do produto, "por Grupo VOW" menor. Logotipo completo não vai na barra do app.
- **Sem valores em reais nos materiais comerciais.** O cliente pediu explicitamente. Toda saída numérica vem do diagnóstico na base do cliente.
- **Argumento central**: a reforma não muda a operação física; muda de quem depende o imposto recuperado. Três documentos que ninguém olhava passam a definir margem: cadastro do item, cadastro do fornecedor, contrato.
- **Por que VOW e não sozinho**: volume, ERP entrega o campo e não a resposta, regra em construção, contrato genérico não protege, ninguém dentro da empresa é dono do problema. O que a VOW traz: base mestre, método já validado em campo, um dono, continuidade, integração no fluxo, gente onde a máquina não chega.
- **Ordem da implantação**: fornecedores primeiro (é a base), depois cobertura contratual, depois regularizar, depois operar.
- **Regra de ouro**: nenhum título é pago sem contrato vinculado e fornecedor fora do vermelho. Gate no ERP, ligado depois de ~30 dias de implantação (antes só alerta).
- **Bloqueio de fornecedor**: sugestão + aprovação por padrão, nunca automático sem alçada.
- **Tipos de contrato (8)**: revenda direta, distribuidor/atacado, consignação, produtor rural/cooperativa, acordos comerciais (bonificação, verba, rebate, gôndola, retail media), serviços, locação/ocupação, marketplace/delivery.
- **Financeiros** (empréstimo, FIDC, adquirência, seguros): inventariados na varredura de pagamentos, mas fora do motor de cláusulas. Regime específico da LC 214; vão para a consultoria.
- **FCA / plano de ação** com responsável e prazo obrigatórios.
- **Dependência crítica assumida abertamente**: consulta pública de extinção do débito IBS/CBS não existe ainda. Enquanto isso: fontes disponíveis (RFB, Simples, CND, Sintegra, CEIS), leitura do IBS/CBS na nota recebida (obrigatório desde 03/08/2026), ambiente simulado, RAD como saída segura.

## Descartadas

- **Protótipos navegáveis dos 3 produtos** (Fornecedores, Contratos, Saneamento de SKUs, APIs, Jornada, Totem, Site): apagados. Motivo: jornada confusa; começavam pela "carteira" como se o cliente já tivesse tudo organizado. Reaproveitar só as ideias, não a estrutura.
- **Simulação por porte com valores em reais** no totem: descartada. Substituir por captura de lead + diagnóstico gratuito.
- **Preços de referência** (R$/CNPJ): inventados para o protótipo; não usar.
- **Jornada por "fases de implantação"** como eixo das telas: o cliente preferiu pensar pelos momentos da operação onde a decisão acontece.

## Fontes de dados por CNPJ (levantamento 01/09/2026)

Disponíveis: Consulta CNPJ Serpro / Conecta gov.br / Dados Abertos CNPJ; agregadores (CNPJá, Infosimples, Sintegra WS); Consulta Optantes Simples; Integra Contador (exige e-CNPJ + procuração do fornecedor); API Consulta CND (Serpro); CNDT (TST); CRF FGTS (Caixa); CEIS/CNEP (Portal da Transparência); NF-e grupo UB / cClassTrib (NT 2025.002); Distribuição DF-e; NFS-e nacional.

Parciais: opção do Simples pelo regime regular de IBS/CBS (serviço para o contribuinte aberto em 01/09/2026, sem consulta de terceiros); regime IRPJ (só via agregador); Sintegra/CCC (27 portais); SITFIS (só com procuração).

Não existem: consulta de extinção do débito IBS/CBS por documento; ambiente de compartilhamento do cadastro único (Res. CGIBS 6/2026); confirmação de split payment pelo sistema bancário.

## O que muda na operação (base do argumento)

1. Crédito deixa de ser "da nota" e passa a ser "do pagamento do fornecedor" (extinção do débito; escapes: split ou RAD).
2. Regime do fornecedor vira preço: Lucro Real / Simples híbrido = crédito integral; Simples DAS = limitado; MEI = quase nada; rural = presumido.
3. Classificação do item define alíquota (cesta básica zero, redução 60%, Imposto Seletivo). cClassTrib obrigatório desde 03/08/2026.
4. Acordo comercial virou operação tributada (bonificação, verba, gôndola, retail media: nota + contrato).
5. Serviço passou a gerar crédito (facilities, frete, TI, aluguel com redução 70%).
6. Imposto sai no pagamento, não na apuração (split payment; capital de giro).
7. Sete anos com dois sistemas (2026 teste 1%; 2027 CBS; 2029–2032 transição IBS; 2033 fim ICMS/ISS; fim gradual de ST e benefícios estaduais).

Seis momentos onde a decisão acontece: cadastrar o item, cotar, emitir o pedido, receber a nota, pagar, fechar acordo com a indústria.
