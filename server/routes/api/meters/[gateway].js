import { defineEventHandler} from '#imports'
import { connectToDatabase } from '../../../utils/db';
import { ObjectId } from 'mongodb';

export default defineEventHandler(async (event)=> {
    const gateway = event.context.params.gateway
    const db = await connectToDatabase()
    const metersCollection = db.collection('meters')
    const meters = await metersCollection.find({gatewayId: new ObjectId(gateway)}).toArray()

    return meters
})