import { apiPost } from './api.js'

// Conclui o Setup Wizard: o backend gera as unidades e grava tudo numa transação.
// 201 = concluído; 409 = a configuração deste condomínio já tinha sido concluída.
export function salvarConfiguracaoInicial(payload, options = {}) {
  return apiPost('/condominios/configuracao-inicial', payload, { ...options, expectedStatus: 201 })
}

// Reexecução do assistente: acrescenta torres novas a um condomínio já configurado (nada existente muda).
// 201 = criadas; 409 = nome de torre já usado.
export function adicionarTorres(torres, options = {}) {
  return apiPost('/condominios/torres/lote', { torres }, { ...options, expectedStatus: 201 })
}
