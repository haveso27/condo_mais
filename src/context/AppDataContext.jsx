import { createContext, useContext, useMemo, useState } from 'react'
import { initialAppData } from '../mocks/appData'
import { avisosService } from '../services/avisosService'
import { moradoresService, unidadesService } from '../services/cadastrosService'
import { chamadosService } from '../services/chamadosService'
import { encomendasService } from '../services/encomendasService'
import { prestadoresService } from '../services/prestadoresService'
import { reservasService } from '../services/reservasService'
import { nowLabel, todayIso } from '../services/serviceUtils'
import { visitantesService, visitorEntryError } from '../services/visitantesService'

const AppDataContext = createContext(null)

function historyEntry(type, reference, unit, user = 'João Oliveira') {
  const now = new Date()
  return { id: `HIS-${now.getTime()}-${Math.random()}`, timestamp: now.toISOString(), date: todayIso(now), time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), type, reference, unit, user }
}

export function AppDataProvider({ children }) {
  const [data, setData] = useState(initialAppData)

  const actions = useMemo(() => ({
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
    addUnit(payload) { setData((current) => { const result = unidadesService.criar(current.units, payload); return { ...current, units: result.records } }) },
    updateUnit(id, patch) { setData((current) => ({ ...current, units: unidadesService.atualizar(current.units, id, patch) })) },
    saveCondominium(payload) { setData((current) => ({ ...current, condominium: { ...current.condominium, ...payload } })) },
  }), [])

  return <AppDataContext.Provider value={{ data, actions }}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData precisa estar dentro de AppDataProvider')
  return value
}
