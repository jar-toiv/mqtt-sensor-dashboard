const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

const threshold = import.meta.dev ? LEVELS.debug : -1

function emit(level, method, args) {
  if (LEVELS[level] > threshold) return
  console[method](`[${level}]`, ...args)
}

export const clientLogger = {
  error: (...args) => emit('error', 'error', args),
  warn: (...args) => emit('warn', 'warn', args),
  info: (...args) => emit('info', 'info', args),
  debug: (...args) => emit('debug', 'log', args)
}

export default clientLogger
