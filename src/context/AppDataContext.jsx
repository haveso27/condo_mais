import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { initialAppData } from '../mocks/appData'
import { apiEnabled, getToken } from '../services/api'
import { loadSessionBeforeOperational } from '../features/session/sessionAccess'
import { notifySessionChanged } from '../services/sessionEvents'
import { alterarStatusMorador, carregarCadastros, carregarUsuarioLogado, criarTorre, excluirUnidade, salvarMorador, salvarUnidade, salvarUsuarioEquipe } from '../services/cadastrosApi'
import { avisosService } from '../services/avisosService'
import { equipeService, moradoresService, unidadesService } from '../services/cadastrosService'
import { chamadosService } from '../services/chamadosService'
import { encomendasService } from '../services/encomendasService'
import { carregarEncomendas, registrarEncomenda, registrarRetiradaEncomenda } from '../services/encomendasApi'
import { carregarComunicados, excluirComunicado, salvarComunicado } from '../services/comunicadosApi'
import { alterarStatusReserva, carregarAreasComuns, carregarReservas, solicitarReserva } from '../services/reservasApi'
import { abrirChamado, atualizarChamado, carregarCategoriasChamado, carregarChamado, carregarChamados, comentarChamado } from '../services/chamadosApi'
import { alterarStatusVisita, cadastrarVisita, carregarVisitas } from '../services/visitasApi'
import { alterarStatusAreaComum, areasService, salvarAreaComum } from '../services/areasComunsApi'
import { prestadoresService } from '../services/prestadoresService'
import { reservasService } from '../services/reservasService'
import { nowLabel, todayIso } from '../services/serviceUtils'
import { visitantesService, visitorEntryError } from '../services/visitantesService'

const AppDataContext = createContext(null)

// Módulos operacionais já ligados à API: cada coleção carrega em separado, e a falha de uma
// não derruba as outras nem os cadastros
const operationalLoaders = { packages: carregarEncomendas, notices: carregarComunicados, reservations: carregarReservas, areas: carregarAreasComuns, tickets: carregarChamados, ticketCategories: carregarCategoriasChamado, visitors: carregarVisitas }
const operationalKeys = Object.keys(operationalLoaders)

function historyEntry(type, reference, unit, user = 'João Oliveira') {
  const now = new Date()
  return { id: `HIS-${now.getTime()}-${Math.random()}`, timestamp: now.toISOString(), date: todayIso(now), time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), type, reference, unit, user }
}

// Com a API ligada, nada de demonstração aparece: cadastros e usuário logado vêm do servidor, e os
// módulos ainda não integrados começam vazios (em vez de mostrar dados fictícios como se fossem reais).
const emptyResident = { id: '', name: '', cpf: '', email: '', phone: '', tower: '', unit: '', relation: '', isOwner: false, status: 'ATIVO' }
export const apiInitialData = {
  ...initialAppData,
  currentResident: emptyResident,
  condominium: { ...initialAppData.condominium, name: '' },
  towers: [], units: [], residents: [], staff: [],
  visitors: [], providers: [], packages: [], reservations: [], notices: [], tickets: [], history: [], notifications: [], areas: [], ticketCategories: [],
}

export function AppDataProvider({ children }) {
  const [data, setData] = useState(() => apiEnabled() ? apiInitialData : initialAppData)
  // Coleções que vêm da API (cadastros): status idle (mock) | loading | success | error
  const initialRemote = { status: apiEnabled() ? 'loading' : 'idle', error: '' }
  const [remote, setRemote] = useState({ units: initialRemote, residents: initialRemote, staff: initialRemote, ...Object.fromEntries(operationalKeys.map((key) => [key, initialRemote])) })
  const cadastrosRequest = useRef(0)
  const operationalRequests = useRef(Object.fromEntries(operationalKeys.map((key) => [key, 0])))
  const sessionRequest = useRef(0)
  const operationalAuthorization = useRef({ allowed: false, token: '', sessionRequest: 0 })
  const dataRef = useRef(data)
  dataRef.current = data

  const actions = useMemo(() => {
    const setCadastrosStatus = (state) => setRemote((current) => ({ ...current, units: state, residents: state, staff: state }))
    const setCollectionStatus = (key, state) => setRemote((current) => ({ ...current, [key]: state }))

    const authorizationIsCurrent = (authorization) => authorization.allowed
      && authorization.token === getToken()
      && authorization.sessionRequest === sessionRequest.current

    // Recarrega torres, unidades e moradores; resposta obsoleta não sobrescreve a mais nova
    async function reloadCadastros({ silent = false } = {}) {
      const authorization = operationalAuthorization.current
      if (!authorizationIsCurrent(authorization)) return
      const request = ++cadastrosRequest.current
      if (!silent) setCadastrosStatus({ status: 'loading', error: '' })
      try {
        const { towers, units, residents, staff } = await carregarCadastros()
        if (request !== cadastrosRequest.current || !authorizationIsCurrent(authorization)) return
        setData((current) => ({ ...current, towers, units, residents, staff }))
        setCadastrosStatus({ status: 'success', error: '' })
      } catch (error) {
        if (request !== cadastrosRequest.current || !authorizationIsCurrent(authorization)) return
        setCadastrosStatus({ status: 'error', error: error.message })
      }
    }

    // Recarrega uma coleção operacional (encomendas, comunicados...); resposta obsoleta é descartada
    async function reloadCollection(key, { silent = false } = {}) {
      const authorization = operationalAuthorization.current
      if (!authorizationIsCurrent(authorization)) return
      const request = ++operationalRequests.current[key]
      if (!silent) setCollectionStatus(key, { status: 'loading', error: '' })
      try {
        const records = await operationalLoaders[key]()
        if (request !== operationalRequests.current[key] || !authorizationIsCurrent(authorization)) return
        setData((current) => ({ ...current, [key]: records }))
        setCollectionStatus(key, { status: 'success', error: '' })
      } catch (error) {
        if (request !== operationalRequests.current[key] || !authorizationIsCurrent(authorization)) return
        setCollectionStatus(key, { status: 'error', error: error.message })
      }
    }

    async function collectionCommand(key, run) {
      await run()
      await reloadCollection(key, { silent: true })
    }

    // Comandos na API: lançam ApiError (a tela mantém o formulário aberto) e, se der certo, recarregam
    async function command(run) {
      await run()
      await reloadCadastros({ silent: true })
    }

    // Confirma /usuarios/me antes de decidir se a sessão pode carregar dados operacionais.
    async function restoreSession() {
      const request = ++sessionRequest.current
      const token = getToken()
      const previousToken = operationalAuthorization.current.token
      if (previousToken && previousToken === token) notifySessionChanged()
      const isCurrent = () => request === sessionRequest.current && token === getToken()
      operationalAuthorization.current = { allowed: false, token, sessionRequest: request }
      ++cadastrosRequest.current
      operationalKeys.forEach((key) => { ++operationalRequests.current[key] })
      setData((current) => ({
        ...current,
        currentResident: emptyResident,
        condominium: { ...current.condominium, name: '' },
        towers: [], units: [], residents: [], staff: [],
        ...Object.fromEntries(operationalKeys.map((key) => [key, []])),
      }))
      setCadastrosStatus({ status: 'loading', error: '' })
      operationalKeys.forEach((key) => setCollectionStatus(key, { status: 'loading', error: '' }))
      const collectionErrors = {}
      try {
        const result = await loadSessionBeforeOperational({
          loadCurrentUser: carregarUsuarioLogado,
          loadOperationalData: async () => {
            if (!isCurrent()) return null
            operationalAuthorization.current = { allowed: true, token, sessionRequest: request }
            const [cadastros, ...collections] = await Promise.all([
              carregarCadastros(),
              ...operationalKeys.map((key) => operationalLoaders[key]().catch((error) => { collectionErrors[key] = error; return [] })),
            ])
            return { ...cadastros, ...Object.fromEntries(operationalKeys.map((key, index) => [key, collections[index]])) }
          },
          isCurrent,
        })
        if (!isCurrent() || result.status === 'stale') {
          const staleError = new Error('A sessão mudou durante a verificação. Tente novamente.')
          staleError.status = 409
          throw staleError
        }
        const { currentResident, condominiumName, condominiumModel } = result.session
        const operationalAllowed = ['operational', 'operational-error'].includes(result.status)
        operationalAuthorization.current = { allowed: operationalAllowed, token, sessionRequest: request }
        setData((current) => ({
          ...current,
          currentResident,
          // O modelo (VERTICAL, HORIZONTAL, EDIFICIO) decide se o admin pode acrescentar torres pelo assistente
          condominium: { ...current.condominium, name: condominiumName, model: condominiumModel || '' },
          ...(result.status === 'operational' ? result.operational : {}),
        }))
        setCadastrosStatus(result.status === 'operational-error'
          ? { status: 'error', error: result.error.message }
          : { status: 'success', error: '' })
        operationalKeys.forEach((key) => {
          const failure = result.status === 'operational-error' ? result.error : collectionErrors[key]
          setCollectionStatus(key, failure ? { status: 'error', error: failure.message } : { status: 'success', error: '' })
        })
        return result
      } catch (error) {
        if (!isCurrent()) throw error
        operationalAuthorization.current = { allowed: false, token, sessionRequest: request }
        setCadastrosStatus({ status: 'error', error: error.message })
        operationalKeys.forEach((key) => setCollectionStatus(key, { status: 'error', error: error.message }))
        throw error
      }
    }

    return {
    reloadCadastros,
    reloadCollection,
    reloadSession: restoreSession,
    reloadAll: restoreSession,
    createTower: (name) => command(() => criarTorre(name)),
    saveUnitRemote: (form, editingId) => command(() => salvarUnidade(form, editingId, dataRef.current.towers)),
    deleteUnitRemote: (id) => command(() => excluirUnidade(id)),
    saveResidentRemote: (form, editingId) => command(() => salvarMorador(form, editingId, dataRef.current.units)),
    setResidentStatusRemote: (id, status) => command(() => alterarStatusMorador(id, status)),
    saveStaffRemote: (form, editingId) => command(() => salvarUsuarioEquipe(form, editingId)),
    setStaffStatusRemote: (id, status) => command(() => alterarStatusMorador(id, status)),
    addPackageRemote: (form) => collectionCommand('packages', () => registrarEncomenda(form, dataRef.current.units)),
    withdrawPackageRemote: (id) => collectionCommand('packages', () => registrarRetiradaEncomenda(id)),
    saveNoticeRemote: (form, editingId) => collectionCommand('notices', () => salvarComunicado(form, editingId, dataRef.current.towers, dataRef.current.tickets)),
    deleteNoticeRemote: (id) => collectionCommand('notices', () => excluirComunicado(id)),
    addReservationRemote: (form) => collectionCommand('reservations', () => solicitarReserva(form, dataRef.current.areas)),
    setReservationStatusRemote: (id, status) => collectionCommand('reservations', () => alterarStatusReserva(id, status)),
    openTicketRemote: (form) => collectionCommand('tickets', () => abrirChamado(form, { units: dataRef.current.units, categories: dataRef.current.ticketCategories })),
    updateTicketRemote: (id, patch) => collectionCommand('tickets', () => atualizarChamado(id, patch)),
    commentTicketRemote: (id, comment) => collectionCommand('tickets', () => comentarChamado(id, comment)),
    saveAreaRemote: (form, editingId) => collectionCommand('areas', () => salvarAreaComum(form, editingId)),
    setAreaActiveRemote: (id, active) => collectionCommand('areas', () => alterarStatusAreaComum(id, active)),
    saveVisitorRemote: (form, asResident = false) => collectionCommand('visitors', () => cadastrarVisita(form, { units: dataRef.current.units, asResident })),
    setVisitorStatusRemote: (id, status) => collectionCommand('visitors', () => alterarStatusVisita(id, status)),
    // Detalhe com histórico: não altera a lista, só devolve o chamado completo para o modal
    loadTicketDetail: (id) => carregarChamado(id),
    addVisitor(payload, source = 'PORTARIA') {
      let created
      setData((current) => {
        const result = visitantesService.criar(current.visitors, payload, source); created = result.record
        return { ...current, visitors: result.records, history: [historyEntry('Visitante registrado', created.name, `${created.unit} · ${created.tower}`), ...current.history] }
      })
      return created
    },
    setVisitorStatus(id, status) {
      setData((current) => {
        const item = current.visitors.find((visitor) => visitor.id === id)
        if (status === 'ENTROU' && visitorEntryError(item)) return current
        return { ...current, visitors: visitantesService.alterarStatus(current.visitors, id, status), history: [historyEntry(`Visitante ${status.toLowerCase()}`, item?.name || id, `${item?.unit || ''} · ${item?.tower || ''}`), ...current.history] }
      })
    },
    addProvider(payload) {
      setData((current) => { const result = prestadoresService.criar(current.providers, payload); return { ...current, providers: result.records, history: [historyEntry('Prestador registrado', result.record.name, result.record.location), ...current.history] } })
    },
    setProviderStatus(id, status) {
      setData((current) => { const item = current.providers.find((provider) => provider.id === id); return { ...current, providers: prestadoresService.alterarStatus(current.providers, id, status), history: [historyEntry(`Prestador ${status.toLowerCase()}`, item?.name || id, item?.location || ''), ...current.history] } })
    },
    addPackage(payload) {
      setData((current) => {
        const resident = current.residents.find((item) => item.tower === payload.tower && item.unit === payload.unit)?.name || 'Morador não identificado'
        const result = encomendasService.criar(current.packages, payload, resident)
        const notification = { id: `NOT-${Date.now()}`, tower: payload.tower, unit: payload.unit, title: 'Nova encomenda recebida', text: `A encomenda ${result.record.id} está aguardando retirada.`, createdAt: result.record.receivedAt, read: false }
        return { ...current, packages: result.records, notifications: [notification, ...current.notifications], history: [historyEntry('Encomenda registrada', `${result.record.id} · ${resident}`, `${payload.unit} · ${payload.tower}`), ...current.history] }
      })
    },
    setPackageStatus(id, status) {
      setData((current) => { const item = current.packages.find((entry) => entry.id === id); return { ...current, packages: encomendasService.alterarStatus(current.packages, id, status), history: [historyEntry(`Encomenda ${status.toLowerCase()}`, id, `${item?.unit || ''} · ${item?.tower || ''}`), ...current.history] } })
    },
    addReservation(payload) { setData((current) => { if (!current.condominium.allowResidentBookings) return current; const result = reservasService.criar(current.reservations, payload, current.currentResident); return { ...current, reservations: result.records } }) },
    setReservationStatus(id, status) { setData((current) => ({ ...current, reservations: reservasService.alterarStatus(current.reservations, id, status), notifications: [{ id: `NOT-${Date.now()}`, unit: current.reservations.find((item) => item.id === id)?.unit, title: `Reserva ${status === 'CONFIRMADA' ? 'aprovada' : status.toLowerCase()}`, text: `A reserva ${id} foi atualizada.`, createdAt: nowLabel(), read: false }, ...current.notifications] })) },
    addNotice(payload) { setData((current) => { const result = avisosService.criar(current.notices, payload); return { ...current, notices: result.records } }) },
    updateNotice(id, patch) { setData((current) => ({ ...current, notices: avisosService.atualizar(current.notices, id, patch) })) },
    addTicket(payload) { setData((current) => { const result = chamadosService.criar(current.tickets, payload); return { ...current, tickets: result.records } }) },
    updateTicket(id, patch) { setData((current) => ({ ...current, tickets: chamadosService.atualizar(current.tickets, id, patch) })) },
    addResident(payload) { setData((current) => { const result = moradoresService.criar(current.residents, payload); return { ...current, residents: result.records } }) },
    updateResident(id, patch) { setData((current) => ({ ...current, residents: moradoresService.atualizar(current.residents, id, patch) })) },
    addStaff(payload) { setData((current) => ({ ...current, staff: equipeService.criar(current.staff || [], payload).records })) },
    updateStaff(id, patch) { setData((current) => ({ ...current, staff: equipeService.atualizar(current.staff || [], id, patch) })) },
    addArea(payload) { setData((current) => ({ ...current, areas: areasService.criar(current.areas || [], payload).records })) },
    updateArea(id, patch) { setData((current) => ({ ...current, areas: areasService.atualizar(current.areas || [], id, patch) })) },
    addUnit(payload) { setData((current) => { const result = unidadesService.criar(current.units, payload); return { ...current, units: result.records } }) },
    updateUnit(id, patch) { setData((current) => ({ ...current, units: unidadesService.atualizar(current.units, id, patch) })) },
    saveCondominium(payload) { setData((current) => ({ ...current, condominium: { ...current.condominium, ...payload } })) },
    }
  }, [])

  useEffect(() => {
    if (!apiEnabled()) return
    if (!getToken()) return
    actions.reloadSession().catch(() => {})
  }, [actions])

  return <AppDataContext.Provider value={{ data, actions, remote }}>{children}</AppDataContext.Provider>
}

// Para quem também é renderizado fora do provider (testes de tela isolada): devolve null em vez de falhar
export function useOptionalAppData() {
  return useContext(AppDataContext)
}

export function useAppData() {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData precisa estar dentro de AppDataProvider')
  return value
}
