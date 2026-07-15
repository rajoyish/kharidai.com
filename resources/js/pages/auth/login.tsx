import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { redirect } from '@/routes/google';

export default function Login() {
    return (
        <>
            <SeoHead title="Log in" />

            <div className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <Button
                        type="button"
                        className="mx-auto w-fit"
                        // OAuth needs a full-page navigation (the redirect
                        // leaves the app for Google), so this bypasses the
                        // Inertia router on purpose — only the URL comes from
                        // Wayfinder.
                        onClick={() => (window.location.href = redirect.url())}
                    >
                        Sign in with Google
                    </Button>
                </div>
            </div>
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Use your Google account to log in or register',
};
