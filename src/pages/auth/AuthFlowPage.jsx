import { LockKeyhole, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'

const content = {
  first: { title: 'Primeiro acesso', text: 'Vamos verificar seu cadastro para ativar sua conta.', fields: ['CPF'], action: 'Continuar', next: '/criar-senha' },
  create: { title: 'Olá, João!', text: 'Crie sua senha de acesso', fields: ['Nova senha', 'Confirmar senha'], action: 'Ativar conta', next: '/morador' },
  recovery1: { title: 'Recuperar senha', text: 'Informe seu CPF para recuperar o acesso à sua conta.', fields: ['CPF'], action: 'Continuar', next: '/recuperar-senha/verificar' },
  recovery2: { title: 'Verifique sua identidade', text: 'Enviaremos as instruções de recuperação para o e-mail cadastrado.', fields: [], action: 'Enviar instruções', next: '/recuperar-senha/nova-senha' },
  recovery3: { title: 'Crie uma nova senha', text: 'Defina uma nova senha para acessar o Condo+.', fields: ['Nova senha', 'Confirmar senha'], action: 'Alterar senha', next: '/' },
}

export default function AuthFlowPage({ step }) {
  const navigate = useNavigate()
  const data = content[step]
  return (
    <AuthLayout>
      <div className="auth-heading"><h2>{data.title}</h2><p>{data.text}</p></div>
      {step === 'recovery2' && <div className="masked-email">m a • • • • • • @ g m a i l . c o m</div>}
      <form className="login-form" onSubmit={(event) => { event.preventDefault(); navigate(data.next) }}>
        {data.fields.map((field) => <label key={field}>{field}<span className="input-wrap">{field === 'CPF' ? <UserRound size={18} /> : <LockKeyhole size={18} />}<input type={field === 'CPF' ? 'text' : 'password'} placeholder={field === 'CPF' ? '000.000.000-00' : `Digite ${field.toLowerCase()}`} /></span>{field === 'Nova senha' && <small className="field-hint">Mínimo de 8 caracteres.</small>}</label>)}
        <button className="primary-button" type="submit">{data.action}</button>
        <button type="button" className="text-link back-auth" onClick={() => navigate(-1)}>← Voltar</button>
      </form>
      {(step === 'first' || step === 'recovery1') && <><div className="divider"><span>ou</span></div><button className="outline-auth" onClick={() => navigate(step === 'first' ? '/' : '/primeiro-acesso')}>{step === 'first' ? 'Voltar ao login' : 'Ativar minha conta'}</button></>}
    </AuthLayout>
  )
}
