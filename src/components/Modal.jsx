import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

const modalStack = []
const focusable = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'

export default function Modal({ open, title, children, onClose, onConfirm, confirmLabel = 'Salvar', intent = 'primary' }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const trigger = document.activeElement
    modalStack.push(dialog)
    const elements = () => [...dialog.querySelectorAll(focusable)].filter((element) => element.getClientRects().length)
    const focusFirst = () => (elements()[0] || dialog).focus()
    focusFirst()
    const keydown = (event) => {
      if (modalStack.at(-1) !== dialog) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const items = elements()
      const first = items[0], last = items.at(-1)
      if (!items.length) { event.preventDefault(); dialog.focus() }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const containFocus = (event) => { if (modalStack.at(-1) === dialog && !dialog.contains(event.target)) focusFirst() }
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('focusin', containFocus)
    return () => {
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('focusin', containFocus)
      modalStack.splice(modalStack.indexOf(dialog), 1)
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open])
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <header><h2 id={titleId}>{title}</h2><button aria-label="Fechar" onClick={onClose}><X size={20} /></button></header>
        <div className="modal__body">{children}</div>
        <footer>{onConfirm ? <><button className="secondary-button" onClick={onClose}>Cancelar</button><button className={intent === 'danger' ? 'danger-button' : 'primary-button'} onClick={onConfirm}>{confirmLabel}</button></> : <button className="secondary-button" onClick={onClose}>Fechar</button>}</footer>
      </section>
    </div>
  )
}
