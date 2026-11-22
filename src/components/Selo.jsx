// Selo "+": marca o que é novo ou está pendente. O número vai visível; a descrição, para leitores de tela.
export default function Selo({ count, label }) {
  if (!count) return null
  return <span className="selo" title={label}><span aria-hidden="true">+{count}</span>{label && <span className="sr-only">{label}</span>}</span>
}
