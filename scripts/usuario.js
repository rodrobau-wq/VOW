/**
 * Cria ou atualiza um usuário sem tocar no resto da base.
 *
 * O seed só serve para começar do zero — em produção `--forcar` apagaria a
 * carteira do cliente. É este script que roda no shell do Render.
 *
 *   node scripts/usuario.js --email a@b.com --papel vow --nome "Rodrigo Bauer"
 *   node scripts/usuario.js --email a@b.com --senha "..."     # troca a senha
 *   node scripts/usuario.js --listar
 *
 * Sem --senha, sorteia uma e imprime. A senha aparece uma única vez.
 */
import crypto from 'node:crypto'
import * as store from '../store.js'
import { hashSenha, PAPEIS } from '../auth.js'

const arg = (nome) => {
  const i = process.argv.indexOf(`--${nome}`)
  return i > 0 ? process.argv[i + 1] : undefined
}

if (process.argv.includes('--listar')) {
  const us = await store.listar('usuario')
  if (!us.length) console.log('Nenhum usuário. Rode o seed ou crie um com --email.')
  for (const u of us) console.log(`  ${u.email.padEnd(34)} ${String(u.papel).padEnd(12)} ${u.nome || ''}`)
  process.exit(0)
}

const email = String(arg('email') || '').trim().toLowerCase()
if (!email) {
  console.error('Faltou --email. Use --listar para ver os existentes.')
  process.exit(1)
}

const papel = arg('papel') || 'vow'
if (!PAPEIS.includes(papel)) {
  console.error(`Papel inválido: ${papel}. Use um de: ${PAPEIS.join(', ')}`)
  process.exit(1)
}

const senha = arg('senha') || crypto.randomBytes(12).toString('base64url')
const existente = await store.achar('usuario', (u) => u.email === email)

if (existente) {
  const mudancas = { senhaHash: hashSenha(senha) }
  if (arg('papel')) mudancas.papel = papel
  if (arg('nome')) mudancas.nome = arg('nome')
  await store.atualizar('usuario', existente.id, mudancas)
  console.log(`Atualizado: ${email} (${mudancas.papel || existente.papel})`)
} else {
  // Papel `vow` enxerga todas as redes, então não precisa de lista.
  await store.inserir('usuario', {
    nome: arg('nome') || email, email, papel,
    senhaHash: hashSenha(senha), redes: [],
  })
  console.log(`Criado: ${email} (${papel})`)
  if (papel !== 'vow') {
    console.log('  Atenção: papel diferente de `vow` não vê rede nenhuma até ser vinculado.')
  }
}

if (!arg('senha')) console.log(`  senha sorteada: ${senha}`)
console.log('  Anote agora — ela não é recuperável.')
