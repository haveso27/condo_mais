import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Nenhum registro encontrado.', onClear }) {
  return <div className="empty-state"><Inbox size={28} /><strong>{title}</strong>{onClear && <button className="text-link" onClick={onClear}>Limpar filtros</button>}</div>
}
