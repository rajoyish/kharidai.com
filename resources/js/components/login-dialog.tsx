import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { redirect } from '@/routes/google';

/**
 * The Google wordmark "G". Drawn inline rather than pulled from an icon set:
 * the four brand colours are fixed by Google's guidelines and must not inherit
 * `currentColor` the way every other icon in the header does.
 */
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 48 48"
            aria-hidden
            focusable="false"
        >
            <path
                fill="#4285F4"
                d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
            />
            <path
                fill="#34A853"
                d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A21.99 21.99 0 0 0 24 46z"
            />
            <path
                fill="#FBBC05"
                d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
            />
            <path
                fill="#EA4335"
                d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
            />
        </svg>
    );
}

/**
 * Sign-in as a modal, so a visitor authenticates without losing the page they
 * were reading. There is nothing to submit here — Google is the only provider —
 * so the dialog is a single action rather than a form.
 */
export function LoginDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Coming back through the browser's back button can restore this component
    // from the bfcache with its state intact, which would leave the button
    // stuck mid-redirect on a page that is plainly no longer redirecting.
    useEffect(() => {
        const reset = (event: PageTransitionEvent) => {
            if (event.persisted) {
                setIsRedirecting(false);
            }
        };

        window.addEventListener('pageshow', reset);

        return () => window.removeEventListener('pageshow', reset);
    }, []);

    const continueWithGoogle = () => {
        setIsRedirecting(true);

        // OAuth needs a full-page navigation (the redirect leaves the app for
        // Google), so this bypasses the Inertia router on purpose — only the
        // URL comes from Wayfinder. The current path rides along so the
        // callback returns the visitor to where they opened the modal, with a
        // freshly rendered page carrying their signed-in session.
        window.location.href = redirect.url({
            query: {
                redirect_to: window.location.pathname + window.location.search,
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Log in to your account</DialogTitle>
                    <DialogDescription>
                        Use your Google account to log in or register. We'll
                        bring you straight back to this page.
                    </DialogDescription>
                </DialogHeader>

                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    disabled={isRedirecting}
                    onClick={continueWithGoogle}
                >
                    {isRedirecting ? (
                        <Spinner />
                    ) : (
                        <GoogleIcon className="size-5" />
                    )}
                    {isRedirecting ? 'Redirecting…' : 'Continue with Google'}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
