import dotenv from 'dotenv'
import path from 'path'
import winston from 'winston'

dotenv.config({ path: path.resolve('.env') })

const { combine, timestamp, printf, colorize, errors, splat, json } = winston.format

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  initProcess: 3,
  process: 4,
  debug: 5
}

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  initProcess: 'cyan',
  process: 'magenta',
  debug: 'blue'
}

winston.addColors(colors)

const LOG_DIR = process.env.LOG_DIR || 'logs'

const onlyLevel = level => winston.format(info => (info.level === level ? info : false))()

const levelFile = (filename, level) =>
  new winston.transports.File({
    filename: path.join(LOG_DIR, filename),
    level,
    format: combine(onlyLevel(level), json()),
    handleExceptions: false
  })

const consoleFormat = printf(({ level, message, timestamp: ts, stack }) => {
  const line = `${ts} ${level}: ${message}`
  return stack ? `${line}\n${stack}` : line
})

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    errors({ stack: true }),
    splat(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'sensor-dashboard' },
  transports: [
    levelFile('error.log', 'error'),
    levelFile('warnings.log', 'warn'),
    levelFile('process.log', 'process'),
    levelFile('initProcess.log', 'initProcess'),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: json()
    })
  ],
  exitOnError: false
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize({ all: true }), consoleFormat)
    })
  )
}

logger.exceptions.handle(new winston.transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') }))
logger.rejections.handle(new winston.transports.File({ filename: path.join(LOG_DIR, 'rejections.log') }))

export default logger
export { logger }
