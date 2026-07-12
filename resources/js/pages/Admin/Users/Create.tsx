import { useForm } from '@inertiajs/react';
import {
    store,
    index,
    create,
} from '@/actions/App/Http/Controllers/Admin/UserController';
import InputError from '@/components/input-error';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateUser() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        mobile_number: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(store.url());
    };

    return (
        <>
            <SeoHead title="Create User" />

            <PagePanel title="Create User" variant="transparent">
                <form
                    onSubmit={handleSubmit}
                    className="max-w-xl space-y-5 rounded-xl border bg-card p-6"
                >
                    <div className="grid gap-1">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="mobile_number">
                            Mobile number (optional)
                        </Label>
                        <Input
                            id="mobile_number"
                            value={data.mobile_number}
                            onChange={(e) =>
                                setData('mobile_number', e.target.value)
                            }
                        />
                        <InputError message={errors.mobile_number} />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            required
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="password_confirmation">
                            Confirm password
                        </Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            required
                        />
                    </div>

                    <Button type="submit" disabled={processing}>
                        Create User
                    </Button>
                </form>
            </PagePanel>
        </>
    );
}

CreateUser.layout = {
    breadcrumbs: [
        { title: 'User Management', href: index.url() },
        { title: 'Create', href: create.url() },
    ],
};
