/**
 * Primeiro acesso da plataforma.
 *
 * Sem isto, um deploy novo sobe com o banco vazio e ninguém consegue entrar
 * — a plataforma fica de pé e inacessível, que foi exatamente o que
 * aconteceu. Criar o usuário exigia shell no servidor, e nem todo ambiente
 * tem shell.
 *
 * SEGURANÇA: só roda quando NÃO existe nenhum usuário. Depois do primeiro,
 * a função vira no-op para sempre — não há como usá-la para trocar senha
 * nem para criar um segundo acesso por variável de ambiente.
 */
import crypto from 'node:crypto'
import * as store from './store.js'
import { hashSenha } from './auth.js'
import { PREMISSAS } from './motor.js'

export async function primeiroAcesso() {
  const usuarios = await store.listar('usuario')
  if (usuarios.length) return { criado: false, motivo: 'já existe usuário' }

  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  if (!email) return { criado: false, motivo: 'ADMIN_EMAIL não definida' }

  // Sem senha definida, sorteia uma e imprime no log do serviço — que só
  // quem tem acesso ao painel vê. É melhor do que um default previsível.
  const senha = process.env.ADMIN_SENHA || crypto.randomBytes(12).toString('base64url')
  const sorteada = !process.env.ADMIN_SENHA

  await store.inserir('usuario', {
    nome: process.env.ADMIN_NOME || 'Administrador VOW',
    email, papel: 'vow',
    senhaHash: hashSenha(senha),
    redes: [],
  })

  console.log('─'.repeat(64))
  console.log(`Primeiro acesso criado: ${email}`)
  if (sorteada) {
    console.log(`Senha sorteada: ${senha}`)
    console.log('Anote agora — ela não aparece de novo. Defina ADMIN_SENHA para escolher a sua.')
  } else {
    console.log('Senha: a que você definiu em ADMIN_SENHA.')
  }
  console.log('─'.repeat(64))

  return { criado: true, email, sorteada }
}

/**
 * Cria o registro da própria VOW.
 *
 * A VOW é uma consultoria, mas também é uma empresa: tem fornecedores,
 * contratos e itens como qualquer cliente, e a seção 5.2 do brief de
 * Indiretos observa que ela mesma é uma linha na carteira dos clientes dela.
 * Tê-la cadastrada faz a plataforma abrir com algo dentro em vez de uma tela
 * de escolher rede sem rede nenhuma.
 *
 * Roda quando NÃO existe rede alguma — inclusive numa instalação que já tem
 * usuário, que é o caso de quem instalou antes desta versão. Depois da
 * primeira rede, nunca mais age.
 */
export async function garantirRedeVow() {
  const redes = await store.listar('rede')
  if (redes.length) return { criada: false, motivo: `já existem ${redes.length} rede(s)` }

  const rede = await store.inserir('rede', {
    razao: process.env.VOW_RAZAO || 'Grupo VOW',
    cnpj: process.env.VOW_CNPJ || '',
    porte: 'Consultoria',
    plano: 'interno',
    // Distingue a casa dos clientes: relatório de carteira não deve somar a
    // própria VOW junto com as redes atendidas.
    interna: true,
    programaConformidade: false,
    premissas: {
      aliquota: PREMISSAS.aliquota,
      parcelaCestaBasica: PREMISSAS.indiretos.parcelaCestaBasicaPadrao,
    },
  })
  console.log(`Rede da casa criada: ${rede.razao}`)
  return { criada: true, id: rede.id, razao: rede.razao }
}
