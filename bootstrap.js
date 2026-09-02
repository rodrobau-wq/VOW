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
