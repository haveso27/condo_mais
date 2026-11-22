import { useAppData } from '../context/AppDataContext'

// Aviso dos painéis com a API ligada: carregando ou falhou (com "Tentar novamente" para a coleção que falhou)
export default function LoadNotice({ state, empty = null }) {
  const { actions } = useAppData()
  if (state.errors.length) return <div className="painel__vazio" role="alert">{state.errors.map(({ key, message }) => <p key={key}>{message} <button type="button" className="text-link" onClick={() => (key === 'units' ? actions.reloadCadastros() : actions.reloadCollection(key))}>Tentar novamente</button></p>)}</div>
  if (state.loading) return <p className="painel__vazio" role="status">Carregando...</p>
  return empty
}
