import { useId } from 'react'

// Lista pesquisável: o campo filtra as opções enquanto a pessoa digita e o teclado escolhe (datalist
// nativo, sem script de foco). O valor só vale se for uma das opções; quem valida é o formulário.
export default function SearchableSelect({ options = [], value, onChange, placeholder = 'Digite para buscar', ...inputProps }) {
  const listId = useId()
  return <>
    <input {...inputProps} type="search" autoComplete="off" list={listId} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist>
  </>
}

export const optionExists = (options, value) => options.includes(value)
