import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function ResidentPageHeader({ title, subtitle, action, onAction, backTo = '/morador' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key === 'default' ? navigate(backTo) : navigate(-1)
  return (
    <>
      <button className="back-button" onClick={goBack}><ArrowLeft size={15} /> Voltar</button>
      <div className="resident-title"><h1>{title}</h1><p>{subtitle}</p></div>
      {action && <button className="wide-action" onClick={onAction}>+ {action}</button>}
    </>
  )
}
