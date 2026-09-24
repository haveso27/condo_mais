// Apresentação local: não define enums, DTOs ou contratos de backend.
const statusIntents = {
  ATIVO: 'success', AUTORIZADO: 'success', CONFIRMADA: 'success', CONCLUIDA: 'success',
  RESOLVIDO: 'success', RETIRADA: 'success', LIVRE: 'success',
  ENTROU: 'info', EM_ANALISE: 'info', EM_ATENDIMENTO: 'info', OCUPADO: 'info',
  PENDENTE: 'warning', AGUARDANDO_APROVACAO: 'warning', AGUARDANDO_RETIRADA: 'warning',
  ESPERADO: 'warning', ABERTO: 'warning', RESERVADO: 'warning', ALTA: 'warning',
  RECUSADO: 'danger', RECUSADA: 'danger', URGENTE: 'danger',
  SAIU: 'neutral', ENCERRADO: 'neutral', INATIVO: 'neutral', EXPIRADO: 'neutral',
  CANCELADA: 'neutral', CANCELADO: 'neutral', DEVOLVIDA: 'neutral', BAIXA: 'neutral', NORMAL: 'info',
}

export const statusIntent = (status) => statusIntents[status] || 'neutral'

export function emptyMessage(collection, filtered = false) {
  const names = {
    visitors: ['Nenhum visitante', 'cadastrado'], providers: ['Nenhum prestador', 'cadastrado'],
    packages: ['Nenhuma encomenda', 'registrada'], reservations: ['Nenhuma reserva', 'registrada'],
    notices: ['Nenhum comunicado', 'disponível'], tickets: ['Nenhum chamado', 'registrado'],
    residents: ['Nenhum morador', 'cadastrado'], units: ['Nenhuma unidade', 'cadastrada'],
    history: ['Nenhuma operação', 'registrada'], approvals: ['Nenhuma solicitação de aprovação', 'disponível'],
  }
  const [name, ending] = names[collection] || ['Nenhum registro', 'disponível']
  return filtered ? `${name} corresponde aos filtros selecionados.` : `${name} ${ending}.`
}

export function confirmationMessage(record, label, status) {
  if (!record) return ''
  const identity = [record.name || record.title || record.area, record.id].filter(Boolean).join(' · ')
  const location = [record.unit || record.number || record.location, record.tower].filter(Boolean).join(' — ')
  const period = record.area ? [record.date, record.startTime, record.endTime].filter(Boolean).join(' · ') : ''
  const consequences = {
    ENTROU: 'A entrada será registrada e a pessoa constará como presente.',
    SAIU: 'A saída será registrada e a pessoa deixará a lista de presentes.',
    AUTORIZADO: 'O visitante ficará autorizado dentro do período informado.',
    RECUSADO: 'A autorização de acesso será recusada.',
    RETIRADA: 'A encomenda deixará a lista de itens aguardando retirada.',
    CANCELADA: 'A reserva será cancelada e deixará de ocupar esse horário.',
    RECUSADA: 'A solicitação de reserva será recusada.',
    CONFIRMADA: 'A reserva será confirmada para o período informado.',
    INATIVO: 'O cadastro ficará inativo; os registros anteriores serão mantidos.',
    ATIVO: 'O cadastro voltará a ficar ativo.',
    ENCERRADO: 'O registro será marcado como encerrado.',
  }
  return `${label}: ${identity}${location ? ` · Local/unidade: ${location}` : ''}${period ? ` · Período: ${period}` : ''}? ${consequences[status] || 'O registro passará para o estado indicado na ação.'}`
}

// Associa as mensagens já existentes a controles; não adiciona validações de domínio.
export function errorField(fields, values, message) {
  if (!message) return undefined
  const missing = fields.find((field) => field.required && !String(values[field.key] ?? '').trim())
  if (missing && /preencha/i.test(message)) return missing.key
  const mappings = [
    [/CPF/i, 'cpf'], [/e-mail/i, 'email'], [/telefone/i, 'phone'],
    [/data final|término da autorização/i, 'endDate'],
    [/horário|disponibilidade|conflito/i, 'endTime'],
    [/já existe uma unidade/i, 'number'], [/unidade existente/i, 'unit'],
    [/selecione a Torre/i, 'tower'],
  ]
  return mappings.find(([pattern, key]) => pattern.test(message) && fields.some((field) => field.key === key))?.[1]
}
