import { MobileNumberInput } from '@/components/mobile-number-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Zone = {
    id: number;
    name: string;
    fee: number;
    min_days: number | null;
    max_days: number | null;
};

type SavedAddress = {
    id: number;
    recipient_name: string;
    mobile_number: string;
    address_line: string;
    city: string;
    landmark: string | null;
    shipping_zone_id: number | null;
};

type ShippingData = {
    shipping_zone_id: number | '';
    recipient_name: string;
    primary_contact: string;
    alternate_contact: string;
    address_line: string;
    city: string;
    landmark: string;
    save_address: boolean;
};

const selectClassName =
    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

const rupees = (value: number) => `Rs. ${value.toFixed(0)}`;

export function ShippingSelector({
    data,
    setData,
    errors,
    zones,
    addresses,
}: {
    data: ShippingData;
    setData: (field: keyof ShippingData, value: any) => void;
    errors: Partial<Record<keyof ShippingData, string>>;
    zones: Zone[];
    addresses: SavedAddress[];
}) {
    const applySavedAddress = (id: string) => {
        const address = addresses.find((a) => a.id === Number(id));

        if (!address) {
            return;
        }

        setData('recipient_name', address.recipient_name);
        setData('alternate_contact', address.mobile_number);
        setData('address_line', address.address_line);
        setData('city', address.city);
        setData('landmark', address.landmark ?? '');

        if (address.shipping_zone_id) {
            setData('shipping_zone_id', address.shipping_zone_id);
        }
    };

    return (
        <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Shipping Address</h2>

            {addresses.length > 0 && (
                <div className="mb-4 grid gap-2">
                    <Label htmlFor="saved_address">Use a saved address</Label>
                    <select
                        id="saved_address"
                        className={selectClassName}
                        defaultValue=""
                        onChange={(e) => applySavedAddress(e.target.value)}
                    >
                        <option value="">Enter a new address</option>
                        {addresses.map((address) => (
                            <option key={address.id} value={address.id}>
                                {address.recipient_name} — {address.address_line},{' '}
                                {address.city}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1">
                    <Label htmlFor="recipient_name">Recipient name</Label>
                    <Input
                        id="recipient_name"
                        value={data.recipient_name}
                        onChange={(e) => setData('recipient_name', e.target.value)}
                    />
                    {errors.recipient_name && (
                        <p className="text-sm text-destructive">{errors.recipient_name}</p>
                    )}
                </div>

                <div className="grid gap-1">
                    <Label htmlFor="primary_contact">Primary contact number</Label>
                    <MobileNumberInput
                        id="primary_contact"
                        value={data.primary_contact}
                        onChange={(e) => setData('primary_contact', e.target.value)}
                    />
                    {errors.primary_contact && (
                        <p className="text-sm text-destructive">{errors.primary_contact}</p>
                    )}
                </div>

                <div className="grid gap-1 sm:col-span-2">
                    <Label htmlFor="alternate_contact">
                        Alternate contact number (optional)
                    </Label>
                    <MobileNumberInput
                        id="alternate_contact"
                        value={data.alternate_contact}
                        onChange={(e) => setData('alternate_contact', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Shipping to someone else? Add their number. If it matches
                        your primary number we'll just use one.
                    </p>
                    {errors.alternate_contact && (
                        <p className="text-sm text-destructive">{errors.alternate_contact}</p>
                    )}
                </div>

                <div className="grid gap-1 sm:col-span-2">
                    <Label htmlFor="address_line">Address</Label>
                    <Input
                        id="address_line"
                        value={data.address_line}
                        onChange={(e) => setData('address_line', e.target.value)}
                    />
                    {errors.address_line && (
                        <p className="text-sm text-destructive">{errors.address_line}</p>
                    )}
                </div>

                <div className="grid gap-1">
                    <Label htmlFor="city">City</Label>
                    <Input
                        id="city"
                        value={data.city}
                        onChange={(e) => setData('city', e.target.value)}
                    />
                    {errors.city && (
                        <p className="text-sm text-destructive">{errors.city}</p>
                    )}
                </div>

                <div className="grid gap-1">
                    <Label htmlFor="landmark">Landmark (optional)</Label>
                    <Input
                        id="landmark"
                        value={data.landmark}
                        onChange={(e) => setData('landmark', e.target.value)}
                    />
                </div>

                <div className="grid gap-1 sm:col-span-2">
                    <Label htmlFor="shipping_zone_id">Delivery zone</Label>
                    <select
                        id="shipping_zone_id"
                        className={selectClassName}
                        value={data.shipping_zone_id}
                        onChange={(e) => setData('shipping_zone_id', Number(e.target.value))}
                    >
                        {zones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                                {zone.name} — {rupees(zone.fee)}
                                {zone.min_days && zone.max_days
                                    ? ` (${zone.min_days}–${zone.max_days} days)`
                                    : ''}
                            </option>
                        ))}
                    </select>
                    {errors.shipping_zone_id && (
                        <p className="text-sm text-destructive">{errors.shipping_zone_id}</p>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch
                        id="save_address"
                        checked={data.save_address}
                        onCheckedChange={(checked) => setData('save_address', checked)}
                    />
                    <Label htmlFor="save_address">Save this address for next time</Label>
                </div>
            </div>
        </div>
    );
}
