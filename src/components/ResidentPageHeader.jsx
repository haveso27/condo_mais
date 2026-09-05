import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ResidentPageHeader({ title, subtitle, action, onAction }) {
  const navigate = useNavigate()
  return (
    <>
      <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Voltar</button>
      <div className="resident-title"><h1>{title}</h1><p>{subtitle}</p></div>
      {action && <button className="wide-action" onClick={onAction}>+ {action}</button>}
    </>
  )
}
