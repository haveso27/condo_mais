import Modal from './Modal'

// children: campo extra opcional abaixo da mensagem (ex.: a solução aplicada ao resolver um chamado)
export default function ConfirmDialog({ open, title = 'Confirmar ação', message, confirmLabel = 'Confirmar', onCancel, onConfirm, destructive = false, busy = false, error = '', children = null }) {
  return <Modal open={open} title={title} onClose={onCancel} onConfirm={onConfirm} confirmLabel={confirmLabel} intent={destructive ? 'danger' : 'primary'} busy={busy}><p className="confirm-message">{message}</p>{children}{error && <p className="modal-error" role="alert">{error}</p>}</Modal>
}
