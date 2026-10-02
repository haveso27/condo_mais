import { Bot, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MAX_CARACTERES, perguntarAoAssistente } from '../services/assistenteApi.js'

const greeting = { role: 'assistant', text: 'Olá! Sou o assistente do Condo+. Posso consultar suas encomendas, reservas, visitas, chamados e os comunicados do condomínio. Como posso ajudar?' }
const suggestions = ['Tem alguma encomenda para mim?', 'Quais são minhas próximas reservas?', 'Há comunicados novos?']

// Chat flutuante da área do Morador. Só aparece com a API ligada (sem mocks: o assistente consulta o banco real).
export default function AssistantChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([greeting])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const triggerRef = useRef(null)
  const wasOpen = useRef(false)

  // Ao abrir, foco no campo; ao fechar, de volta ao botão flutuante (que só existe com o painel fechado)
  useEffect(() => {
    if (open) inputRef.current?.focus()
    else if (wasOpen.current) triggerRef.current?.focus()
    wasOpen.current = open
  }, [open])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages, loading, open])

  const close = () => setOpen(false)

  async function send(text) {
    const question = text.trim()
    if (!question || loading) return
    const history = [...messages, { role: 'user', text: question }]
    setMessages(history)
    setDraft('')
    setError('')
    setLoading(true)
    try {
      const answer = await perguntarAoAssistente(history)
      setMessages((current) => [...current, { role: 'assistant', text: answer }])
    } catch (requestError) {
      // Pergunta sem resposta sai do histórico e volta para o campo, para o morador tentar de novo
      setMessages((current) => current.slice(0, -1))
      setDraft(question)
      setError(requestError.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(draft) }
  }

  if (!open) {
    return <button ref={triggerRef} className="assistant-fab" onClick={() => setOpen(true)} aria-label="Abrir assistente virtual"><Bot size={26} /></button>
  }

  return (
    <section className="assistant-panel" role="dialog" aria-label="Assistente virtual" onKeyDown={(event) => { if (event.key === 'Escape') close() }}>
      <header>
        <span className="assistant-panel__avatar"><Bot size={20} /></span>
        <div><strong>Assistente Condo+</strong><small>Consulta seus dados no condomínio</small></div>
        <button onClick={close} aria-label="Fechar assistente"><X size={20} /></button>
      </header>
      <div className="assistant-panel__messages" ref={listRef} aria-live="polite">
        {messages.map((message, index) => <p key={index} className={`assistant-message assistant-message--${message.role}`}>{message.text}</p>)}
        {loading && <p className="assistant-message assistant-message--assistant assistant-message--loading">Consultando…</p>}
        {messages.length === 1 && !loading && <div className="assistant-panel__suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>)}</div>}
      </div>
      {error && <p className="assistant-panel__error" role="alert">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); send(draft) }}>
        <textarea ref={inputRef} rows={1} value={draft} maxLength={MAX_CARACTERES} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} placeholder="Digite sua pergunta" aria-label="Sua pergunta" />
        <button type="submit" disabled={loading || !draft.trim()} aria-label="Enviar pergunta"><Send size={18} /></button>
      </form>
    </section>
  )
}
