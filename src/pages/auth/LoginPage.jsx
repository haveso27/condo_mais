import { Eye, LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'

const demoProfiles = [
  { label: 'Morador', path: '/morador', cpf: '111.111.111-11' },
  { label: 'Portaria', path: '/portaria', cpf: '222.222.222-22' },
  { label: 'Admin', path: '/admin', cpf: '333.333.333-33' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState('')

  function choose(profile) {
    setSelected(profile.path)
    setCpf(profile.cpf)
    setPassword('condo123')
  }

  function submit(event) {
    event.preventDefault()
    navigate(selected || demoProfiles.find((profile) => profile.cpf === cpf)?.path || '/morador')
  }

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h2>Acesse sua conta</h2>
        <p>Entre com seu CPF e senha para acessar o Condo+.</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <label>CPF
          <span className="input-wrap"><UserRound size={18} /><input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" /></span>
        </label>
        <label>Senha
          <span className="input-wrap"><LockKeyhole size={18} /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Digite sua senha" /><Eye size={18} /></span>
        </label>
        <div className="form-row"><label className="check"><input type="checkbox" /> Lembrar de mim</label><button type="button" className="text-link" onClick={() => navigate('/recuperar-senha')}>Esqueci minha senha</button></div>
        <button className="primary-button" type="submit">Entrar</button>
      </form>
      <div className="divider"><span>ou</span></div>
      <div className="demo-access">
        <strong>Acessos de demonstração</strong>
        <p>Escolha um perfil para preencher os dados.</p>
        <div>{demoProfiles.map((profile) => <button className={selected === profile.path ? 'active' : ''} key={profile.label} onClick={() => choose(profile)}>{profile.label}</button>)}</div>
      </div>
      <button className="first-access-link" onClick={() => navigate('/primeiro-acesso')}>É seu primeiro acesso? <strong>Ativar minha conta</strong></button>
    </AuthLayout>
  )
}
