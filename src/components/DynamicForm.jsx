export default function DynamicForm({ fields, values, onChange, error, columns = true }) {
  return (
    <div className={columns ? 'form-grid' : 'form-stack'}>
      {fields.map((field) => {
        const common = { id: field.key, name: field.key, value: values[field.key] ?? '', onChange: (event) => onChange(field.key, field.type === 'checkbox' ? event.target.checked : event.target.value) }
        if (field.type === 'checkbox') return <label className="form-checkbox" key={field.key}><input type="checkbox" checked={Boolean(values[field.key])} onChange={common.onChange} /> {field.label}</label>
        return <label key={field.key}>{field.label}{field.required && <span className="required-mark"> *</span>}
          {field.type === 'select' ? <select {...common}><option value="">Selecione</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
            : field.type === 'textarea' ? <textarea {...common} placeholder={field.placeholder || ''} />
              : <input {...common} type={field.type || 'text'} placeholder={field.placeholder || ''} />}
        </label>
      })}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
