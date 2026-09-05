export default function StatCard({ icon: Icon, label, value, detail, tone = 'green' }) {
  return (
    <article className="stat-card">
      <span className={`stat-card__icon stat-card__icon--${tone}`}><Icon size={22} /></span>
      <strong>{value}</strong>
      <span className="stat-card__label">{label}</span>
      <small>{detail}</small>
    </article>
  )
}
