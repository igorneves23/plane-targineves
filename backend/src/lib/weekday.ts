// O servidor roda em UTC (padrão do container), mas a igreja está em
// horário de Brasília. Sem isso, um card às 21h de terça (horário local)
// vira 00h de quarta em UTC, e Date.getDay() no servidor devolve o dia
// errado — sempre calcule o dia da semana nesse fuso, nunca no do servidor.
const CHURCH_TIMEZONE = 'America/Sao_Paulo'

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export function weekdayInChurchTimeZone(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: CHURCH_TIMEZONE, weekday: 'short' }).formatToParts(date)
  const short = parts.find((p) => p.type === 'weekday')!.value
  return WEEKDAY_INDEX[short]
}
