import { defineEventHandler } from '#imports'
import { connectToDatabase } from '../../../utils/db'

export default defineEventHandler(async () => {
    const db = await connectToDatabase()
    const gatewaysCollection = db.collection('gateways')
    const gateways = await gatewaysCollection.find().toArray()
    return gateways
})



