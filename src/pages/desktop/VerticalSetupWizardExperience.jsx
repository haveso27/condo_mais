import { cloneElement, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronLeft, ChevronRight, CircleAlert, Copy, Plus, Trash2 } from 'lucide-react'
import SetupLayout from '../../layouts/SetupLayout'
import BuildingPreview from '../../components/BuildingPreview'
import ConfirmDialog from '../../components/ConfirmDialog'
import NumberStepper from '../../components/NumberStepper'
import {
  MAX_TOWERS,
  PREDEFINED_COMMON_AREAS,
  SETUP_LIMITS,
  suggestTowerName,
  SETUP_STEPS,
  buildSetupPayload,
  createInitialWizardState,
  getTowerUnitCount,
  getTowerUnitPreview,
  getTotalUnitCount,
  validateStepDetails,
  wizardReducer,
} from '../../features/setupWizard/verticalSetup'
import { useOptionalAppData } from '../../context/AppDataContext'
import { ApiError } from '../../services/api'
import { carregarSessaoAtual } from '../../services/sessionApi'
import { salvarConfiguracaoInicial } from '../../services/setupApi'

const stateOptions = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

function findError(errors, field) {
  return errors.find((error) => error.field === field)?.message
}

function Field({ label, id, fieldKey, error, children, hint }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ')
  const control = cloneElement(children, {
    id,
    'data-field-key': fieldKey,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
  })
  return <div className={`setup-field${error ? ' setup-field--invalid' : ''}`}>
    <label htmlFor={id}>{label}</label>{control}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <small className="field-error" id={`${id}-error`} role="alert">{error}</small>}
  </div>
}

function CondominiumStep({ condominium, nameLocked, dispatch, errors }) {
  const update = (field) => (event) => dispatch({ type: 'UPDATE_CONDOMINIUM', field, value: event.target.value })
  return <div className="setup-form-grid">
    <Field label="Nome do condomínio" id="setup-condominium-name" fieldKey="condominium.name" error={findError(errors, 'condominium.name')} hint={nameLocked ? 'Cadastrado pela administração da plataforma. Só ela altera nome e CNPJ.' : undefined}><input value={condominium.name} onChange={update('name')} readOnly={nameLocked} placeholder="Ex.: Condomínio Parque das Flores" /></Field>
    <Field label="Endereço" id="setup-condominium-address" fieldKey="condominium.address" error={findError(errors, 'condominium.address')}><input value={condominium.address} onChange={update('address')} placeholder="Rua, número e complemento" /></Field>
    <Field label="Cidade" id="setup-condominium-city" fieldKey="condominium.city" error={findError(errors, 'condominium.city')}><input value={condominium.city} onChange={update('city')} /></Field>
    <Field label="Estado" id="setup-condominium-state" fieldKey="condominium.state" error={findError(errors, 'condominium.state')}><select value={condominium.state} onChange={update('state')}><option value="">Selecione</option>{stateOptions.map((state) => <option value={state} key={state}>{state}</option>)}</select></Field>
  </div>
}

function ModelStep() {
  return <div className="setup-models">
    <article className="setup-model setup-model--selected"><span className="setup-model__check"><Check size={17} /></span><Building2 size={30} /><h3>Condomínio Vertical</h3><p>Organização por torres, andares e apartamentos.</p><strong>Selecionado</strong></article>
    <article className="setup-model setup-model--disabled" aria-disabled="true"><h3>Condomínio Horizontal</h3><p>Ruas e casas serão disponibilizadas em uma evolução futura.</p><strong>Em breve</strong></article>
    <article className="setup-model setup-model--disabled" aria-disabled="true"><h3>Edifício Pequeno</h3><p>Configuração simplificada será disponibilizada futuramente.</p><strong>Em breve</strong></article>
  </div>
}

const COMMON_UNITS_PER_FLOOR = ['1', '2', '3', '4', '5', '6', '8', '10', '12']
const FLOOR_OPTIONS = Array.from({ length: 20 }, (_, index) => String(index + 1))
const SEPARATOR_OPTIONS = [['', 'Sem separador'], ['-', 'Hífen ( - )'], ['.', 'Ponto ( . )'], ['/', 'Barra ( / )']]

// Lista com as quantidades comuns e a opção "Personalizado", que mostra o controle numérico.
// Um valor fora da lista (incomum, mas legítimo) nunca é recusado: vira personalizado.
function UnitsPerFloorControl({ value, onChange, ...fieldProps }) {
  const [custom, setCustom] = useState(false)
  const isCustom = custom || !COMMON_UNITS_PER_FLOOR.includes(String(value))
  return <div className="setup-stack">
    <select {...fieldProps} value={isCustom ? 'custom' : String(value)} onChange={(event) => {
      if (event.target.value === 'custom') setCustom(true)
      else { setCustom(false); onChange(event.target.value) }
    }}>
      {COMMON_UNITS_PER_FLOOR.map((option) => <option key={option} value={option}>{option} {option === '1' ? 'apartamento' : 'apartamentos'}</option>)}
      <option value="custom">Personalizado…</option>
    </select>
    {isCustom && <NumberStepper id={`${fieldProps.id}-custom`} aria-label="Apartamentos por andar (personalizado)" label="apartamentos por andar" min={1} max={SETUP_LIMITS.unitsPerFloor} value={value} onChange={onChange} />}
  </div>
}

function TowerCard({ tower, index, suggestion, canRemove, canDuplicate, dispatch, errors, onRemove }) {
  const update = (field) => (event) => dispatch({ type: 'UPDATE_TOWER', id: tower.id, field, value: event.target.value })
  const set = (field) => (value) => dispatch({ type: 'UPDATE_TOWER', id: tower.id, field, value })
  const key = (field) => `tower.${tower.id}.${field}`
  const id = (field) => `setup-${tower.id}-${field}`
  const preview = getTowerUnitPreview(tower)
  const floorChoices = FLOOR_OPTIONS.includes(String(tower.firstFloor)) ? FLOOR_OPTIONS : [...FLOOR_OPTIONS, String(tower.firstFloor)]
  const separatorChoices = SEPARATOR_OPTIONS.some(([value]) => value === tower.separator) ? SEPARATOR_OPTIONS : [...SEPARATOR_OPTIONS, [tower.separator, tower.separator]]
  const displayName = tower.name.trim() || `Torre ${index + 1}`
  return <article className="setup-tower-card">
    <header><div><span>Torre {index + 1}</span><h3>{tower.name.trim() || 'Nova torre'}</h3></div><div className="setup-tower-actions">{canDuplicate && <button className="setup-icon-button setup-icon-button--neutral" type="button" aria-label={`Duplicar ${displayName}`} title="Duplicar torre: copia a configuração" onClick={() => dispatch({ type: 'DUPLICATE_TOWER', id: tower.id })}><Copy size={18} /></button>}{canRemove && <button className="setup-icon-button" type="button" aria-label={`Remover ${displayName}`} onClick={() => onRemove(tower)}><Trash2 size={18} /></button>}</div></header>
    <div className="setup-form-grid setup-form-grid--tower">
      <Field label="Nome da torre" id={id('name')} fieldKey={key('name')} error={findError(errors, key('name'))} hint="Sugestão automática; você pode editar."><input value={tower.name} onChange={update('name')} placeholder={`Ex.: ${suggestion}`} /></Field>
      <Field label="Quantidade de andares" id={id('floorCount')} fieldKey={key('floorCount')} error={findError(errors, key('floorCount'))}><NumberStepper label="andares" min={1} max={SETUP_LIMITS.floorCount} value={tower.floorCount} onChange={set('floorCount')} /></Field>
      <Field label="Apartamentos por andar" id={id('unitsPerFloor')} fieldKey={key('unitsPerFloor')} error={findError(errors, key('unitsPerFloor'))}><UnitsPerFloorControl value={tower.unitsPerFloor} onChange={set('unitsPerFloor')} /></Field>
      <Field label="Primeiro andar" id={id('firstFloor')} fieldKey={key('firstFloor')} error={findError(errors, key('firstFloor'))}><select value={tower.firstFloor} onChange={update('firstFloor')}>{floorChoices.map((floor) => <option key={floor} value={floor}>{floor}º andar</option>)}</select></Field>
      <Field label="Primeiro apartamento do andar" id={id('firstUnit')} fieldKey={key('firstUnit')} error={findError(errors, key('firstUnit'))} hint="Sugestão: 1, para iniciar em 01, 02, 03…"><NumberStepper label="primeiro apartamento" min={1} max={SETUP_LIMITS.firstUnit} value={tower.firstUnit} onChange={set('firstUnit')} /></Field>
      <Field label="Quantidade de dígitos do apartamento" id={id('unitDigits')} fieldKey={key('unitDigits')} error={findError(errors, key('unitDigits'))} hint="2 dígitos geram 01; 3 dígitos geram 001."><select value={tower.unitDigits} onChange={update('unitDigits')}><option value="1">1 dígito</option><option value="2">2 dígitos</option><option value="3">3 dígitos</option><option value="4">4 dígitos</option></select></Field>
      <Field label="Separador entre andar e apartamento" id={id('separator')} fieldKey={key('separator')} hint="Com hífen, por exemplo, o resultado será 1-01."><select value={tower.separator} onChange={update('separator')}>{separatorChoices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
    </div>
    <p className="setup-pattern">Exemplo da numeração: <strong>{preview.first || '—'}</strong> até <strong>{preview.last || '—'}</strong> · {preview.total} unidades</p>
  </article>
}

// Descartar torres nunca é silencioso: remover uma ou reduzir a quantidade pede confirmação
function TowersStep({ towers, dispatch, errors }) {
  const [pending, setPending] = useState(null)
  const removing = pending?.type === 'count' ? towers.slice(pending.count) : pending?.tower ? [pending.tower] : []
  const confirmRemoval = () => {
    if (pending.type === 'count') dispatch({ type: 'SET_TOWER_COUNT', count: pending.count })
    else dispatch({ type: 'REMOVE_TOWER', id: pending.tower.id })
    setPending(null)
  }
  const changeCount = (value) => {
    const count = Math.min(MAX_TOWERS, Math.max(1, Number.parseInt(value, 10) || 1))
    if (count < towers.length) setPending({ type: 'count', count })
    else dispatch({ type: 'SET_TOWER_COUNT', count })
  }
  return <div className="setup-stack">
    <div className="setup-field setup-towers-count"><label htmlFor="setup-tower-count">Quantidade de torres</label><NumberStepper id="setup-tower-count" label="torres" min={1} max={MAX_TOWERS} value={String(towers.length)} onChange={changeCount} /></div>
    {towers.map((tower, index) => <TowerCard key={tower.id} tower={tower} index={index} suggestion={suggestTowerName(towers)} canRemove={towers.length > 1} canDuplicate={towers.length < MAX_TOWERS} dispatch={dispatch} errors={errors} onRemove={(item) => setPending({ type: 'remove', tower: item })} />)}
    <button type="button" className="setup-add-button" onClick={() => dispatch({ type: 'ADD_TOWER' })} disabled={towers.length >= MAX_TOWERS}><Plus size={18} /> Adicionar outra torre</button>
    <ConfirmDialog open={Boolean(pending)} title="Descartar torres?" message={`Os dados de ${removing.map((tower) => tower.name.trim() || 'torre sem nome').join(', ')} serão descartados. Nada foi gravado ainda, mas será preciso preencher novamente se você mudar de ideia.`} destructive confirmLabel="Descartar" onCancel={() => setPending(null)} onConfirm={confirmRemoval} />
  </div>
}

export function UnitsStep({ towers }) {
  const total = getTotalUnitCount(towers)
  const [activeId, setActiveId] = useState(towers[0]?.id)
  const active = towers.find((tower) => tower.id === activeId) || towers[0]
  return <div className="setup-stack">
    <p className="setup-preview-guidance">Gire o prédio e toque em um andar para conferir a numeração antes de salvar. Nada é gravado até você concluir no resumo.</p>
    {towers.length > 1 && <div className="building-tabs" role="group" aria-label="Torre exibida na prévia">{towers.map((tower, index) => <button type="button" key={tower.id} aria-pressed={tower.id === active.id} className={tower.id === active.id ? 'is-active' : undefined} onClick={() => setActiveId(tower.id)}>{tower.name.trim() || `Torre ${index + 1}`}<small>{getTowerUnitCount(tower)} unid.</small></button>)}</div>}
    <BuildingPreview key={active.id} tower={active} totalUnits={total} towerCount={towers.length} />
  </div>
}

function AreasStep({ draft, dispatch }) {
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')
  const inputRef = useRef(null)
  function addCustom() {
    const trimmed = name.trim()
    if (!trimmed) { setLocalError('Informe o nome da área personalizada.'); inputRef.current?.focus(); return }
    const used = [...draft.commonAreas, ...draft.customAreas.map((area) => area.name)].some((item) => item.localeCompare(trimmed, 'pt-BR', { sensitivity: 'base' }) === 0)
    if (used) { setLocalError('Já existe uma área comum com esse nome.'); inputRef.current?.focus(); return }
    dispatch({ type: 'ADD_CUSTOM_AREA', area: { id: `custom-${Date.now()}`, name: trimmed, reservable: true } })
    setName(''); setLocalError('')
  }
  return <div className="setup-stack"><div className="setup-area-grid">{PREDEFINED_COMMON_AREAS.map((area) => { const checked = draft.commonAreas.includes(area); return <label className={`setup-area-option${checked ? ' setup-area-option--selected' : ''}`} key={area}><input type="checkbox" checked={checked} onChange={() => dispatch({ type: 'TOGGLE_AREA', name: area })} /><span>{area}</span>{checked && <Check size={18} />}</label> })}</div>
    <section className="setup-custom-area"><h3>Área personalizada</h3><p>Adicione uma área que não aparece nas opções acima.</p><label htmlFor="setup-custom-area-name">Nome da área</label><div><input ref={inputRef} id="setup-custom-area-name" value={name} aria-invalid={localError ? 'true' : undefined} aria-describedby={localError ? 'setup-custom-area-error' : undefined} onChange={(event) => { setName(event.target.value); setLocalError('') }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }} placeholder="Ex.: Espaço coworking" /><button type="button" className="secondary-button" onClick={addCustom}><Plus size={17} /> Adicionar</button></div>{localError && <p className="field-error" id="setup-custom-area-error" role="alert">{localError}</p>}
      {draft.customAreas.length > 0 && <ul>{draft.customAreas.map((area) => <li key={area.id}><span>{area.name}</span><button type="button" aria-label={`Remover ${area.name}`} onClick={() => dispatch({ type: 'REMOVE_CUSTOM_AREA', id: area.id })}><Trash2 size={16} /></button></li>)}</ul>}
    </section></div>
}

function SectionHeading({ children, onEdit, label }) {
  return <div className="setup-summary-heading"><h3>{children}</h3><button type="button" className="setup-edit-button" onClick={onEdit} aria-label={`Editar ${label}`}>Editar</button></div>
}

function SummaryStep({ draft, totalUnits, submitting, submitError, onSubmit, onEdit }) {
  const areas = [...draft.commonAreas, ...draft.customAreas.map((area) => area.name)]
  return <div className="setup-summary"><div className="setup-review-notice"><CircleAlert size={20} /><p><strong>Confira antes de concluir.</strong> Ao concluir, o condomínio é criado com estas torres, unidades e áreas comuns, e a configuração inicial não pode ser refeita por aqui.</p></div>
    <section><SectionHeading onEdit={() => onEdit(0)} label="dados do condomínio">Condomínio</SectionHeading><dl><div><dt>Nome</dt><dd>{draft.condominium.name}</dd></div><div><dt>Endereço</dt><dd>{draft.condominium.address}</dd></div><div><dt>Cidade/UF</dt><dd>{draft.condominium.city} — {draft.condominium.state}</dd></div><div><dt>Modelo</dt><dd>Condomínio Vertical</dd></div></dl></section>
    <section><SectionHeading onEdit={() => onEdit(2)} label="torres e unidades">Estrutura residencial</SectionHeading><div className="setup-summary-towers">{draft.towers.map((tower) => <div key={tower.id}><strong>{tower.name}</strong><span>{tower.floorCount} andares</span><span>{tower.unitsPerFloor} unidades por andar</span><span>{getTowerUnitCount(tower)} unidades geradas</span><span>Numeração: {getTowerUnitPreview(tower).first} … {getTowerUnitPreview(tower).last}</span></div>)}</div><p className="setup-summary-total"><strong>{draft.towers.length}</strong> {draft.towers.length === 1 ? 'torre' : 'torres'} · <strong>{totalUnits}</strong> unidades no total</p></section>
    <section><SectionHeading onEdit={() => onEdit(4)} label="áreas comuns">Áreas comuns</SectionHeading>{areas.length ? <div className="setup-summary-tags">{areas.map((area) => <span key={area}>{area}</span>)}</div> : <p className="muted">Nenhuma área comum selecionada.</p>}</section>
    {submitError && <div className="setup-errors" role="alert"><CircleAlert size={20} /><div><strong>Não foi possível concluir a configuração.</strong><p>{submitError}</p></div></div>}
    <button type="button" className="desktop-primary setup-review-button" onClick={onSubmit} disabled={submitting} aria-busy={submitting ? 'true' : undefined}>{submitting ? 'Salvando configuração…' : <><Check size={18} /> Concluir configuração</>}</button>
  </div>
}

export default function VerticalSetupWizardExperience({ loadCurrentUser = carregarSessaoAtual, saveSetup = salvarConfiguracaoInicial, reloadSession }) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialWizardState)
  const [errors, setErrors] = useState([])
  const [nameLocked, setNameLocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const formRef = useRef(null)
  const navigate = useNavigate()
  const appData = useOptionalAppData()
  const restoreSession = reloadSession || appData?.actions.reloadSession
  const totalUnits = getTotalUnitCount(state.draft.towers)

  // O nome vem do cadastro feito pelo MASTER; sem ele (falha na consulta), o campo continua editável
  useEffect(() => {
    let current = true
    Promise.resolve().then(() => loadCurrentUser()).then((user) => {
      const name = typeof user?.condominioNome === 'string' ? user.condominioNome.trim() : ''
      if (!current || !name) return
      dispatch({ type: 'UPDATE_CONDOMINIUM', field: 'name', value: name })
      setNameLocked(true)
    }, () => {})
    return () => { current = false }
  }, [loadCurrentUser])

  async function submitSetup() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await saveSetup(buildSetupPayload(state.draft))
    } catch (error) {
      // 409: a configuração já tinha sido concluída (outro envio ou outra aba); o painel está liberado
      if (!(error instanceof ApiError && error.status === 409)) {
        setSubmitError(error?.message || 'Tente novamente em instantes.')
        setSubmitting(false)
        return
      }
    }
    // A sessão foi aberta com o condomínio PENDENTE, quando torres e unidades não são carregadas.
    // Sem recarregar, o painel abriria com as listas vazias até um F5.
    try { await restoreSession?.() } catch { /* o painel consulta a sessão de novo ao abrir */ }
    navigate('/admin', { replace: true })
  }

  useEffect(() => {
    if (!errors.length) return
    const firstField = errors.find((error) => error.field)?.field
    const target = firstField ? formRef.current?.querySelector(`[data-field-key="${firstField}"]`) : formRef.current?.querySelector('.setup-errors')
    target?.focus()
    target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [errors])

  function goTo(step) {
    if (step > state.step) {
      const stepErrors = validateStepDetails(state.step, state.draft)
      if (stepErrors.length) { setErrors(stepErrors); return }
    }
    setErrors([])
    dispatch({ type: 'GO_TO_STEP', step })
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const content = [
    <CondominiumStep condominium={state.draft.condominium} nameLocked={nameLocked} dispatch={dispatch} errors={errors} />,
    <ModelStep />,
    <TowersStep towers={state.draft.towers} dispatch={dispatch} errors={errors} />,
    <UnitsStep towers={state.draft.towers} />,
    <AreasStep draft={state.draft} dispatch={dispatch} />,
    <SummaryStep draft={state.draft} totalUnits={totalUnits} submitting={submitting} submitError={submitError} onSubmit={submitSetup} onEdit={goTo} />,
  ][state.step]

  return <SetupLayout steps={SETUP_STEPS} currentStep={state.step} maxVisited={state.maxVisited} onStepChange={goTo}><section className="setup-page">
    <div className="setup-page-meta"><span className="setup-draft-badge">Rascunho</span><p>Suas informações ficam nesta tela e só são salvas quando você concluir a configuração no resumo.</p></div>
    <form ref={formRef} className="setup-card" onSubmit={(event) => { event.preventDefault(); if (state.step < SETUP_STEPS.length - 1) goTo(state.step + 1) }} noValidate><header><span>Etapa {state.step + 1} de {SETUP_STEPS.length}</span><h2>{SETUP_STEPS[state.step]}</h2></header>
      {errors.length > 0 && <div className="setup-errors" role="alert" tabIndex="-1"><CircleAlert size={20} /><div><strong>Revise os campos desta etapa:</strong><ul>{errors.map((error) => <li key={`${error.field}-${error.message}`}>{error.message}</li>)}</ul></div></div>}
      <div className="setup-card__body">{content}</div><footer>{state.step > 0 ? <button className="secondary-button" type="button" onClick={() => goTo(state.step - 1)}><ChevronLeft size={18} /> Voltar</button> : <span />}<div className="setup-card-footer-actions">{state.maxVisited === SETUP_STEPS.length - 1 && state.step < SETUP_STEPS.length - 1 && <button className="secondary-button" type="button" onClick={() => goTo(SETUP_STEPS.length - 1)}>Voltar ao resumo</button>}{state.step < SETUP_STEPS.length - 1 && <button className="desktop-primary" type="submit">Continuar <ChevronRight size={18} /></button>}</div></footer></form>
  </section></SetupLayout>
}
