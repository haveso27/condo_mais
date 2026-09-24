import { Eye, LockKeyhole, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import { validateMockLogin } from '../../mocks/mockUsers'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invalidFields, setInvalidFields] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const errorId = useId()
  useEffect(() => { if (error) formRef.current?.querySelector('[aria-invalid="true"]')?.focus() }, [error])

  function submit(event) {
    event.preventDefault()
    const result = validateMockLogin(email, password)
    if (result.error) { setInvalidFields(result.invalidFields); setError(result.error); return }
    setError('')
    navigate(result.path)
  }

  return (
    <AuthLayout variant="login">
      <div className="auth-heading">
        <h2>Acesse sua conta</h2>
        <p>Entre com seu e-mail e senha para acessar o Condo+.</p>
      </div>
      <form ref={formRef} className="login-form" onSubmit={submit} noValidate>
        <label>E-mail
          <span className="input-wrap"><UserRound size={18} /><input type="email" autoComplete="username" aria-required="true" aria-invalid={Boolean(error && invalidFields.includes('email')) || undefined} aria-describedby={error && invalidFields.includes('email') ? errorId : undefined} value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="Digite seu e-mail" /></span>
        </label>
        <label>Senha
          <span className="input-wrap"><LockKeyhole size={18} /><input autoComplete="current-password" aria-required="true" aria-invalid={Boolean(error && invalidFields.includes('password')) || undefined} aria-describedby={error && invalidFields.includes('password') ? errorId : undefined} value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" /><button className="password-toggle" type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><Eye size={18} /></button></span>
        </label>
        <div className="form-row"><label className="check"><input type="checkbox" /> Lembrar de mim</label><button type="button" className="text-link" onClick={() => navigate('/recuperar-senha')}>Esqueci minha senha</button></div>
        {error && <p id={errorId} className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit">Entrar</button>
      </form>
      <div className="divider"><span>ou</span></div>
      <button className="first-access-link" onClick={() => navigate('/primeiro-acesso')}>É seu primeiro acesso? <strong>Ativar minha conta</strong></button>
    </AuthLayout>
  )
}
