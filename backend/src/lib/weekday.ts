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

/** Hora do domingo em que a semana vira e as tarefas semanais renovam. */
export const RESET_HOUR = 23

/** Ano/mês/dia/hora que o relógio da igreja marca num dado instante. */
function churchWallTime(at: Date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: CHURCH_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const p: Record<string, number> = {}
  for (const part of dtf.formatToParts(at)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }
  // hour12:false devolve 24 à meia-noite em algumas engines
  return { year: p.year, month: p.month, day: p.day, hour: p.hour % 24, minute: p.minute, second: p.second }
}

/**
 * Instante real correspondente a uma hora do relógio da igreja. Descobre o
 * offset do fuso no próprio instante em vez de assumir -03:00 fixo, então
 * continua correto se o horário de verão voltar.
 */
function instantFromChurchWallTime(year: number, month: number, day: number, hour: number, minute = 0): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  let guess = new Date(wanted)
  // Duas passadas convergem — a segunda corrige a virada de offset quando o
  // primeiro chute cai do outro lado de uma mudança de horário.
  for (let i = 0; i < 2; i++) {
    const w = churchWallTime(guess)
    const offset = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - guess.getTime()
    guess = new Date(wanted - offset)
  }
  return guess
}

/**
 * Primeiro domingo às 23h (relógio da igreja) estritamente depois de `from`.
 * É o momento em que as tarefas semanais se renovam — ver recurrence.job.ts.
 */
export function nextSundayResetAfter(from: Date): Date {
  const w = churchWallTime(from)
  let { year, month, day } = w

  for (let guard = 0; guard < 15; guard++) {
    // Dia da semana da data de parede, sem envolver o fuso do servidor.
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0) {
      const candidate = instantFromChurchWallTime(year, month, day, RESET_HOUR)
      if (candidate > from) return candidate
    }
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    year = next.getUTCFullYear()
    month = next.getUTCMonth() + 1
    day = next.getUTCDate()
  }
  throw new Error('nextSundayResetAfter: não convergiu')
}
