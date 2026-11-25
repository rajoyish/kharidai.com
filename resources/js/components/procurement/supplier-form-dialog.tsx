import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    store as storeSupplier,
    update as updateSupplier,
} from '@/actions/App/Http/Controllers/Admin/SupplierController';
import { FormField } from '@/components/procurement/form-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { normalizeShopLink, platformForShopLink } from '@/lib/shop-link';

export type PlatformOption = { value: string; label: string };

/** A supplier and the live state of its wallet. */
export type SupplierSummary = {
    id: number;
    name: string;
    platform: string;
    /** Null when the platform is "Other", which is not shown. */
    platform_label: string | null;
    contact: string | null;
    shop_url: string | null;
    voucher_currency: string;
    notes: string | null;
    balance_credits: string;
    cost_remaining_npr: number;
    average_npr_per_credit: number | null;
    latest_npr_per_credit: number | null;
    latest_top_up_at: string | null;
};

/**
 * Adds or edits a supplier. With `stayOnPage`, a new supplier is created
 * without leaving the current screen, for adding one from the pricing page.
 */
export function SupplierFormDialog({
    supplier,
    platforms,
    stayOnPage = false,
    onSaved,
    onClose,
}: {
    supplier: SupplierSummary | null;
    platforms: PlatformOption[];
    stayOnPage?: boolean;
    onSaved?: () => void;
    onClose: () => void;
}) {
    const { data, setData, post, patch, processing, errors } = useForm({
        name: supplier?.name ?? '',
        platform: supplier?.platform ?? 'telegram',
        contact: supplier?.contact ?? '',
        shop_url: supplier?.shop_url ?? '',
        voucher_currency: supplier?.voucher_currency ?? 'USD',
        notes: supplier?.notes ?? '',
        stay: stayOnPage,
    });

    // Picks "Buy on" from the link as it is typed, unless the admin already
    // chose a platform themselves.
    const [platformTouched, setPlatformTouched] = useState(supplier !== null);
    const normalizedShopLink = normalizeShopLink(data.shop_url);
    const shopLinkPreview =
        normalizedShopLink !== '' &&
        normalizedShopLink !== data.shop_url.trim() &&
        platformForShopLink(normalizedShopLink) !== null
            ? normalizedShopLink
            : null;

    const changeShopLink = (value: string) => {
        const detected = platformForShopLink(normalizeShopLink(value));

        setData((current) => ({
            ...current,
            shop_url: value,
            platform:
                !platformTouched && detected ? detected : current.platform,
        }));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                onSaved?.();
                onClose();
            },
        };

        if (supplier) {
            patch(updateSupplier.url(supplier.id), options);
        } else {
            post(storeSupplier.url(), options);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {supplier ? 'Edit supplier' : 'New supplier'}
                    </DialogTitle>
                    <DialogDescription>
                        Who you buy from. Each supplier has its own wallet.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        id="supplier_name"
                        label="Name"
                        error={errors.name}
                        className="grid gap-2 sm:col-span-2"
                    >
                        <Input
                            id="supplier_name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            placeholder="e.g. Google One Pro Reseller"
                        />
                    </FormField>
                    <FormField
                        id="supplier_platform"
                        label="Buy on"
                        error={errors.platform}
                    >
                        <Select
                            value={data.platform}
                            onValueChange={(value) => {
                                setPlatformTouched(true);
                                setData('platform', value);
                            }}
                        >
                            <SelectTrigger id="supplier_platform">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {platforms.map((platform) => (
                                    <SelectItem
                                        key={platform.value}
                                        value={platform.value}
                                    >
                                        {platform.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField
                        id="supplier_contact"
                        label="Contact"
                        error={errors.contact}
                    >
                        <Input
                            id="supplier_contact"
                            value={data.contact}
                            onChange={(e) => setData('contact', e.target.value)}
                            placeholder="e.g. @googleone_shop"
                        />
                    </FormField>
                    <FormField
                        id="supplier_shop_url"
                        label="Shop link"
                        hint="A Telegram @username, +phone for WhatsApp, or a website."
                        error={errors.shop_url}
                        className="grid gap-2 sm:col-span-2"
                    >
                        <Input
                            id="supplier_shop_url"
                            inputMode="url"
                            autoComplete="off"
                            value={data.shop_url}
                            onChange={(e) => changeShopLink(e.target.value)}
                            placeholder="e.g. @googleone_shop_bot or https://googleone.shop"
                        />
                        {shopLinkPreview && (
                            <p className="text-xs text-muted-foreground">
                                Saved as{' '}
                                <a
                                    href={shopLinkPreview}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2"
                                >
                                    {shopLinkPreview}
                                </a>
                            </p>
                        )}
                    </FormField>
                    <FormField
                        id="supplier_voucher_currency"
                        label="Voucher currency"
                        hint="e.g. USD"
                        error={errors.voucher_currency}
                    >
                        <Input
                            id="supplier_voucher_currency"
                            className="w-24 uppercase"
                            maxLength={3}
                            value={data.voucher_currency}
                            onChange={(e) =>
                                setData(
                                    'voucher_currency',
                                    e.target.value.toUpperCase(),
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        id="supplier_notes"
                        label="Notes"
                        error={errors.notes}
                        className="grid gap-2 sm:col-span-2"
                    >
                        <Textarea
                            id="supplier_notes"
                            rows={2}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                        />
                    </FormField>
                    <DialogFooter className="sm:col-span-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {supplier ? 'Save' : 'Add supplier'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
