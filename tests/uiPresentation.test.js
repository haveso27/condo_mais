import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { statusIntent, emptyMessage, confirmationMessage, errorField } from '../src/config/uiPresentation.js'
import { commonAreas, priorities } from '../src/config/catalogs.js'
import { initialAppData } from '../src/mocks/appData.js'

test('status têm intenção única sem mudar enum', () => {
  assert.equal(statusIntent('AGUARDANDO_APROVACAO'), 'warning')
  assert.equal(statusIntent('ENTROU'), 'info')
  assert.equal(statusIntent('SAIU'), 'neutral')
  assert.equal(statusIntent('RESOLVIDO'), 'success')
  assert.equal(statusIntent('RECUSADO'), 'danger')
  assert.equal(statusIntent('DESCONHECIDO'), 'neutral')
})
test('vazio real é diferente de filtro vazio', () => {
  assert.equal(emptyMessage('visitors'), 'Nenhum visitante cadastrado.')
  assert.equal(emptyMessage('visitors', true), 'Nenhum visitante corresponde aos filtros selecionados.')
  assert.notEqual(emptyMessage('reservations'), emptyMessage('reservations', true))
})
test('confirmação inclui ação, pessoa, unidade e consequência', () => {
  const message = confirmationMessage({ id: 'VIS-TEST', name: 'Pessoa teste', unit: '203', tower: 'Torre B' }, 'Registrar entrada', 'ENTROU')
  for (const value of ['Pessoa teste', 'VIS-TEST', '203', 'Torre B', 'Registrar entrada', 'presente']) assert.ok(message.includes(value))
  assert.ok(confirmationMessage({ id: 'R1', area: 'Quadra', date: '2026-10-10', startTime: '10:00', endTime: '11:00' }, 'Cancelar reserva', 'CANCELADA').includes('deixará de ocupar'))
})
test('erro existente aponta campo sem alterar validação', () => {
  const fields = [{ key: 'name', required: true }, { key: 'cpf' }, { key: 'endDate' }]
  assert.equal(errorField(fields, {}, 'Preencha o campo “Nome”.'), 'name')
  assert.equal(errorField(fields, { name: 'Teste' }, 'Informe um CPF com 11 dígitos.'), 'cpf')
  assert.equal(errorField(fields, { name: 'Teste' }, 'O término da autorização deve ser posterior ao início.'), 'endDate')
  assert.equal(errorField(fields, {}, 'Seu perfil não possui vínculo ativo.'), undefined)
})
test('catálogo compartilhado preserva valores mock', () => {
  assert.deepEqual(initialAppData.commonAreas, commonAreas)
  assert.deepEqual(priorities, ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'])
})

test('componentes renderizados preservam dados permitidos e semântica', async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
  try {
    const { default: RecordDetails } = await server.ssrLoadModule('/src/components/RecordDetails.jsx')
    const { default: Modal } = await server.ssrLoadModule('/src/components/Modal.jsx')
    const { default: DynamicForm } = await server.ssrLoadModule('/src/components/DynamicForm.jsx')
    const { default: ResidentLayout } = await server.ssrLoadModule('/src/layouts/ResidentLayout.jsx')
    const { default: StatusBadge } = await server.ssrLoadModule('/src/components/StatusBadge.jsx')
    await t.test('detalhes bloqueiam campos desconhecidos e objetos aninhados', () => {
      const html = render(RecordDetails, { collection: 'visitors', record: { id: 'V1', name: 'Teste', unit: 0, notes: { secret: 'NESTED-SECRET' }, token: 'TOKEN-SECRET', salary: 1234, owners: ['OTHER-DOMAIN'] } })
      assert.ok(html.includes('Teste'))
      assert.ok(html.includes('>0<'))
      for (const secret of ['NESTED-SECRET', 'TOKEN-SECRET', 'salary', 'OTHER-DOMAIN']) assert.ok(!html.includes(secret))
    })
    await t.test('comentários string/objeto e vínculos continuam visíveis; null não quebra', () => {
      const html = render(RecordDetails, { collection: 'tickets', record: { id: 'T1', comments: ['Texto A', { content: 'Texto B', author: 'Autor', createdAt: 'Data' }, null, { content: { invalid: true } }] } })
      for (const text of ['Texto A', 'Texto B', 'Autor', 'Data']) assert.ok(html.includes(text))
      const unit = render(RecordDetails, { collection: 'units', record: { residents: ['Pessoa A', 'Pessoa B'] } })
      assert.ok(unit.includes('Pessoa A, Pessoa B'))
    })
    await t.test('modal consulta tem uma saída de rodapé, edição mantém cancelar/salvar', () => {
      const read = render(Modal, { open: true, title: 'Consulta', onClose() {} })
      assert.ok(!read.includes('Cancelar'))
      assert.ok(read.includes('>Fechar</button>'))
      const edit = render(Modal, { open: true, title: 'Editar', onClose() {}, onConfirm() {} })
      assert.ok(edit.includes('Cancelar'))
      assert.ok(edit.includes('Salvar'))
    })
    await t.test('formulário associa erro ao controle e mantém valor digitado', () => {
      const html = render(DynamicForm, { fields: [{ key: 'cpf', label: 'CPF', required: true }], values: { cpf: 'abc' }, onChange() {}, error: 'Informe um CPF com 11 dígitos.' })
      assert.ok(html.includes('aria-invalid="true"'))
      assert.ok(html.includes('aria-describedby='))
      assert.ok(html.includes('value="abc"'))
      assert.equal(html.split('Informe um CPF').length - 1, 1)
    })
    await t.test('serviço filho mantém Mais/Serviços ativo', () => {
      const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/morador/reservas'] }, React.createElement(ResidentLayout, null, 'Conteúdo')))
      assert.ok(html.includes('aria-current="page" class="active" href="/morador/mais"') || /aria-current="page"[^>]*href="\/morador\/mais"/.test(html))
    })
    await t.test('badge renderiza intenção e mantém texto', () => {
      const html = render(StatusBadge, { status: 'AGUARDANDO_APROVACAO', children: 'Aguardando aprovação' })
      assert.ok(html.includes('status--warning'))
      assert.ok(html.includes('Aguardando aprovação'))
    })
  } finally { await server.close() }
})
