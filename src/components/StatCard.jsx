export default function StatCard({ icon: Icon, label, value, detail, tone = 'green', onClick }) {
  const Tag = onClick ? 'button' : 'article'
  return (
    <Tag className={`stat-card${onClick ? ' stat-card--action' : ''}`} onClick={onClick}>
      <span className={`stat-card__icon stat-card__icon--${tone}`}><Icon size={22} /></span>
      <strong>{value}</strong>
      <span className="stat-card__label">{label}</span>
      <small>{detail}</small>
    </Tag>
  )
}
