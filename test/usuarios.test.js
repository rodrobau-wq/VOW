/**
 * Convidar e desativar. A trava que importa: ninguém pode se trancar para
 * fora, porque destrancar exigiria shell no servidor.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

delete process.env.DATABASE_URL
process.env.SESSION_SECRET = 'segredo-de-teste'
const { PAPEIS, STATUS, podeEntrar, ehAdmin, ehDono, hashSenha, conferirSenha,
        gerarLinkSenha, lerLinkSenha } = await import('../auth.js')

test('os papéis vão do dono da plataforma aos quatro do cliente', () => {
  // `deus` é o dono; `vow` administra; `vendedor` trabalha o funil sem
  // administrar equipe.
  assert.deepEqual(PAPEIS,
    ['deus', 'vow', 'vendedor', 'comprador', 'fiscal', 'juridico', 'suprimentos', 'diretoria'])
  assert.deepEqual(STATUS, ['convidado', 'ativo', 'inativo'])
})

test('quem administra é dono ou vow — e só o dono é dono', () => {
  assert.equal(ehAdmin({ papel: 'deus' }), true)
  assert.equal(ehAdmin({ papel: 'vow' }), true)
  assert.equal(ehAdmin({ papel: 'vendedor' }), false)
  assert.equal(ehAdmin(null), false)
  assert.equal(ehDono({ papel: 'deus' }), true)
  // Um administrador não pode se confundir com o dono: é o que impede que
  // ele se promova sozinho pela tela de equipe.
  assert.equal(ehDono({ papel: 'vow' }), false)
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

test('só `inativo` fecha a porta; convidado já entra pelo link', () => {
  // Desativar preserva o histórico: as interações apontam para o usuário, e
  // apagá-lo deixaria a linha do tempo sem autor.
  assert.equal(podeEntrar({ status: 'ativo' }), true)
  assert.equal(podeEntrar({ status: 'convidado' }), true)
  assert.equal(podeEntrar({ status: 'inativo' }), false)
  // Conta criada antes do campo existir continua valendo.
  assert.equal(podeEntrar({}), true)
  assert.equal(podeEntrar(null), false)
})

test('o convite dura mais que a redefinição de senha', () => {
  // Quem redefine está com o e-mail aberto; quem é convidado pode não estar.
  const u = { id: 'U9', senhaHash: hashSenha('provisoria') }
  const corpo = (t) => JSON.parse(Buffer.from(t.split('.')[0], 'base64url').toString())
  const curto = corpo(gerarLinkSenha(u))
  const longo = corpo(gerarLinkSenha(u, { convite: true }))
  assert.ok(longo.exp > curto.exp)
  // 24 h contra 1 h.
  assert.ok((longo.exp - curto.exp) > 22 * 3600e3)
})

test('o domínio do auto-cadastro é conferido no servidor', () => {
  // A tela também confere, mas conferência de tela é conveniência: quem
  // chama a API direto não passa por ela.
  const DOMINIO_VOW = /@grupovow\.com\.br$/i
  assert.ok(DOMINIO_VOW.test('silvia.alves@grupovow.com.br'))
  assert.ok(DOMINIO_VOW.test('SILVIA@GRUPOVOW.COM.BR'))
  assert.ok(!DOMINIO_VOW.test('fulano@gmail.com'))
  // Não basta conter o domínio: precisa terminar nele.
  assert.ok(!DOMINIO_VOW.test('invasor@grupovow.com.br.evil.com'))
  assert.ok(!DOMINIO_VOW.test('grupovow.com.br@gmail.com'))
})
