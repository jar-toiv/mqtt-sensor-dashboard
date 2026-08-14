import { MongoClient } from 'mongodb'
import { useRuntimeConfig } from '#imports'
import logger from './logger'

const config = useRuntimeConfig()
const client = new MongoClient(config.mongodbUri)
let dbInstance = null;

export const connectToDatabase = async () => {
    if(!dbInstance) {
        await client.connect()
        dbInstance = client.db('sensorDataDB')
        logger.initProcess('MongoDB connected (sensorDataDB)')
    }

    return dbInstance
}