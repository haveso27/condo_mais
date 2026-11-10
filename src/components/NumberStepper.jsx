import { Minus, Plus } from 'lucide-react'

// Controle numérico com + e −. O valor continua sendo texto (como nos inputs do projeto) e os limites
// só impedem o que é inválido: dentro de min..max qualquer número, mesmo incomum, pode ser digitado.
// As props de acessibilidade (id, aria-*, data-field-key) vão para o input, que é o controle rotulado.
export default function NumberStepper({ value, onChange, min = 1, max = 100, step = 1, label = '', disabled = false, ...inputProps }) {
  const current = Number.parseInt(value, 10)
  const known = Number.isFinite(current)
  const apply = (next) => onChange(String(Math.min(max, Math.max(min, next))))
  return <div className="number-stepper">
    <button type="button" aria-label={`Diminuir${label ? ` ${label}` : ''}`} disabled={disabled || (known && current <= min)} onClick={() => apply(known ? current - step : min)}><Minus size={16} /></button>
    <input {...inputProps} type="number" inputMode="numeric" min={min} max={max} step={step} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    <button type="button" aria-label={`Aumentar${label ? ` ${label}` : ''}`} disabled={disabled || (known && current >= max)} onClick={() => apply(known ? current + step : min)}><Plus size={16} /></button>
  </div>
}
