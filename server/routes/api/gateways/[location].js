

import { defineEventHandler} from '#imports'
import { connectToDatabase } from '../../../utils/db';
import { ObjectId } from 'mongodb';
import logger from '../../../utils/logger';

export default defineEventHandler(async (event)=> {
    const location = event.context.params.location
    logger.debug(`Fetching gateways for location ${location}`)
    const db = await connectToDatabase()
    const gatewaysCollection = db.collection('gateways')
    const gateways = await gatewaysCollection.find({locationId: new ObjectId(location)}).toArray()
    return gateways
})