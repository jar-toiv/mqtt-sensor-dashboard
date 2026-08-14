// The Socket.IO server runs on its own HTTP listener (port 3020) alongside Nitro.

import { defineNitroPlugin } from '#imports'
import { createServer } from 'http'
import { randomUUID } from 'crypto'
import { Server as SocketIOServer } from 'socket.io'
import { changeStreamManager } from '../service/changeStreamManager'
import { connectToDatabase } from '../utils/db'
import { registerIo, userRoom } from '../utils/realtime'
import logger from '../utils/logger'

const WS_PORT = Number(process.env.WS_PORT) || 3020
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000'

const COLLECTION_EVENTS = {
  sites: 'site-change',
  locations: 'location-change',
  gateways: 'gateway-change',
  meters: 'meter-change'
}

const SINGULAR_LABEL = {
  sites: 'site',
  locations: 'location',
  gateways: 'gateway',
  meters: 'meter'
}

const NAME_FIELD = {
  sites: 'siteName',
  locations: 'locationName',
  gateways: 'gatewayName',
  meters: 'meterName'
}

const REFERENCE_FIELDS = {
  siteId: 'sites',
  locationId: 'locations',
  gatewayId: 'gateways',
  locationIds: 'locations',
  gatewayIds: 'gateways',
  meterIds: 'meters'
}

const resolveDocumentName = async (collection, id) => {
  if (!id) return null
  const db = await connectToDatabase()
  const nameField = NAME_FIELD[collection]
  const doc = await db.collection(collection).findOne({ _id: id }, { projection: { [nameField]: 1 } })
  return doc?.[nameField] ?? null
}

const resolveNamesByCollection = async (targetCollection, ids) => {
  const db = await connectToDatabase()
  const nameField = NAME_FIELD[targetCollection]
  const docs = await db
    .collection(targetCollection)
    .find({ _id: { $in: ids } }, { projection: { [nameField]: 1 } })
    .toArray()
  return new Map(docs.map(doc => [doc._id.toString(), doc[nameField]]))
}

const resolveReferenceFields = async updatedFields => {
  if (!updatedFields) return updatedFields

  const referenceKeys = Object.keys(updatedFields).filter(key => REFERENCE_FIELDS[key])
  if (!referenceKeys.length) return updatedFields

  const idsByCollection = {}
  referenceKeys.forEach(key => {
    const targetCollection = REFERENCE_FIELDS[key]
    const ids = [].concat(updatedFields[key])
    idsByCollection[targetCollection] = (idsByCollection[targetCollection] || []).concat(ids)
  })

  const nameMaps = Object.fromEntries(
    await Promise.all(
      Object.entries(idsByCollection).map(async ([targetCollection, ids]) => [
        targetCollection,
        await resolveNamesByCollection(targetCollection, ids)
      ])
    )
  )

  const resolved = { ...updatedFields }
  referenceKeys.forEach(key => {
    const nameMap = nameMaps[REFERENCE_FIELDS[key]]
    const lookupName = id => nameMap.get(id.toString()) ?? `…${id.toString().slice(-6)}`
    const value = updatedFields[key]
    resolved[key] = Array.isArray(value) ? value.map(lookupName) : lookupName(value)
  })

  return resolved
}

const buildActivityEvent = async (collection, change) => {
  const id = change.documentKey?._id ?? null
  const updatedFields = change.updateDescription?.updatedFields ?? null

  const [documentName, resolvedFields] = await Promise.all([
    resolveDocumentName(collection, id),
    resolveReferenceFields(updatedFields)
  ])

  return {
    id: randomUUID(),
    collection: SINGULAR_LABEL[collection],
    operationType: change.operationType,
    documentId: id?.toString() ?? null,
    documentName,
    updatedFields: resolvedFields,
    timestamp: new Date().toISOString()
  }
}

export default defineNitroPlugin(nitroApp => {
  const httpServer = createServer()

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ['GET', 'POST']
    }
  })

  httpServer.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      logger.warn(
        `WebSocket port ${WS_PORT} is already in use — another dev server is probably still running`
      )
    } else {
      logger.error('WebSocket server error', error)
    }
  })

  httpServer.listen(WS_PORT, () => {
    logger.initProcess(`WebSocket server running on port ${WS_PORT}`)
  })

  registerIo(io)

  const changeHandlers = Object.fromEntries(
    Object.keys(COLLECTION_EVENTS).map(collection => [
      collection,
      change => {
        io.to('admin').emit(COLLECTION_EVENTS[collection], change)
        buildActivityEvent(collection, change)
          .then(event => io.to('admin').emit('data-activity', event))
          .catch(error => logger.error(`Failed to build activity event for ${collection}`, error))
      }
    ])
  )

  Object.entries(changeHandlers).forEach(([collection, handler]) => {
    changeStreamManager.on(`${collection}-change`, handler)
  })
  
  io.on('connection', socket => {
    logger.info(`WebSocket client connected: ${socket.id}`)

    socket.on('register', ({ userId, role }) => {
      if (userId) {
        socket.join(userRoom(userId))
      }

      if (role === 'admin') {
        socket.join('admin')
        logger.info(`User ${userId} joined the admin room`)
      }
    })

    const changeHandlers = Object.fromEntries(
      Object.keys(COLLECTION_EVENTS).map(collection => [
        collection,
        change => {
          io.to('admin').emit(COLLECTION_EVENTS[collection], change)
          buildActivityEvent(collection, change)
            .then(event => io.to('admin').emit('data-activity', event))
            .catch(error => logger.error(`Failed to build activity event for ${collection}`, error))
        }
      ])
    )

    Object.entries(changeHandlers).forEach(([collection, handler]) => {
      changeStreamManager.on(`${collection}-change`, handler)
    })

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`)

      Object.entries(changeHandlers).forEach(([collection, handler]) => {
        changeStreamManager.removeListener(`${collection}-change`, handler)
      })
    })
  })

  nitroApp.hooks.hook('close', async () => {
    logger.initProcess('Shutting down WebSocket server')
    io.close()
    await new Promise(resolve => httpServer.close(resolve))
  })
})
