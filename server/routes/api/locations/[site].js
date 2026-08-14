import { defineEventHandler} from '#imports'
import { connectToDatabase } from '../../../utils/db';
import { ObjectId } from 'mongodb';

export default defineEventHandler(async (event)=> {
    const site = event.context.params.site
    const db = await connectToDatabase()
    const locationsCollection = db.collection('locations')
    const locations = await locationsCollection.find({siteId: new ObjectId(site)}).toArray()
    return locations
})