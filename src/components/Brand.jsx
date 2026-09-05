import { Building2 } from 'lucide-react'

export default function Brand({ inverse = false, compact = false }) {
  return (
    <div className={`brand ${inverse ? 'brand--inverse' : ''}`} aria-label="Condo+">
      <span className="brand__mark"><Building2 size={compact ? 24 : 34} strokeWidth={2.4} /></span>
      <span className="brand__name">Condo<span>+</span></span>
    </div>
  )
}
