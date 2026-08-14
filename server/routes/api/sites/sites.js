import { defineEventHandler } from '#imports'
import { connectToDatabase } from '../../../utils/db'

export default defineEventHandler(async () => {
    const db = await connectToDatabase()
    const sitesCollection = db.collection('sites')
    const sites = await sitesCollection.find().toArray()
    return sites
})



