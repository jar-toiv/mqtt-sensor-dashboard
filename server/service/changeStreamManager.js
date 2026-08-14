import EventEmitter from 'events'
import { connectToDatabase } from '../utils/db'
import logger from '../utils/logger'

class ChangeStreamManager extends EventEmitter {
  constructor() {
    super()
    this.startListening().catch((err) => {
      if (err.message?.includes('querySrv')) {
        logger.error('ChangeStreamManager: MongoDB DNS SRV lookup failed — check dns.setServers() in nuxt.config.ts')
      } else {
        logger.error(`ChangeStreamManager failed to start: ${err.message}`)
      }
    })
  }

  async startListening() {
    const db = await connectToDatabase()

    const collections = ['sites', 'locations', 'gateways', 'meters']

    logger.initProcess(`ChangeStreamManager watching: ${collections.join(', ')}`)

    collections.forEach((collectionName) => {
      const collection = db.collection(collectionName)
      const changeStream = collection.watch()

      changeStream.on('change', (change) => {
        logger.process(`${collectionName} change detected: ${JSON.stringify(change)}`)
        this.emit(collectionName + '-change', change)
      })

      changeStream.on('error', (error) => {
        logger.error(`Error in ${collectionName} change stream: ${error.message}`)
      })

      changeStream.on('close', () => {
        logger.warn(`${collectionName} change stream closed`)
      })
    })
  }
}

export const changeStreamManager = new ChangeStreamManager()