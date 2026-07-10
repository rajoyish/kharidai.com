import { useState } from 'react';

import { Button } from '@/components/ui/button';

type PaymentMethod = 'default' | 'esewa' | 'khalti';

type PaymentQrPanelProps = {
    /** Rendered as the amount to pay, e.g. "Rs. 5,000". */
    amountLabel: string;
    /** Extra order-specific notes shown between the amount and instructions. */
    children?: React.ReactNode;
};

/**
 * The scan-to-pay QR block shared by the checkout payment page and the order
 * page's service-invoice payment step: QR image per payment method, payee
 * details, the amount due and the method switcher.
 */
export function PaymentQrPanel({ amountLabel, children }: PaymentQrPanelProps) {
    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>('default');

    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/5 p-6">
            <div className="mb-4 rounded-xl bg-white p-4 text-center shadow-sm">
                <img
                    src={
                        paymentMethod === 'esewa'
                            ? '/images/QR-eSewa.jpeg'
                            : paymentMethod === 'khalti'
                              ? '/images/QR-Khalti.jpeg'
                              : '/images/QR-pay.png'
                    }
                    alt={`${paymentMethod} QR Code`}
                    className="mx-auto h-48 w-48 object-contain"
                />
                <div className="mt-3 text-sm font-semibold">
                    <div>
                        {paymentMethod === 'default'
                            ? 'HUES AND ARRAYS PVT LTD'
                            : 'RAJESH BUDHATHOKI'}
                    </div>
                    <div className="font-medium text-muted-foreground">
                        Store: Kharidai.com
                    </div>
                </div>
            </div>
            <h3 className="text-lg font-semibold">Scan to Pay</h3>
            <p className="mt-2 text-2xl font-bold text-primary">
                {amountLabel}
            </p>
            {children}
            <p className="mt-2 text-center text-sm text-muted-foreground">
                Scan the QR code using your mobile banking app. Please note that
                payments made via eSewa or Khalti may incur a transaction fee.
            </p>
            {paymentMethod !== 'default' && (
                <p className="mt-2 text-center text-sm text-destructive">
                    Escrow is not supported. Payments will be{' '}
                    <span className="font-bold">refunded</span> if any
                    subscription errors occur.
                </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                    type="button"
                    variant={
                        paymentMethod === 'default' ? 'default' : 'outline'
                    }
                    onClick={() => setPaymentMethod('default')}
                >
                    Mobile Banking
                </Button>
                <Button
                    type="button"
                    variant={paymentMethod === 'esewa' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('esewa')}
                >
                    eSewa
                </Button>
                <Button
                    type="button"
                    variant={paymentMethod === 'khalti' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('khalti')}
                >
                    Khalti
                </Button>
            </div>
        </div>
    );
}
