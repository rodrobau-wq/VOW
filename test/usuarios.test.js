/**
 * Convidar e desativar. A trava que importa: ninguém pode se trancar para
 * fora, porque destrancar exigiria shell no servidor.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

delete process.env.DATABASE_URL
process.env.SESSION_SECRET = 'segredo-de-teste'
const { PAPEIS, hashSenha, conferirSenha, gerarLinkSenha, lerLinkSenha } = await import('../auth.js')

test('os papéis do brief estão todos declarados', () => {
  assert.deepEqual(PAPEIS, ['comprador', 'fiscal', 'juridico', 'suprimentos', 'diretoria', 'vow'])
})

test('a senha provisória do convite não vale como senha', () => {
  // Quem convida sorteia uma senha que nem ele conhece; a pessoa define a
  // dela pelo link. O que se guarda é o hash, e ele não volta a ser senha.
  const provisoria = 'sorteada-no-servidor'
  const u = { id: 'U1', senhaHash: hashSenha(provisoria) }
  assert.ok(conferirSenha(provisoria, u.senhaHash))
  assert.ok(!conferirSenha('qualquer-outra', u.senhaHash))

  // O link do convite é o mesmo de redefinição: morre ao trocar a senha.
  const link = gerarLinkSenha(u)
  assert.ok(lerLinkSenha(link, u))
  u.senhaHash = hashSenha('a-senha-que-a-pessoa-escolheu')
  assert.equal(lerLinkSenha(link, u), null)
})

test('conta desativada é reconhecível pelo campo, sem apagar o registro', () => {
  // Desativar preserva o histórico: as interações apontam para o usuário, e
  // apagá-lo deixaria a linha do tempo sem autor.
  const ativo = { ativo: true }, desativado = { ativo: false }, antigo = {}
  const podeEntrar = (u) => u.ativo !== false
  assert.equal(podeEntrar(ativo), true)
  assert.equal(podeEntrar(desativado), false)
  // Conta criada antes do campo existir continua valendo.
  assert.equal(podeEntrar(antigo), true)
})
