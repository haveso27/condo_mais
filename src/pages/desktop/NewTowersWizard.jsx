import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react'
import SetupLayout from '../../layouts/SetupLayout'
import { TowersStep, UnitsStep } from './VerticalSetupWizardExperience'
import {
  NEW_TOWERS_STEPS,
  buildTowersPayload,
  createNewTowersState,
  getTotalUnitCount,
  getTowerUnitCount,
  getTowerUnitPreview,
  validateNewTowersStep,
  wizardReducer,
} from '../../features/setupWizard/verticalSetup'
import { useAppData } from '../../context/AppDataContext'
import { adicionarTorres } from '../../services/setupApi'

// Reexecução do Setup Wizard (CONDO-13.4): o admin acrescenta torres novas com as mesmas etapas de torres,
// prévia e resumo. As torres já cadastradas aparecem só para consulta e nunca são alteradas.
export default function NewTowersWizard({ save = adicionarTorres }) {
  const { data, actions } = useAppData()
  const [state, dispatch] = useReducer(wizardReducer, undefined, createNewTowersState)
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const formRef = useRef(null)
  const navigate = useNavigate()
  const existingNames = (data.towers || []).map((tower) => tower.name).filter(Boolean)
  const existingKey = existingNames.join('|')
  const towers = state.draft.towers
  const totalUnits = getTotalUnitCount(towers)

  // As torres existentes chegam com os cadastros; as sugestões de nome passam a evitá-las
  useEffect(() => { dispatch({ type: 'SET_EXISTING_TOWERS', names: existingKey ? existingKey.split('|') : [] }) }, [existingKey])

  useEffect(() => {
    if (!errors.length) return
    const firstField = errors.find((error) => error.field)?.field
    const target = firstField ? formRef.current?.querySelector(`[data-field-key="${firstField}"]`) : formRef.current?.querySelector('.setup-errors')
    target?.focus()
  }, [errors])

  function goTo(step) {
    if (step > state.step) {
      const stepErrors = validateNewTowersStep(state.step, state)
      if (stepErrors.length) { setErrors(stepErrors); return }
    }
    setErrors([])
    dispatch({ type: 'GO_TO_STEP', step })
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    if (submitting) return
    const stepErrors = validateNewTowersStep(1, state)
    if (stepErrors.length) { setErrors(stepErrors); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      await save(buildTowersPayload(towers))
    } catch (error) {
      setSubmitError(error?.message || 'Tente novamente em instantes.')
      setSubmitting(false)
      return
    }
    // Recarrega torres e unidades para a tela de Unidades já abrir com as novas
    try { await actions.reloadSession?.() } catch { /* a tela consulta de novo ao abrir */ }
    navigate('/admin/unidades', { replace: true })
  }

  const existing = <div className="setup-existing-towers"><strong>Torres já cadastradas</strong>{existingNames.length ? <p>{existingNames.join(', ')} — continuam como estão; nada delas é alterado.</p> : <p>Nenhuma torre cadastrada ainda.</p>}</div>
  const content = [
    <>{existing}<TowersStep towers={towers} dispatch={dispatch} errors={errors} existingNames={existingNames} /></>,
    <UnitsStep towers={towers} />,
    <div className="setup-summary">
      <div className="setup-review-notice"><CircleAlert size={20} /><p><strong>Confira antes de adicionar.</strong> Serão criadas só as torres abaixo, com as unidades livres. As torres e unidades existentes, com moradores e históricos, não mudam.</p></div>
      <section><h3>Torres novas</h3><div className="setup-summary-towers">{towers.map((tower) => { const preview = getTowerUnitPreview(tower); return <div key={tower.id}><strong>{tower.name}</strong><span>{getTowerUnitCount(tower)} unidades</span><span>{preview.first} a {preview.last}</span></div> })}</div><p className="muted">Total: {totalUnits} unidades em {towers.length} {towers.length === 1 ? 'torre' : 'torres'}.</p></section>
      {submitError && <div className="setup-errors" role="alert"><CircleAlert size={20} /><div><strong>Não foi possível adicionar as torres.</strong><p>{submitError}</p></div></div>}
      <button type="button" className="desktop-primary setup-review-button" onClick={submit} disabled={submitting} aria-busy={submitting ? 'true' : undefined}>{submitting ? 'Adicionando torres…' : <><Check size={18} /> Adicionar torres</>}</button>
    </div>,
  ][state.step]

  return <SetupLayout steps={NEW_TOWERS_STEPS} currentStep={state.step} maxVisited={state.maxVisited} onStepChange={goTo}><section className="setup-page">
    <div className="setup-page-meta"><span className="setup-draft-badge">Rascunho</span><p>Nada é gravado até você confirmar no resumo. <Link to="/admin/unidades">Voltar para Unidades</Link></p></div>
    <form ref={formRef} className="setup-card" onSubmit={(event) => { event.preventDefault(); if (state.step < NEW_TOWERS_STEPS.length - 1) goTo(state.step + 1) }} noValidate><header><span>Etapa {state.step + 1} de {NEW_TOWERS_STEPS.length}</span><h2>{NEW_TOWERS_STEPS[state.step]}</h2></header>
      {errors.length > 0 && <div className="setup-errors" role="alert" tabIndex="-1"><CircleAlert size={20} /><div><strong>Revise os campos desta etapa:</strong><ul>{errors.map((error) => <li key={`${error.field}-${error.message}`}>{error.message}</li>)}</ul></div></div>}
      <div className="setup-card__body">{content}</div>
      <footer>{state.step > 0 ? <button className="secondary-button" type="button" onClick={() => goTo(state.step - 1)}><ChevronLeft size={18} /> Voltar</button> : <span />}{state.step < NEW_TOWERS_STEPS.length - 1 && <button className="desktop-primary" type="submit">Continuar <ChevronRight size={18} /></button>}</footer>
    </form>
  </section></SetupLayout>
}
