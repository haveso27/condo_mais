export default function Brand({ inverse = false, compact = false }) {
  return (
    <div className={`brand ${inverse ? 'brand--inverse' : ''} ${compact ? 'brand--compact' : ''}`}>
      <img className="brand__image brand__image--full" src={inverse ? '/logo-principal-branca.png' : '/logo-principal.png'} alt="Condo+" />
      {inverse && <img className="brand__image brand__image--symbol" src="/logo-simbolo-branco.png" alt="" aria-hidden="true" />}
    </div>
  )
}
