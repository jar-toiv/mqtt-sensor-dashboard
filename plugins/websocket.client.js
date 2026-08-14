import { defineNuxtPlugin, useRuntimeConfig } from '#imports';
import { io } from 'socket.io-client';
import { useSitesStore } from '../store/sites'
import { useLocationsStore } from '../store/locations'
import { useGatewaysStore } from '../store/gateways';
import { useMetersStore } from '../store/meters';
import logger from '../utils/clientLogger';

export default defineNuxtPlugin(nuxtApp => {
const config = useRuntimeConfig();

const websocketUri = config.public.websocketUri || 'http://127.0.0.1:3020';
    let socket

    nuxtApp.provide('initializeWebSocket', (user) => {
        if(socket && socket.connected) {
            logger.debug('WebSocket already connected');
            return socket
        }

        socket = io(websocketUri, {
            autoConnect: true,
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            logger.info(`WebSocket connected for user ${user.email || user.username}`);
            socket.emit('register', { userId: user._id, role: user.role });
        });

        socket.on('site-change', (change) => {
            logger.debug('Site change received', change);
            const sitesStore = useSitesStore();
            sitesStore.applySiteUpdate(change.siteId, change.updatedFields);

        });

        socket.on('location-change', (change) => {
            logger.debug('Location change received', change);
            const locationsStore = useLocationsStore()
            locationsStore.applyLocationUpdate(change.locationId, change.updatedFields)
        })

        socket.on('gateway-change', (change) => {
            logger.debug('Gateway change received', change);
            const gatewaysStore = useGatewaysStore()
            gatewaysStore.applyGatewayUpdate(change.gatewayId, change.updatedFields)
        })

        socket.on('meter-change', (change) => {
            logger.debug('Meter change received', change);
            const metersStore = useMetersStore()
            metersStore.applyMetersUpdate(change.meterId, change.updatedFields)
        })


        socket.on('connect_error', (error) => logger.error('WebSocket connect error', error));
        socket.on('disconnect', (reason) => logger.warn(`WebSocket disconnected: ${reason}`));

        nuxtApp.provide('cleanupWebSocket', () => {
            if (!socket) return;
            socket.close();
            logger.info('WebSocket connection closed');
        });

        return socket

    });

    logger.debug('WebSocket client plugin initialized');
});
