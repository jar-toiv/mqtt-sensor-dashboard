import mongoose from 'mongoose'
import { useRuntimeConfig, defineNitroPlugin } from '#imports'
import logger from '../utils/logger'

export default defineNitroPlugin(async () => {
  if (mongoose.connection.readyState === 0) {
    const config = useRuntimeConfig()
    await mongoose.connect(config.mongodbUri, { dbName: 'sensorDataDB' })
    logger.initProcess(`Mongoose connected, readyState: ${mongoose.connection.readyState}`)
  }
})