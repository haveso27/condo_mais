import { useEffect, useId, useRef } from 'react'
import { statusLabel } from '../services/serviceUtils'
import { errorField } from '../config/uiPresentation'
import NumberStepper from './NumberStepper'
import SearchableSelect from './SearchableSelect'
import TimeSelect from './TimeSelect'

export default function DynamicForm({ fields, values, onChange, error, columns = true }) {
  const formId = useId()
  const root = useRef(null)
  const invalidKey = errorField(fields, values, error)
  useEffect(() => {
    if (!error) return
    const target = root.current?.querySelector('[aria-invalid="true"], [role="alert"]')
    target?.focus()
    target?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [error])
  return (
    <div ref={root} className={columns ? 'form-grid' : 'form-stack'}>
      {error && !invalidKey && <p className="form-error" role="alert" tabIndex={-1}>{error}</p>}
      {fields.map((field) => {
        const invalid = invalidKey === field.key
        const id = `${formId}-${field.key}`
        const common = {
          id, name: field.key, 'aria-required': field.required || undefined,
          'aria-invalid': invalid || undefined, 'aria-describedby': invalid ? `${id}-error` : undefined,
          value: values[field.key] ?? '',
          onChange: (event) => onChange(field.key, field.type === 'checkbox' ? event.target.checked : event.target.value),
        }
        if (field.type === 'checkbox') return <label className="form-checkbox" key={field.key} htmlFor={id}><input id={id} name={field.key} type="checkbox" checked={Boolean(values[field.key])} onChange={common.onChange} /> {field.label}</label>
        return <label key={field.key} htmlFor={id}><span>{field.label}{field.required && <span className="required-mark" aria-hidden="true"> *</span>}</span>
          {field.type === 'select' ? <select {...common}><option value="">Selecione</option>{field.options.map((option) => <option key={option} value={option}>{option === option.toUpperCase() ? statusLabel(option) : option}</option>)}</select>
            : field.type === 'search' ? <SearchableSelect {...common} options={field.options || []} onChange={(next) => onChange(field.key, next)} placeholder={field.placeholder} />
              : field.type === 'timeselect' ? <TimeSelect {...common} onChange={(next) => onChange(field.key, next)} />
                : field.type === 'stepper' ? <NumberStepper {...common} label={field.label} min={field.min} max={field.max} onChange={(next) => onChange(field.key, next)} />
                  : field.type === 'textarea' ? <textarea {...common} placeholder={field.placeholder || ''} />
              : <input {...common} type={field.type || 'text'} placeholder={field.placeholder || ''} />}
          {invalid && <span id={`${id}-error`} className="field-error" role="alert">{error}</span>}
        </label>
      })}
    </div>
  )
}
