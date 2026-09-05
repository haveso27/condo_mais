export default function StatusBadge({ children, tone = 'green' }) {
  return <span className={`status status--${tone}`}>{children}</span>
}
