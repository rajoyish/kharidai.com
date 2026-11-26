import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock,
    Hourglass,
    House,
    Lock,
    RefreshCw,
    Search,
    ShoppingBag,
    TriangleAlert,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import { index as myOrders } from '@/routes/orders';

type ErrorStatus = 403 | 404 | 419 | 429 | 500 | 503;

type ErrorCopy = {
    title: string;
    description: string;
    Icon: LucideIcon;
    /** Offer a reload rather than "go back": the page itself can recover. */
    canRetry: boolean;
};

const COPY: Record<ErrorStatus, ErrorCopy> = {
    403: {
        title: 'You don’t have access to this page',
        description:
            'This page is limited to certain accounts. If you think you should be able to see it, sign in with the right account or contact us.',
        Icon: Lock,
        canRetry: false,
    },
    404: {
        title: 'We couldn’t find that page',
        description:
            'The link may be broken, or the page may have moved or been removed.',
        Icon: Search,
        canRetry: false,
    },
    419: {
        title: 'This page expired',
        description:
            'You were away for a while, so the page timed out for your security. Refresh it and try again.',
        Icon: Hourglass,
        canRetry: true,
    },
    429: {
        title: 'Too many requests',
        description:
            'You’ve made a lot of requests in a short time. Wait a moment, then try again.',
        Icon: Clock,
        canRetry: true,
    },
    500: {
        title: 'Something went wrong on our side',
        description:
            'It isn’t you. We’ve been notified and are looking into it. Please try again in a moment.',
        Icon: TriangleAlert,
        canRetry: true,
    },
    503: {
        title: 'We’ll be right back',
        description:
            'Kharidai is down for a short maintenance. Please check back in a few minutes.',
        Icon: Wrench,
        canRetry: true,
    },
};

/**
 * The page every error response renders (see `Inertia::handleExceptionsUsing`
 * in AppServiceProvider). It stands alone, without the storefront or admin
 * chrome, because an error can happen before the data those layouts need
 * exists. Server errors render without shared data at all, so `auth` may be
 * missing here.
 */
export default function ErrorPage({ status }: { status: number }) {
    const { auth } = usePage<{ auth?: { user?: unknown } }>().props;
    const copy = COPY[status as ErrorStatus] ?? COPY[500];
    const isSignedIn = !!auth?.user;

    return (
        <>
            <Head title={`${status} · ${copy.title}`}>
                <meta name="robots" content="noindex" />
            </Head>

            <main className="relative isolate flex min-h-screen flex-col overflow-hidden hero-aurora bg-background text-foreground">
                <div className="pointer-events-none absolute inset-0 -z-10 hero-grid" />

                <header className="container mx-auto px-6 py-6">
                    <Link
                        href={home()}
                        aria-label="Kharidai home"
                        className="inline-block"
                    >
                        <AppLogo className="h-9 w-auto" />
                    </Link>
                </header>

                <section className="container mx-auto flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
                    <span className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary-text shadow-sm">
                        <copy.Icon className="size-6" aria-hidden />
                    </span>

                    <p
                        aria-hidden
                        className="bg-linear-to-b from-foreground to-foreground/30 bg-clip-text text-8xl leading-none font-bold tracking-tight text-transparent sm:text-9xl"
                    >
                        {status}
                    </p>

                    <h1 className="mt-6 max-w-xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                        <span className="sr-only">Error {status}: </span>
                        {copy.title}
                    </h1>
                    <p className="mt-3 max-w-md text-base text-pretty text-muted-foreground">
                        {copy.description}
                    </p>

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        {copy.canRetry ? (
                            <Button
                                size="lg"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCw aria-hidden />
                                {status === 419 ? 'Refresh page' : 'Try again'}
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft aria-hidden />
                                Go back
                            </Button>
                        )}

                        <Button
                            size="lg"
                            variant={copy.canRetry ? 'outline' : 'default'}
                            asChild
                        >
                            <Link href={home()}>
                                <House aria-hidden />
                                Home
                            </Link>
                        </Button>

                        {/* Another customer's order answers 404, so a signed-in
                            visitor who lands here is often looking for one of
                            their own. */}
                        {status === 404 && isSignedIn && (
                            <Button size="lg" variant="ghost" asChild>
                                <Link href={myOrders()}>
                                    <ShoppingBag aria-hidden />
                                    My orders
                                </Link>
                            </Button>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}
