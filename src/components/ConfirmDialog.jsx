import Modal from './Modal'

export default function ConfirmDialog({ open, title = 'Confirmar ação', message, confirmLabel = 'Confirmar', onCancel, onConfirm }) {
  return <Modal open={open} title={title} onClose={onCancel} onConfirm={onConfirm} confirmLabel={confirmLabel}><p className="confirm-message">{message}</p></Modal>
}
