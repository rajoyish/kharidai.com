import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';

export default function Login() {
    return (
        <>
            <SeoHead title="Log in" />

            <div className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <Button
                        type="button"
                        className="w-fit"
                        onClick={() => (window.location.href = '/auth/google')}
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
