import { defineEventHandler } from '#imports'
import { connectToDatabase } from '../../../utils/db'

export default defineEventHandler(async () => {
    const db = await connectToDatabase()
    const locationsCollection = db.collection('locations')
    const locations = await locationsCollection.find().toArray()
    return locations
})



