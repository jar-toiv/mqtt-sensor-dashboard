import { defineEventHandler} from '#imports'
import { connectToDatabase } from '../../../utils/db'

export default defineEventHandler(async () => {
    const db = await connectToDatabase()
    const metersCollection = db.collection('meters')
    const meters = await metersCollection.find().toArray()
    return meters
})



