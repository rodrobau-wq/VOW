// Dados de demonstração do CRM. Datas relativas a hoje para que as filas
// (fora do prazo, vencidas, hoje) façam sentido em qualquer dia.
const D = 864e5
const ha = (dias, h = 10) => { const d = new Date(Date.now() - dias * D); d.setHours(h, 0, 0, 0); return d.toISOString() }
const dia = (delta) => new Date(Date.now() + delta * D).toISOString().slice(0, 10)

const L = (id, o) => ({ id, origem: 'abras', email_enviado: true, agendar: false, telefone: null, cnpj: null, responsavel: null, honorario: null, proximaAcao: null, ...o })

export const LEADS = [
  L('l01', { uf: 'RS', nome: 'Marina Duarte', empresa: 'Rede Continental', email: 'marina@continental.com.br', telefone: '(51) 99811-2200', faturamento: 1.2e9, criadoEm: ha(3, 14), estagio: 'capturado', estagioDesde: ha(3, 14), agendar: true,
    diagnosticos: [{ tipo: 'revenda', destaque: 5316760 }, { tipo: 'indiretos', destaque: 2100500 }] }),
  L('l02', { uf: 'SP', nome: 'Paulo Ferraz', empresa: 'Supermercados Nobre', email: 'paulo.ferraz@nobre.com', faturamento: 300e6, criadoEm: ha(2, 16), estagio: 'capturado', estagioDesde: ha(2, 16), origem: 'site',
    diagnosticos: [{ tipo: 'revenda', destaque: 1329190 }] }),
  L('l03', { uf: 'MG', nome: 'Cláudia Ramos', empresa: 'Mercado Bom Preço', email: 'claudia@bompreco.com.br', faturamento: 80e6, criadoEm: ha(0, 9), estagio: 'capturado', estagioDesde: ha(0, 9), origem: 'qr',
    diagnosticos: [{ tipo: 'indiretos', destaque: 168000 }] }),
  L('l04', { uf: 'MA', nome: 'Rogério Antunes', empresa: 'Grupo Mateus Norte', email: 'rogerio@mateusnorte.com.br', telefone: '(98) 98122-0011', faturamento: 4.5e9, criadoEm: ha(6), estagio: 'abordado', estagioDesde: ha(4), primeiroContatoEm: ha(4), responsavel: 'Bruno Lima', agendar: true,
    proximaAcao: { texto: 'Ligar para o CFO', quando: dia(-1) },
    diagnosticos: [{ tipo: 'revenda', destaque: 19937850 }, { tipo: 'indiretos', destaque: 7875000 }] }),
  L('l05', { uf: 'SP', nome: 'Fernanda Sales', empresa: 'Atacarejo Central', email: 'fsales@central.com', faturamento: 900e6, criadoEm: ha(8), estagio: 'abordado', estagioDesde: ha(7), primeiroContatoEm: ha(7), responsavel: 'Ana Teixeira',
    diagnosticos: [{ tipo: 'indiretos', destaque: 1890000 }] }),
  L('l06', { uf: 'PR', nome: 'Henrique Prado', empresa: 'Prado & Filhos', email: 'henrique@pradofilhos.com.br', faturamento: 520e6, criadoEm: ha(12), estagio: 'qualificado', estagioDesde: ha(5), primeiroContatoEm: ha(11), responsavel: 'Bruno Lima', probabilidade: 0.25,
    proximaAcao: { texto: 'Enviar agenda da reunião', quando: dia(0) },
    diagnosticos: [{ tipo: 'revenda', destaque: 2303930 }, { tipo: 'indiretos', destaque: 1092000 }] }),
  L('l07', { uf: 'RN', nome: 'Sônia Vieira', empresa: 'Supermercados Vieira', email: 'sonia@vieira.com.br', faturamento: 210e6, criadoEm: ha(15), estagio: 'qualificado', estagioDesde: ha(9), primeiroContatoEm: ha(14), responsavel: 'Ana Teixeira', origem: 'qr',
    diagnosticos: [{ tipo: 'revenda', destaque: 930430 }] }),
  L('l08', { uf: 'SC', nome: 'Eduardo Kraemer', empresa: 'Rede Kraemer', email: 'ekraemer@kraemer.com.br', telefone: '(47) 99201-3344', faturamento: 2.1e9, criadoEm: ha(21), estagio: 'reuniao', estagioDesde: ha(6), primeiroContatoEm: ha(20), responsavel: 'Bruno Lima', probabilidade: 0.4,
    proximaAcao: { texto: 'Reunião com diretoria comercial', quando: dia(2) },
    diagnosticos: [{ tipo: 'revenda', destaque: 9304330 }, { tipo: 'indiretos', destaque: 4410000 }] }),
  L('l09', { uf: 'GO', nome: 'Letícia Moura', empresa: 'Hiper Moura', email: 'leticia@hipermoura.com', faturamento: 650e6, criadoEm: ha(30), estagio: 'levantamento', estagioDesde: ha(12), primeiroContatoEm: ha(29), responsavel: 'Ana Teixeira', probabilidade: 0.55,
    proximaAcao: { texto: 'Receber extrato de fornecedores', quando: dia(3) },
    diagnosticos: [{ tipo: 'revenda', destaque: 2879910 }, { tipo: 'indiretos', destaque: 1365000 }] }),
  L('l10', { uf: 'BA', nome: 'Carlos Menezes', empresa: 'Menezes Atacado', email: 'carlos@menezes.com.br', faturamento: 1.8e9, criadoEm: ha(45), estagio: 'levantamento', estagioDesde: ha(38), primeiroContatoEm: ha(44), responsavel: 'Bruno Lima', probabilidade: 0.5,
    diagnosticos: [{ tipo: 'indiretos', destaque: 3780000 }] }),
  L('l11', { uf: 'MG', nome: 'Beatriz Lopes', empresa: 'Rede Economia', email: 'beatriz@redeeconomia.com.br', faturamento: 3.2e9, criadoEm: ha(60), estagio: 'proposta', estagioDesde: ha(9), primeiroContatoEm: ha(59), responsavel: 'Ana Teixeira', probabilidade: 0.7, honorario: 480000,
    proximaAcao: { texto: 'Retorno do jurídico sobre a proposta', quando: dia(1) },
    diagnosticos: [{ tipo: 'revenda', destaque: 14178030 }, { tipo: 'indiretos', destaque: 6720000 }] }),
  L('l12', { uf: 'SP', nome: 'Otávio Reis', empresa: 'Supermercados Reis', email: 'otavio@reis.com.br', faturamento: 400e6, criadoEm: ha(75), estagio: 'fechado', estagioDesde: ha(4), fechadoEm: ha(4), primeiroContatoEm: ha(74), responsavel: 'Bruno Lima', honorario: 150000,
    diagnosticos: [{ tipo: 'revenda', destaque: 1772250 }] }),
  L('l13', { uf: 'CE', nome: 'Juliana Castro', empresa: 'Castro Alimentos', email: 'juliana@castroalimentos.com', faturamento: 150e6, criadoEm: ha(50), estagio: 'perdido', estagioAnterior: 'proposta', estagioDesde: ha(10), fechadoEm: ha(10), primeiroContatoEm: ha(49), responsavel: 'Ana Teixeira', honorario: 60000, motivoPerda: 'sem_orcamento', motivoDetalhe: 'Retomar em janeiro', origem: 'site',
    diagnosticos: [{ tipo: 'revenda', destaque: 664590 }] }),
  L('l14', { uf: 'PA', nome: 'Marcos Tavares', empresa: 'Tavares Mercados', email: 'marcos@tavares.com.br', faturamento: 60e6, criadoEm: ha(40), estagio: 'perdido', estagioAnterior: 'abordado', estagioDesde: ha(20), fechadoEm: ha(20), primeiroContatoEm: ha(39), responsavel: 'Bruno Lima', motivoPerda: 'porte',
    diagnosticos: [{ tipo: 'indiretos', destaque: 126000 }] }),
  L('l15', { uf: 'PE', nome: 'Renata Albuquerque', empresa: 'Rede Albuquerque', email: 'renata@albuquerque.com.br', faturamento: 700e6, criadoEm: ha(90), estagio: 'perdido', estagioAnterior: 'levantamento', estagioDesde: ha(35), fechadoEm: ha(35), primeiroContatoEm: ha(89), responsavel: 'Ana Teixeira', motivoPerda: 'concorrente', motivoDetalhe: 'Consultoria Big Four',
    diagnosticos: [{ tipo: 'revenda', destaque: 3101440 }, { tipo: 'indiretos', destaque: 1470000 }] }),
]

const I = (leadId, dias, tipo, texto, autor, extra = {}) => ({ id: `${leadId}-${dias}-${tipo}`, leadId, criadoEm: ha(dias, 11), tipo, texto, autor, ...extra })

// QR da landing. O servidor serve /q/:codigo, conta a leitura e redireciona
// para `url` com ?origem=qr. `leituras` é uma lista de instantes (append-only).
const hs = (dias, n) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.now() - dias * D); d.setHours(8 + Math.floor((i * 9) / n), (i * 37) % 60, 0, 0); return d.toISOString() })
export const QR = {
  codigo: 'abras',
  url: 'https://vow-abras.onrender.com',
  criadoEm: ha(6, 9),
  leituras: [...hs(6, 4), ...hs(5, 9), ...hs(4, 14), ...hs(3, 11), ...hs(2, 6), ...hs(1, 17), ...hs(0, 5)],
}

// Equipe. `u00` é o dono da plataforma (papel `deus`: fora do domínio, não
// pode ser desativado nem rebaixado). `u01` é quem está logado por padrão na
// demonstração. Papéis: `deus` (superadmin), `vow` (admin) e `vendedor`.
// Senha nunca fica aqui: o servidor guarda só o hash e o convite vai por
// link mágico (mesmo mecanismo de /api/app/link-magico).
export const USUARIOS = [
  { id: 'u00', nome: 'Rodrigo Robau', email: 'rodrobau@gmail.com', papel: 'deus', status: 'ativo', ultimoAcesso: ha(0, 7), convidadoEm: ha(180), fixo: true },
  { id: 'u01', nome: 'Bruno Lima', email: 'bruno@grupovow.com.br', papel: 'vow', status: 'ativo', ultimoAcesso: ha(0, 8), convidadoEm: ha(120) },
  { id: 'u02', nome: 'Ana Teixeira', email: 'ana@grupovow.com.br', papel: 'vendedor', status: 'ativo', ultimoAcesso: ha(0, 9), convidadoEm: ha(110) },
  { id: 'u03', nome: 'Rafael Nunes', email: 'rafael@grupovow.com.br', papel: 'vendedor', status: 'convidado', ultimoAcesso: null, convidadoEm: ha(1, 15) },
  { id: 'u04', nome: 'Patrícia Gomes', email: 'patricia@grupovow.com.br', papel: 'vendedor', status: 'inativo', ultimoAcesso: ha(48), convidadoEm: ha(200) },
]

export const INTERACOES = [
  I('l04', 6, 'sistema', 'Lead capturado no diagnóstico (ABRAS)', null, { para: 'capturado' }),
  I('l04', 4, 'ligacao', 'Falei com o Rogério. Porte confere, decide com o CFO. Pediu retorno esta semana.', 'Bruno Lima'),
  I('l04', 4, 'sistema', 'Fase: Capturado → Abordado', 'Bruno Lima', { de: 'capturado', para: 'abordado' }),
  I('l08', 21, 'sistema', 'Lead capturado no diagnóstico (ABRAS)', null, { para: 'capturado' }),
  I('l08', 20, 'whatsapp', 'Respondeu no mesmo dia. Já tinha visto o número da verba na feira.', 'Bruno Lima'),
  I('l08', 20, 'sistema', 'Fase: Capturado → Abordado', 'Bruno Lima', { de: 'capturado', para: 'abordado' }),
  I('l08', 16, 'reuniao', 'Call de 30 min com o comprador-chefe. Quer a diretoria comercial na próxima.', 'Bruno Lima'),
  I('l08', 16, 'sistema', 'Fase: Abordado → Qualificado', 'Bruno Lima', { de: 'abordado', para: 'qualificado' }),
  I('l08', 6, 'email', 'Confirmada reunião com diretoria para daqui a dois dias, presencial em Blumenau.', 'Bruno Lima'),
  I('l08', 6, 'sistema', 'Fase: Qualificado → Reunião marcada', 'Bruno Lima', { de: 'qualificado', para: 'reuniao' }),
  I('l11', 60, 'sistema', 'Lead capturado no diagnóstico (ABRAS)', null, { para: 'capturado' }),
  I('l11', 59, 'sistema', 'Fase: Capturado → Abordado', 'Ana Teixeira', { de: 'capturado', para: 'abordado' }),
  I('l11', 52, 'sistema', 'Fase: Abordado → Qualificado', 'Ana Teixeira', { de: 'abordado', para: 'qualificado' }),
  I('l11', 44, 'sistema', 'Fase: Qualificado → Reunião marcada', 'Ana Teixeira', { de: 'qualificado', para: 'reuniao' }),
  I('l11', 38, 'reuniao', 'Diretoria autorizou o levantamento de 12 meses. Extrato chega em duas semanas.', 'Ana Teixeira'),
  I('l11', 38, 'sistema', 'Fase: Reunião marcada → Levantamento', 'Ana Teixeira', { de: 'reuniao', para: 'levantamento' }),
  I('l11', 9, 'nota', 'Proposta enviada: R$ 480 mil, escopo Sistemas 1 e 2. Jurídico deles revisa até sexta.', 'Ana Teixeira'),
  I('l11', 9, 'sistema', 'Fase: Levantamento → Proposta · Honorário: R$ 480.000', 'Ana Teixeira', { de: 'levantamento', para: 'proposta' }),
]
