import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const source = (path) => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')

// Structural guard complements the interactive Admin/Portaria retest:
// node:test alone does not mount React effects in a browser.
test('comment reset follows record identity, including close', async () => {
  const entity = await source('pages/desktop/EntityPage.jsx')
  assert.match(entity, /useEffect\(\(\) => \{ setComment\(''\) \}, \[details\?\.id\]\)/)
  assert.match(entity, /comments: \[\.\.\.\(details.comments \|\| \[\]\), comment\]/)
})

test('list and dashboard link to unique IDs, not water title', async () => {
  const [app, pages, dashboard] = await Promise.all([
    source('App.jsx'), source('pages/morador/ResidentPages.jsx'), source('pages/morador/ResidentDashboard.jsx'),
  ])
  assert.ok(app.includes('/morador/comunicados/:id'))
  for (const code of [pages, dashboard]) {
    assert.ok(code.includes('encodeURIComponent(notice.id)'))
    assert.ok(!code.includes('/morador/comunicados/agua'))
  }
  assert.ok(dashboard.includes('encodeURIComponent(urgentNotice.id)'))
})

test('real detail renders A/B/A by route ID and rejects unavailable IDs', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { CommunicationDetail } = await server.ssrLoadModule('/src/pages/morador/ResidentPages.jsx')
    const { AppDataProvider } = await server.ssrLoadModule('/src/context/AppDataContext.jsx')
    const { initialAppData } = await server.ssrLoadModule('/src/mocks/appData.js')
    const original = initialAppData.notices
    // Test-only records: repository fixtures are never edited.
    initialAppData.notices = [
      { ...original[0], id: 'WATER-B', title: 'Água B', content: 'CONTEUDO B', priority: 'NORMAL', startDate: '2026-10-11' },
      { ...original[0], id: 'WATER-A', title: 'Água A', content: 'CONTEUDO A', priority: 'URGENTE', startDate: '2026-10-10' },
      { ...original[0], id: 'CLOSED', status: 'ENCERRADO' },
      { ...original[0], id: 'OTHER-TOWER', destination: 'Torre/Bloco específico', tower: 'Torre B' },
    ]
    try {
      const render = (id) => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [`/morador/comunicados/${id}`] },
        React.createElement(AppDataProvider, null, React.createElement(Routes, null,
          React.createElement(Route, { path: '/morador/comunicados/:id', element: React.createElement(CommunicationDetail) })))))
      for (const [id, content, other, date, priority] of [
        ['WATER-A', 'CONTEUDO A', 'CONTEUDO B', '2026-10-10', 'Urgente'],
        ['WATER-B', 'CONTEUDO B', 'CONTEUDO A', '2026-10-11', 'Normal'],
        ['WATER-A', 'CONTEUDO A', 'CONTEUDO B', '2026-10-10', 'Urgente'],
      ]) {
        const html = render(id)
        assert.ok(html.includes(content))
        assert.ok(!html.includes(other))
        assert.ok(html.includes(date))
        assert.ok(html.includes(priority))
        assert.ok(!html.includes('normalizado até as 18h'))
      }
      for (const id of ['missing', 'agua', 'CLOSED', 'OTHER-TOWER']) {
        const html = render(id)
        assert.ok(html.includes('Comunicado não encontrado'))
        assert.ok(!html.includes('CONTEUDO'))
      }
    } finally { initialAppData.notices = original }
  } finally { await server.close() }
})
