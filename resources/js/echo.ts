import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'pusher'>;
        EchoConfig?: {
            key: string;
            cluster: string;
            wsHost: string;
            wsPort: number;
            wssPort: number;
            forceTLS: boolean;
        };
    }
}

window.Pusher = Pusher;

try {
    const config = window.EchoConfig || {
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
        wsHost: import.meta.env.VITE_PUSHER_HOST ? import.meta.env.VITE_PUSHER_HOST : `ws-${import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1'}.pusher.com`,
        wsPort: import.meta.env.VITE_PUSHER_PORT ?? 80,
        wssPort: import.meta.env.VITE_PUSHER_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
    };

    if (config.key) {
        window.Echo = new Echo<'pusher'>({
            broadcaster: 'pusher',
            key: config.key,
            cluster: config.cluster,
            wsHost: config.wsHost,
            wsPort: config.wsPort,
            wssPort: config.wssPort,
            forceTLS: config.forceTLS,
            enabledTransports: ['ws', 'wss'],
        });
    } else {
        console.warn("Pusher app key not found. Real-time updates are disabled.");
    }
} catch (e) {
    console.error("Pusher connection failed. Falling back to refresh-based updates.", e);
}
