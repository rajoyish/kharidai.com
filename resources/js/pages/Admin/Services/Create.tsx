import { useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { store } from '@/actions/App/Http/Controllers/Admin/ServiceEngagementController';
import InputError from '@/components/input-error';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Variant = { id: number; name: string; price_npr: number };
type Service = { id: number; title: string; variants: Variant[] };
type User = { id: number; name: string; email: string };

const selectClassName =
    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:outline-none';

export default function AssignService({
    users,
    services,
    statuses,
}: {
    users: User[];
    services: Service[];
    statuses: string[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        user_id: '' as number | '',
        product_id: '' as number | '',
        product_variant_id: '' as number | '',
        project_name: '',
        price_npr: 0 as number,
        status: 'pending',
        brief_note: '',
        delivery_note: '',
    });

    const selectedService = useMemo(
        () => services.find((s) => s.id === data.product_id),
        [services, data.product_id],
    );

    const handleServiceChange = (value: string) => {
        const productId = value ? Number(value) : '';
        setData((prev) => ({
            ...prev,
            product_id: productId,
            product_variant_id: '',
        }));
    };

    const handleVariantChange = (value: string) => {
        const variantId = value ? Number(value) : '';
        const variant = selectedService?.variants.find(
            (v) => v.id === variantId,
        );
        setData((prev) => ({
            ...prev,
            product_variant_id: variantId,
            price_npr: variant ? variant.price_npr : prev.price_npr,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(store.url());
    };

    return (
        <>
            <SeoHead title="Assign Service" />

            <PagePanel title="Assign Service" variant="transparent">
                <form
                    onSubmit={handleSubmit}
                    className="max-w-xl space-y-5 rounded-xl border bg-card p-6"
                >
                    <div className="grid gap-1">
                        <Label htmlFor="user_id">Client</Label>
                        <select
                            id="user_id"
                            className={selectClassName}
                            value={data.user_id}
                            onChange={(e) =>
                                setData(
                                    'user_id',
                                    e.target.value
                                        ? Number(e.target.value)
                                        : '',
                                )
                            }
                        >
                            <option value="">Select a user</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.user_id} />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="product_id">Service</Label>
                        <select
                            id="product_id"
                            className={selectClassName}
                            value={data.product_id}
                            onChange={(e) =>
                                handleServiceChange(e.target.value)
                            }
                        >
                            <option value="">Select a service</option>
                            {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {service.title}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.product_id} />
                    </div>

                    {selectedService && (
                        <div className="grid gap-1">
                            <Label htmlFor="product_variant_id">Package</Label>
                            <select
                                id="product_variant_id"
                                className={selectClassName}
                                value={data.product_variant_id}
                                onChange={(e) =>
                                    handleVariantChange(e.target.value)
                                }
                            >
                                <option value="">Select a package</option>
                                {selectedService.variants.map((variant) => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.name} — Rs.{' '}
                                        {variant.price_npr.toFixed(0)}
                                    </option>
                                ))}
                            </select>
                            {selectedService.variants.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    This service has no packages yet. Add one to
                                    the product before assigning it.
                                </p>
                            )}
                            <InputError message={errors.product_variant_id} />
                        </div>
                    )}

                    <div className="grid gap-1">
                        <Label htmlFor="project_name">
                            Project Name (optional)
                        </Label>
                        <Input
                            id="project_name"
                            value={data.project_name}
                            onChange={(e) =>
                                setData('project_name', e.target.value)
                            }
                            placeholder="e.g. Good Management"
                        />
                        <InputError message={errors.project_name} />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="price_npr">Price (Rs.)</Label>
                        <Input
                            id="price_npr"
                            type="number"
                            min={0}
                            value={data.price_npr}
                            onChange={(e) =>
                                setData('price_npr', Number(e.target.value))
                            }
                        />
                        <InputError message={errors.price_npr} />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="status">Status</Label>
                        <select
                            id="status"
                            className={selectClassName}
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                        >
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {status.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="brief_note">Brief (optional)</Label>
                        <Textarea
                            id="brief_note"
                            rows={3}
                            value={data.brief_note}
                            onChange={(e) =>
                                setData('brief_note', e.target.value)
                            }
                        />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="delivery_note">
                            Delivery note (optional)
                        </Label>
                        <Textarea
                            id="delivery_note"
                            rows={3}
                            value={data.delivery_note}
                            onChange={(e) =>
                                setData('delivery_note', e.target.value)
                            }
                        />
                    </div>

                    <Button type="submit" disabled={processing}>
                        Assign Service
                    </Button>
                </form>
            </PagePanel>
        </>
    );
}

AssignService.layout = {
    breadcrumbs: [
        { title: 'Services', href: '/admin/services' },
        { title: 'Assign', href: '/admin/services/create' },
    ],
};
