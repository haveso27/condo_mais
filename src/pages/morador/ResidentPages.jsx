import { CalendarCheck, CheckCircle2, ChevronRight, CircleUserRound, LogOut, MapPin, Megaphone, Package, Phone, ShieldCheck, TicketCheck, UserRound, UsersRound, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import ResidentPageHeader from '../../components/ResidentPageHeader'
import StatusBadge from '../../components/StatusBadge'
import ResidentLayout from '../../layouts/ResidentLayout'

const notices = [
  { type: 'Encomenda', title: 'Nova encomenda recebida', text: 'Uma encomenda está aguardando sua retirada na portaria.', time: 'Hoje · 14:32', tone: 'green', icon: Package },
  { type: 'Aviso', title: 'Manutenção preventiva da piscina', text: 'A piscina ficará temporariamente indisponível para manutenção.', time: 'Hoje · 10:15 · Normal', tone: 'green', icon: Megaphone },
  { type: 'Notificação', title: 'Reserva confirmada', text: 'Sua reserva do Salão de Festas foi confirmada.', time: 'Ontem · 18:40', tone: 'green', icon: CalendarCheck },
  { type: 'Aviso', title: 'Interrupção no abastecimento de água', text: 'O abastecimento de água da Torre B será temporariamente interrompido.', time: 'Ontem · 16:20 · Urgente', tone: 'red', icon: Megaphone, link: '/morador/comunicados/agua' },
]

export function CommunicationsPage() {
  const navigate = useNavigate(); const [tab, setTab] = useState('Todos')
  const visible = useMemo(() => notices.filter((item) => tab === 'Todos' || item.type.includes(tab.slice(0, -1))), [tab])
  return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Comunicados</h1><p>Acompanhe as novidades do seu condomínio.</p></div><div className="mobile-tabs">{['Todos','Encomendas','Avisos'].map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><div className="communication-list">{visible.map(({ type,title,text,time,tone,icon:Icon,link }) => <button onClick={() => link && navigate(link)} key={title}><span className={`communication-icon ${tone}`}><Icon size={18}/></span><span><small>{type}</small><strong>{title}</strong><p>{text}</p><em>{time}</em></span><ChevronRight size={16}/></button>)}</div></section></ResidentLayout>
}

export function CommunicationDetail() {
  return <ResidentLayout><section className="resident-page"><ResidentPageHeader title="Interrupção no abastecimento de água" subtitle="02 de setembro de 2026 · 16:20"/><article className="detail-copy"><p>O abastecimento de água da Torre B será temporariamente interrompido para realização de uma manutenção programada.</p><p>A previsão é que o serviço seja normalizado até as 18h.</p><p>Agradecemos a compreensão.</p></article></section></ResidentLayout>
}

const serviceItems = [
  ['Reservas','Reserve e acompanhe áreas comuns.','/morador/reservas',CalendarCheck], ['Visitantes','Cadastre e acompanhe seus visitantes.','/morador/visitantes',UsersRound], ['Chamados','Abra e acompanhe suas solicitações.','/morador/chamados',Wrench],
]
export function MorePage() { const navigate=useNavigate(); return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Mais</h1><p>Acesse os serviços do seu condomínio.</p></div><h3 className="section-label">Serviços</h3><div className="service-list">{serviceItems.map(([title,text,to,Icon])=><button key={title} onClick={()=>navigate(to)}><Icon size={21}/><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={17}/></button>)}</div><h3 className="section-label">Pendências</h3><div className="service-list"><button onClick={()=>navigate('/morador/aprovacoes')}><CheckCircle2 size={21}/><span><strong>Aprovações</strong><small>Reservas aguardando sua análise.</small><em>2 pendentes</em></span><ChevronRight size={17}/></button></div></section></ResidentLayout> }

const listData = {
  reservas: { title:'Reservas', subtitle:'Gerencie suas reservas de áreas comuns.', action:'Nova reserva', tabs:['Próximas','Pendentes','Histórico'], section:'Próximas reservas', icon:CalendarCheck, items:[['Salão de Festas','15 de setembro de 2026','18:00 – 23:00','Confirmada'],['Churrasqueira','28 de setembro de 2026','12:00 – 17:00','Confirmada']] },
  visitantes: { title:'Visitantes', subtitle:'Gerencie o acesso dos seus visitantes.', action:'Autorizar visitante', tabs:['Próximos','Autorizados','Histórico'], section:'Próximos visitantes', icon:UserRound, items:[['Mariana Souza','Hoje','14:30','Autorizado'],['Lucas Oliveira','Amanhã','10:00','Autorizado']] },
  chamados: { title:'Chamados', subtitle:'Acompanhe suas solicitações ao condomínio.', action:'Abrir chamado', tabs:['Ativos','Resolvidos','Histórico'], section:'Chamados ativos', icon:Wrench, items:[['Vazamento na garagem','#CH-0028','Hoje · 09:42','Em análise'],['Lâmpada queimada','#CH-0024','30 de agosto · 18:15','Em atendimento']] },
  aprovacoes: { title:'Aprovações', subtitle:'Analise solicitações vinculadas à sua unidade.', tabs:['Pendentes','Histórico'], section:'Aguardando sua análise', icon:CalendarCheck, items:[['Salão de Festas','Carlos Silva · Apartamento 203 · Torre A','15 de setembro · 18:00','Aguardando aprovação'],['Salão de Festas','Mariana Silva · Apartamento 203 · Torre A','28 de setembro · 19:00','Aguardando aprovação']] },
}

export function ResidentListPage({ type }) {
  const data=listData[type]; const Icon=data.icon; const [tab,setTab]=useState(0); const [open,setOpen]=useState(false); const [success,setSuccess]=useState(false)
  return <ResidentLayout><section className="resident-page"><ResidentPageHeader title={data.title} subtitle={data.subtitle} action={data.action} onAction={()=>setOpen(true)}/><div className="mobile-tabs">{data.tabs.map((item,index)=><button className={tab===index?'active':''} onClick={()=>setTab(index)} key={item}>{item}</button>)}</div><h3 className="section-label">{data.section}</h3><div className="resident-card-list">{data.items.map(([title,line1,line2,status])=><button key={title+line1}><Icon size={21}/><span><strong>{title}</strong><small>{line1}</small><small>{line2}</small><StatusBadge tone={status.includes('Aguardando')||status.includes('análise')?'violet':'green'}>{status}</StatusBadge></span><ChevronRight size={16}/></button>)}</div></section><Modal open={open} title={data.action} onClose={()=>setOpen(false)} onConfirm={()=>{setOpen(false);setSuccess(true);setTimeout(()=>setSuccess(false),2400)}}><div className="form-grid"><label>Nome / assunto<input placeholder="Digite aqui"/></label><label>Data<input type="date"/></label><label>Horário<input type="time"/></label><label>Observação<textarea placeholder="Informações adicionais (opcional)"/></label>{type==='reservas'&&<p className="form-note">Reservas do Salão de Festas para residentes não proprietários serão enviadas ao proprietário para aprovação.</p>}</div></Modal>{success&&<div className="toast">Solicitação registrada com sucesso.</div>}</ResidentLayout>
}

export function ProfilePage() { const navigate=useNavigate(); return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Meu perfil</h1><p>Gerencie seus dados e sua conta.</p></div><div className="profile-card"><span>CS</span><div><strong>Carlos Silva</strong><small>Apartamento 203 · Torre A</small><StatusBadge>Residente</StatusBadge></div></div><h3 className="section-label">Dados pessoais</h3><div className="profile-list"><div><UserRound/><span><small>Nome</small><strong>Carlos Silva</strong></span></div><div><ShieldCheck/><span><small>CPF</small><strong>***.***.***-42</strong></span></div><div><Phone/><span><small>Telefone</small><strong>(81) 99999-9999</strong></span></div></div><h3 className="section-label">Dados da unidade</h3><div className="profile-list"><div><MapPin/><span><small>Condomínio</small><strong>Residencial Jardim</strong></span></div><div><TicketCheck/><span><small>Unidade</small><strong>Apartamento 203 · Torre A</strong></span></div></div><button className="logout-button" onClick={()=>navigate('/')}><LogOut size={18}/> Sair da conta</button></section></ResidentLayout> }
