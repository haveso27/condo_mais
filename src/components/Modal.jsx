import { X } from 'lucide-react'

export default function Modal({ open, title, children, onClose, onConfirm, confirmLabel = 'Salvar' }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2 id="modal-title">{title}</h2><button aria-label="Fechar" onClick={onClose}><X size={20} /></button></header>
        <div className="modal__body">{children}</div>
        <footer><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={onConfirm}>{confirmLabel}</button></footer>
      </section>
    </div>
  )
}
