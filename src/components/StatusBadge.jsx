import { statusIntent } from '../config/uiPresentation'

export default function StatusBadge({ children, status, tone = 'green' }) {
  return <span className={`status status--${status ? statusIntent(status) : tone}`}>{children}</span>
}
