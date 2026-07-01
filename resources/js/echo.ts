import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

interface EchoConfig {
    key: string;
    cluster: string;
    wsHost: string;
    wsPort: number;
    wssPort: number;
    forceTLS: boolean;
}

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo?: Echo<'pusher'>;
        EchoConfig?: EchoConfig;
    }
}

window.Pusher = Pusher;

function getDevelopmentEchoConfig(): EchoConfig {
    const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1';
    const port = Number(import.meta.env.VITE_PUSHER_PORT ?? 80);

    return {
        key: import.meta.env.VITE_PUSHER_APP_KEY ?? '',
        cluster,
        wsHost: import.meta.env.VITE_PUSHER_HOST || `ws-${cluster}.pusher.com`,
        wsPort: port,
        wssPort: Number(import.meta.env.VITE_PUSHER_PORT ?? 443),
        forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
    };
}

function resolveEchoConfig(): EchoConfig | undefined {
    if (window.EchoConfig) {
        return window.EchoConfig;
    }

    if (import.meta.env.DEV) {
        return getDevelopmentEchoConfig();
    }

    return undefined;
}

try {
    const config = resolveEchoConfig();

    if (config?.key) {
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
        console.warn(
            import.meta.env.PROD
                ? 'Echo runtime config missing. Real-time updates are disabled.'
                : 'Pusher app key not found. Real-time updates are disabled.',
        );
    }
} catch (e) {
    console.error('Pusher connection failed. Falling back to refresh-based updates.', e);
}
