import { usePage } from '@inertiajs/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { PaymentMethod, SharedData } from '@/types';

type PaymentQrPanelProps = {
    /** Rendered as the amount to pay, e.g. "Rs. 5,000". */
    amountLabel: string;
    /** Extra order-specific notes shown between the amount and instructions. */
    children?: React.ReactNode;
};

/** The QR image and payee name shown for a provider, keyed by its stored key. */
const providerDetails: Record<string, { image: string; payee: string }> = {
    default: {
        image: '/images/QR-pay.png',
        payee: 'HUES AND ARRAYS PVT LTD',
    },
    esewa: {
        image: '/images/QR-eSewa.jpeg',
        payee: 'RAJESH BUDHATHOKI',
    },
    khalti: {
        image: '/images/QR-Khalti.jpeg',
        payee: 'RAJESH BUDHATHOKI',
    },
};

/**
 * Providers to offer when the shared prop is missing. Losing the prop must not
 * take payments off the site, so the panel falls back to everything in service.
 */
const fallbackMethods: PaymentMethod[] = [
    { key: 'default', label: 'Mobile Banking', is_enabled: true },
    { key: 'esewa', label: 'eSewa', is_enabled: true },
    { key: 'khalti', label: 'Khalti', is_enabled: true },
];

/**
 * The scan-to-pay QR block shared by the checkout payment page and the order
 * page's service-invoice payment step: QR image per payment method, payee
 * details, the amount due and the method switcher.
 *
 * Which providers are in service comes from the admin-controlled shared prop,
 * so a provider disabled during downtime is greyed out on every page that
 * mounts this panel, current or future.
 */
export function PaymentQrPanel({ amountLabel, children }: PaymentQrPanelProps) {
    const { paymentMethods } = usePage<SharedData>().props;
    const methods =
        paymentMethods && paymentMethods.length > 0
            ? paymentMethods
            : fallbackMethods;

    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    // Never rest on a disabled provider: an untouched panel opens on the first
    // one in service, and a selection the admin disables mid-visit falls back
    // to it too. Null means every provider is down.
    const selected =
        methods.find(
            (method) => method.key === selectedKey && method.is_enabled,
        ) ??
        methods.find((method) => method.is_enabled) ??
        null;

    const details = selected ? providerDetails[selected.key] : undefined;

    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/5 p-6">
            {details ? (
                <div className="mb-4 rounded-xl bg-white p-4 text-center shadow-sm">
                    <img
                        src={details.image}
                        alt={`${selected?.label} QR Code`}
                        className="mx-auto h-48 w-48 object-contain"
                    />
                    <div className="mt-3 text-sm font-semibold">
                        <div>{details.payee}</div>
                        <div className="font-medium text-muted-foreground">
                            Store: Kharidai.com
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-4 rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    Online payments are temporarily unavailable. Please contact
                    us to complete your payment.
                </div>
            )}
            <h3 className="text-lg font-semibold">Scan to Pay</h3>
            <p className="mt-2 text-2xl font-bold text-primary">
                {amountLabel}
            </p>
            {children}
            {selected && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Scan the QR code using your mobile banking app. Please note
                    that payments made via eSewa or Khalti may incur a
                    transaction fee.
                </p>
            )}
            {selected && selected.key !== 'default' && (
                <p className="mt-2 text-center text-sm text-destructive">
                    Escrow is not supported. Payments will be{' '}
                    <span className="font-bold">refunded</span> if any
                    subscription errors occur.
                </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
                {methods.map((method) => (
                    <Button
                        key={method.key}
                        type="button"
                        variant={
                            selected?.key === method.key ? 'default' : 'outline'
                        }
                        disabled={!method.is_enabled}
                        title={
                            method.is_enabled
                                ? undefined
                                : `${method.label} is temporarily unavailable`
                        }
                        onClick={() => setSelectedKey(method.key)}
                    >
                        {method.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
