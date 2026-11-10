// Seletor de horário sem digitação: lista de HH:mm de 15 em 15 minutos. Um valor que já existe fora
// desse passo (registro antigo) continua aparecendo, para o seletor nunca apagar um horário legítimo.
export function timeOptions(step = 15) {
  const options = []
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    options.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }
  return options
}

export default function TimeSelect({ value, onChange, step = 15, ...selectProps }) {
  const options = timeOptions(step)
  const current = value ?? ''
  const all = current && !options.includes(current) ? [...options, current].sort() : options
  return <select {...selectProps} value={current} onChange={(event) => onChange(event.target.value)}>
    <option value="">Selecione</option>
    {all.map((time) => <option key={time} value={time}>{time}</option>)}
  </select>
}
