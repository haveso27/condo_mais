import { Check } from 'lucide-react'

// Andamento do chamado em degraus, como os blocos do logo: dá para ver de longe em que ponto ele está
// Hífen suave (­): em telas estreitas a palavra quebra com hífen ("atendi-mento") em vez de cortar no meio
export const TICKET_STEPS = [['ABERTO', 'Aberto'], ['EM_ANALISE', 'Em análise'], ['EM_ATENDIMENTO', 'Em atendi­mento'], ['RESOLVIDO', 'Resol­vido'], ['ENCERRADO', 'Encer­rado']]

export default function TicketSteps({ status, openedAt }) {
  const current = TICKET_STEPS.findIndex(([key]) => key === status)
  if (current < 0) return null
  return <ol className="trilha" aria-label="Andamento do chamado">{TICKET_STEPS.map(([key, label], index) => {
    const state = index < current ? 'feito' : index === current ? 'atual' : 'futuro'
    return <li key={key} className={`passo ${state}`} aria-current={state === 'atual' ? 'step' : undefined}>
      <span className="passo__bloco" style={{ height: 26 + index * 7 }} aria-hidden="true">{state === 'feito' ? <Check size={16} /> : state === 'atual' ? <i>+</i> : null}</span>
      <strong>{label}</strong><small>{index === 0 && openedAt ? openedAt : state === 'atual' ? 'atual' : ''}</small>
    </li>
  })}</ol>
}
