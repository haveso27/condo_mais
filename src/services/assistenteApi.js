import { ApiError, apiPost } from './api.js'

// Assistente virtual do morador (POST /assistente/mensagens). A API não guarda a conversa: o histórico
// vive no componente e vai inteiro a cada pergunta (o servidor só usa as mensagens mais recentes).
export const MAX_CARACTERES = 2000

// { role: 'user' | 'assistant', text } -> MensagemAssistenteDTO { papel, texto }
export function toMensagens(historico) {
  return historico.map(({ role, text }) => ({ papel: role === 'user' ? 'USUARIO' : 'ASSISTENTE', texto: text }))
}

export async function perguntarAoAssistente(historico, options) {
  try {
    const { resposta } = await apiPost('/assistente/mensagens', { mensagens: toMensagens(historico) }, options)
    return resposta
  } catch (error) {
    // 503: assistente desligado no servidor (sem chave da Claude API), ocupado ou fora do ar
    if (error instanceof ApiError && error.status === 503) throw new ApiError(503, 'O assistente está indisponível no momento. Tente novamente mais tarde.')
    throw error
  }
}
