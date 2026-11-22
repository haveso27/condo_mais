import { Check, Clock, Minus, RotateCw, X } from 'lucide-react'
import { statusIntent } from '../config/uiPresentation'

// Placa de status: a cor e o glifo reforçam a intenção, mas o texto continua sendo a informação
const glyphs = { success: Check, info: RotateCw, warning: Clock, danger: X, neutral: Minus }
const toneIntents = { green: 'success', violet: 'info', pink: 'warning', red: 'danger' }

export function badgeIntent(status, tone = 'green') {
  return status ? statusIntent(status) : toneIntents[tone] || (glyphs[tone] ? tone : 'success')
}

export default function StatusBadge({ children, status, tone = 'green' }) {
  const intent = badgeIntent(status, tone)
  const Glyph = glyphs[intent]
  return <span className={`status status--${intent}`}><Glyph size={12} aria-hidden="true" />{children}</span>
}
