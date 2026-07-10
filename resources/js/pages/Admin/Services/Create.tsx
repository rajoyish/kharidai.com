import { Link, useForm } from '@inertiajs/react';
import { Briefcase } from 'lucide-react';
import { useMemo } from 'react';
import type { FormEvent, ReactNode } from 'react';

import {
    index as servicesIndex,
    store,
} from '@/actions/App/Http/Controllers/Admin/ServiceEngagementController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type Variant = { id: number; name: string; price_npr: number };
type Service = { id: number; title: string; variants: Variant[] };
type User = { id: number; name: string; email: string };

type ClientOption = { value: number; label: string; email: string };

function formatNpr(amount: number): string {
    return `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Admins recognise a client by either their name or their email, and duplicate
 * names are common, so the combobox matches on both rather than the label alone.
 */
function matchesClientQuery(option: ClientOption, query: string): boolean {
    const needle = query.trim().toLowerCase();

    return (
        option.label.toLowerCase().includes(needle) ||
        option.email.toLowerCase().includes(needle)
    );
}

type FieldProps = {
    htmlFor?: string;
    label: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
};

function Field({ htmlFor, label, hint, error, children }: FieldProps) {
    return (
        <div className="grid gap-2.5">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && (
                <p className="text-xs leading-5 text-muted-foreground">
                    {hint}
                </p>
            )}
            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate text-right font-medium">
                {value}
            </span>
        </div>
    );
}

export default function AssignService({
    users,
    services,
}: {
    users: User[];
    services: Service[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        user_id: '' as number | '',
        product_id: '' as number | '',
        product_variant_id: '' as number | '',
        project_name: '',
        brief_note: '',
        delivery_note: '',
    });

    // The client list is searchable rather than a plain <select> so it stays
    // usable once the store has hundreds of registered users.
    const clientOptions = useMemo<ClientOption[]>(
        () =>
            users.map((user) => ({
                value: user.id,
                label: user.name,
                email: user.email,
            })),
        [users],
    );

    const selectedClient = useMemo(
        () =>
            clientOptions.find((option) => option.value === data.user_id) ??
            null,
        [clientOptions, data.user_id],
    );

    const selectedService = useMemo(
        () => services.find((service) => service.id === data.product_id),
        [services, data.product_id],
    );

    const selectedVariant = useMemo(
        () =>
            selectedService?.variants.find(
                (variant) => variant.id === data.product_variant_id,
            ),
        [selectedService, data.product_variant_id],
    );

    const handleServiceChange = (value: string) => {
        setData((current) => ({
            ...current,
            product_id: Number(value),
            product_variant_id: '',
        }));
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        post(store.url());
    };

    const submitLabel = processing ? 'Assigning...' : 'Assign service';

    return (
        <>
            <SeoHead title="Assign Service" />

            <PagePanel variant="transparent">
                <form onSubmit={handleSubmit} className="w-full">
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                        <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
                            <div className="flex items-center gap-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                                    <Briefcase className="size-5" />
                                </span>
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        Assign service
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        Start an engagement for a client. You
                                        build the invoice on the next screen.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:shrink-0">
                                <Button variant="ghost" asChild>
                                    <Link href={servicesIndex.url()}>
                                        Cancel
                                    </Link>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50"
                                >
                                    {submitLabel}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                            <div className="flex min-w-0 flex-col gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Assignment</CardTitle>
                                        <CardDescription>
                                            Who the work is for and which
                                            package they are on.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6">
                                        <Field
                                            htmlFor="user_id"
                                            label="Client"
                                            error={errors.user_id}
                                            hint="Type to search by name or email."
                                        >
                                            <Combobox
                                                items={clientOptions}
                                                value={selectedClient}
                                                onValueChange={(
                                                    option: ClientOption | null,
                                                ) =>
                                                    setData(
                                                        'user_id',
                                                        option
                                                            ? option.value
                                                            : '',
                                                    )
                                                }
                                                itemToStringLabel={(
                                                    option: ClientOption,
                                                ) => option.label}
                                                isItemEqualToValue={(
                                                    a: ClientOption,
                                                    b: ClientOption,
                                                ) => a.value === b.value}
                                                filter={matchesClientQuery}
                                            >
                                                <ComboboxInput
                                                    id="user_id"
                                                    className="w-full"
                                                    placeholder="Search clients..."
                                                    showClear={
                                                        selectedClient !== null
                                                    }
                                                    aria-invalid={Boolean(
                                                        errors.user_id,
                                                    )}
                                                />
                                                <ComboboxContent>
                                                    <ComboboxEmpty>
                                                        No clients found.
                                                    </ComboboxEmpty>
                                                    <ComboboxList>
                                                        {(
                                                            option: ClientOption,
                                                        ) => (
                                                            <ComboboxItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={option}
                                                            >
                                                                <span className="flex min-w-0 flex-col">
                                                                    <span className="truncate">
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </span>
                                                                    <span className="truncate text-xs text-muted-foreground">
                                                                        {
                                                                            option.email
                                                                        }
                                                                    </span>
                                                                </span>
                                                            </ComboboxItem>
                                                        )}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </Field>

                                        <Field
                                            htmlFor="product_id"
                                            label="Service"
                                            error={errors.product_id}
                                        >
                                            <Select
                                                value={
                                                    data.product_id
                                                        ? String(
                                                              data.product_id,
                                                          )
                                                        : undefined
                                                }
                                                onValueChange={
                                                    handleServiceChange
                                                }
                                            >
                                                <SelectTrigger
                                                    id="product_id"
                                                    className="w-full"
                                                    aria-invalid={Boolean(
                                                        errors.product_id,
                                                    )}
                                                >
                                                    <SelectValue placeholder="Select a service" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {services.map((service) => (
                                                        <SelectItem
                                                            key={service.id}
                                                            value={String(
                                                                service.id,
                                                            )}
                                                        >
                                                            {service.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>

                                        {selectedService && (
                                            <Field
                                                htmlFor="product_variant_id"
                                                label="Package"
                                                error={
                                                    errors.product_variant_id
                                                }
                                                hint={
                                                    selectedService.variants
                                                        .length === 0
                                                        ? 'This service has no packages yet. Add one to the product before assigning it.'
                                                        : undefined
                                                }
                                            >
                                                <Select
                                                    value={
                                                        data.product_variant_id
                                                            ? String(
                                                                  data.product_variant_id,
                                                              )
                                                            : undefined
                                                    }
                                                    onValueChange={(value) =>
                                                        setData(
                                                            'product_variant_id',
                                                            Number(value),
                                                        )
                                                    }
                                                    disabled={
                                                        selectedService.variants
                                                            .length === 0
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="product_variant_id"
                                                        className="w-full"
                                                        aria-invalid={Boolean(
                                                            errors.product_variant_id,
                                                        )}
                                                    >
                                                        <SelectValue placeholder="Select a package" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {selectedService.variants.map(
                                                            (variant) => (
                                                                <SelectItem
                                                                    key={
                                                                        variant.id
                                                                    }
                                                                    value={String(
                                                                        variant.id,
                                                                    )}
                                                                >
                                                                    {
                                                                        variant.name
                                                                    }
                                                                    {' — '}
                                                                    {formatNpr(
                                                                        variant.price_npr,
                                                                    )}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Project details</CardTitle>
                                        <CardDescription>
                                            Optional context that carries over
                                            to the invoice brief.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6">
                                        <Field
                                            htmlFor="project_name"
                                            label="Project name"
                                            error={errors.project_name}
                                            hint="Shown in the engagement list. Defaults to the service title."
                                        >
                                            <Input
                                                id="project_name"
                                                value={data.project_name}
                                                onChange={(e) =>
                                                    setData(
                                                        'project_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. Good Management"
                                            />
                                        </Field>

                                        <Field
                                            htmlFor="brief_note"
                                            label="Brief"
                                            error={errors.brief_note}
                                            hint="What the client asked for."
                                        >
                                            <Textarea
                                                id="brief_note"
                                                rows={4}
                                                className="resize-none"
                                                value={data.brief_note}
                                                onChange={(e) =>
                                                    setData(
                                                        'brief_note',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Kickoff notes, scope, deadlines..."
                                            />
                                        </Field>

                                        <Field
                                            htmlFor="delivery_note"
                                            label="Delivery note"
                                            error={errors.delivery_note}
                                            hint="How the finished work will be handed over."
                                        >
                                            <Textarea
                                                id="delivery_note"
                                                rows={4}
                                                className="resize-none"
                                                value={data.delivery_note}
                                                onChange={(e) =>
                                                    setData(
                                                        'delivery_note',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-6 lg:sticky lg:top-6 lg:self-start">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Summary</CardTitle>
                                        <CardDescription>
                                            The package price is a reference
                                            estimate. The final cost is agreed
                                            after the work is measured.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-3">
                                        <SummaryRow
                                            label="Client"
                                            value={selectedClient?.label ?? '—'}
                                        />
                                        <SummaryRow
                                            label="Service"
                                            value={
                                                selectedService?.title ?? '—'
                                            }
                                        />
                                        <SummaryRow
                                            label="Package"
                                            value={selectedVariant?.name ?? '—'}
                                        />
                                        <Separator className="my-1" />
                                        <SummaryRow
                                            label="Estimate"
                                            value={
                                                selectedVariant
                                                    ? formatNpr(
                                                          selectedVariant.price_npr,
                                                      )
                                                    : '—'
                                            }
                                        />
                                    </CardContent>
                                    <CardFooter className="flex-col items-stretch gap-2">
                                        <Separator className="mb-2" />
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50"
                                        >
                                            {submitLabel}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    </div>
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
