import { Form, Head, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { MobileNumberInput } from '@/components/mobile-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile() {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile"
                    description="Update your name and mobile number"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                                <p className={`text-[0.8rem] ${errors.name ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                                    This can only be changed once every 90 days.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="mobile_number">Mobile Number</Label>

                                <MobileNumberInput
                                    id="mobile_number"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.mobile_number || ''}
                                    name="mobile_number"
                                    autoComplete="tel"
                                    placeholder="Mobile number"
                                />
                                <p className="text-[0.8rem] text-muted-foreground">
                                    To get support, please share your WhatsApp number.
                                </p>

                                <InputError
                                    className="mt-2"
                                    message={errors.mobile_number}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>

                                <Input
                                    id="email_display"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email_display"
                                    disabled
                                    autoComplete="username"
                                    placeholder="Email address"
                                />
                                <input type="hidden" name="email" value={auth.user.email} />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
