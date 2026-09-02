/**
 * O link de redefinição precisa morrer depois do uso. Sem estado no servidor,
 * quem garante isso é a digital da senha atual embutida no token.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

delete process.env.DATABASE_URL
process.env.SESSION_SECRET = 'segredo-de-teste'
const {
  hashSenha, conferirSenha, gerarLinkSenha, lerLinkSenha,
  gerarLinkMagico, lerLinkMagico, SENHA_MINIMA,
} = await import('../auth.js')

const usuario = (senha = 'senha-antiga-1') => ({ id: 'U1', senhaHash: hashSenha(senha) })

test('o link vale enquanto a senha não muda', () => {
  const u = usuario()
  const token = gerarLinkSenha(u)
  assert.ok(lerLinkSenha(token, u))
})

test('trocar a senha mata o link — uso único sem guardar estado', () => {
  const u = usuario()
  const token = gerarLinkSenha(u)
  assert.ok(lerLinkSenha(token, u))

  // É o que a rota faz ao redefinir: o hash muda, a digital não confere mais.
  u.senhaHash = hashSenha('senha-nova-12345')
  assert.equal(lerLinkSenha(token, u), null)
})

test('link de um usuário não serve para outro', () => {
  const a = usuario()
  const b = { id: 'U2', senhaHash: hashSenha('outra-senha-1') }
  assert.equal(lerLinkSenha(gerarLinkSenha(a), b), null)
})

test('link mágico e link de senha não são intercambiáveis', () => {
  const u = usuario()
  // Entrar sem senha e trocar a senha são poderes diferentes.
  assert.equal(lerLinkSenha(gerarLinkMagico(u.id), u), null)
  assert.equal(lerLinkMagico(gerarLinkSenha(u)), null)
})

test('token adulterado é recusado', () => {
  const u = usuario()
  const token = gerarLinkSenha(u)
  const [corpo, mac] = token.split('.')
  assert.equal(lerLinkSenha(`${corpo}.${mac.slice(0, -2)}xx`, u), null)
  assert.equal(lerLinkSenha('lixo', u), null)
  assert.equal(lerLinkSenha('', u), null)
  assert.equal(lerLinkSenha(token, null), null)
})

test('a senha nova continua conferindo depois da troca', () => {
  const h = hashSenha('uma-senha-bem-longa')
  assert.ok(conferirSenha('uma-senha-bem-longa', h))
  assert.ok(!conferirSenha('uma-senha-bem-long', h))
  assert.ok(SENHA_MINIMA >= 8)
})
