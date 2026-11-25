import { useHttp } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { FormField } from '@/components/procurement/form-field';
import type { SupplierSummary } from '@/components/procurement/supplier-form-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNpr } from '@/lib/currency';
import { formatCredits, formatRate } from '@/lib/wallet-credits';

export type Option = { value: string; label: string };

export type Quote = {
    cost_basis: string;
    supplier_id: number | null;
    balance_credits: string | null;
    balance_after_credits: string | null;
    npr_per_credit: number | null;
    supplier_cost_credits: string;
    landed_cost_npr: number | null;
    extra_cost_npr: number;
    total_cost_npr: number | null;
    suggested_price_npr: number | null;
    selling_price_npr: number | null;
    profit_npr: number | null;
    margin_percent: number | null;
    markup_percent: number | null;
    lots: {
        top_up_id: number;
        reference: string | null;
        topped_up_at: string;
        credits: string;
        npr_per_credit: number;
        cost_npr: number;
    }[];
    shortfall_credits: string | null;
    warnings: string[];
    bases: Partial<Record<'fifo' | 'average' | 'latest', number | null>>;
};

export type CalculatorInput = {
    supplier_id: string;
    supplier_cost_credits: string;
    cost_basis: string;
    manual_npr_per_credit: string;
    extra_cost_npr: string;
    profit_mode: 'amount' | 'margin';
    target_profit_npr: string;
    target_margin_percent: string;
    rounding: string;
    final_price_npr: string;
};

export type CalculatorDefaults = {
    supplier_id: number | null;
    supplier_cost_credits?: string;
    cost_basis: string;
    manual_npr_per_credit: string | null;
    extra_cost_npr: number | string | null;
    profit_mode: 'amount' | 'margin';
    target_profit_npr: number | string | null;
    target_margin_percent: string | null;
    rounding: string;
};

type Errors = Record<string, string | undefined>;

export const asInput = (value: number | string | null | undefined): string =>
    value === null || value === undefined ? '' : String(value);

/** Drops the trailing zeros of an eight-place credit string for editing. */
export const trimCredits = (value: string | null | undefined): string =>
    value ? value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : '';

/**
 * Calculator inputs, re-quoted on the server a moment after typing stops, so
 * the numbers on screen always come from the same code that will apply them.
 */
export function usePriceCalculator({
    quoteUrl,
    defaults,
    suppliers,
}: {
    quoteUrl: string;
    defaults: CalculatorDefaults;
    suppliers: SupplierSummary[];
}) {
    const calculator = useHttp<CalculatorInput, Quote>({
        supplier_id: asInput(defaults.supplier_id),
        supplier_cost_credits: trimCredits(defaults.supplier_cost_credits),
        cost_basis: suppliers.length === 0 ? 'manual' : defaults.cost_basis,
        manual_npr_per_credit: asInput(defaults.manual_npr_per_credit),
        extra_cost_npr: asInput(defaults.extra_cost_npr),
        profit_mode: defaults.profit_mode,
        target_profit_npr: asInput(defaults.target_profit_npr),
        target_margin_percent: asInput(defaults.target_margin_percent),
        rounding: defaults.rounding,
        final_price_npr: '',
    });

    const { data } = calculator;
    const isManual = data.cost_basis === 'manual';
    const supplier = suppliers.find(
        (option) => String(option.id) === data.supplier_id,
    );
    const isReady =
        Number(data.supplier_cost_credits) > 0 &&
        (isManual
            ? Number(data.manual_npr_per_credit) > 0
            : supplier !== undefined);
    const inputKey = JSON.stringify(data);

    const requote = () => calculator.post(quoteUrl).catch(() => {});

    useEffect(() => {
        if (!isReady) {
            return;
        }

        const timer = window.setTimeout(requote, 300);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputKey, isReady]);

    return {
        calculator,
        quote: isReady ? calculator.response : null,
        isManual,
        supplier,
        isReady,
        requote,
    };
}

type Calculator = ReturnType<typeof usePriceCalculator>['calculator'];

/**
 * Supplier choice and its price in credits. Picking a supplier leaves "Type
 * my own" for a wallet-backed rate.
 */
export function SupplierFields({
    calculator,
    suppliers,
    errors,
}: {
    calculator: Calculator;
    suppliers: SupplierSummary[];
    errors: Errors;
}) {
    const { data, setData } = calculator;

    return (
        <>
            <FormField
                id="supplier_id"
                label="Supplier"
                error={errors.supplier_id}
            >
                <Select
                    value={data.supplier_id}
                    onValueChange={(value) =>
                        setData((current) => ({
                            ...current,
                            supplier_id: value,
                            cost_basis:
                                current.cost_basis === 'manual'
                                    ? 'fifo'
                                    : current.cost_basis,
                        }))
                    }
                >
                    <SelectTrigger id="supplier_id">
                        <SelectValue
                            placeholder={
                                suppliers.length === 0
                                    ? 'No suppliers yet'
                                    : 'Choose a supplier'
                            }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {suppliers.map((option) => (
                            <SelectItem
                                key={option.id}
                                value={String(option.id)}
                            >
                                {option.name}
                                {option.platform_label &&
                                    ` · ${option.platform_label}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField
                id="supplier_cost_credits"
                label="Supplier price (credits)"
                error={errors.supplier_cost_credits}
            >
                <Input
                    id="supplier_cost_credits"
                    inputMode="decimal"
                    value={data.supplier_cost_credits}
                    onChange={(e) =>
                        setData('supplier_cost_credits', e.target.value.trim())
                    }
                    placeholder="e.g. 2.04"
                />
            </FormField>
        </>
    );
}

/**
 * Credit rate, extra cost, profit target, rounding and an optional price of
 * your own. Renders form fields only; the caller lays them out in a grid.
 */
export function CalculatorFields({
    calculator,
    quote,
    supplier,
    suppliers,
    costBases,
    roundings,
    errors,
}: {
    calculator: Calculator;
    quote: Quote | null;
    supplier: SupplierSummary | undefined;
    suppliers: SupplierSummary[];
    costBases: Option[];
    roundings: Option[];
    errors: Errors;
}) {
    const { data, setData } = calculator;
    const isManual = data.cost_basis === 'manual';

    return (
        <>
            <FormField
                id="cost_basis"
                label="Credit rate"
                error={errors.cost_basis}
            >
                <Select
                    value={data.cost_basis}
                    onValueChange={(value) => setData('cost_basis', value)}
                >
                    <SelectTrigger id="cost_basis">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {costBases.map((basis) => (
                            <SelectItem
                                key={basis.value}
                                value={basis.value}
                                disabled={
                                    basis.value !== 'manual' &&
                                    suppliers.length === 0
                                }
                            >
                                {basis.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            {isManual ? (
                <FormField
                    id="manual_npr_per_credit"
                    label="Rs. per credit"
                    hint="Use this if you have no top-up yet."
                    error={errors.manual_npr_per_credit}
                >
                    <Input
                        id="manual_npr_per_credit"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={data.manual_npr_per_credit}
                        onChange={(e) =>
                            setData('manual_npr_per_credit', e.target.value)
                        }
                        placeholder="e.g. 195.59"
                    />
                </FormField>
            ) : (
                <div className="grid content-start gap-2 text-sm">
                    <span className="font-medium">1 credit</span>
                    <span className="flex h-9 items-center text-muted-foreground">
                        {supplier
                            ? `avg ${formatRate(supplier.average_npr_per_credit)}`
                            : 'Choose a supplier above.'}
                    </span>
                </div>
            )}

            <FormField
                id="extra_cost_npr"
                label="Extra cost (Rs.)"
                hint="Fees, delivery, etc."
                error={errors.extra_cost_npr}
            >
                <Input
                    id="extra_cost_npr"
                    type="number"
                    step="0.01"
                    min="0"
                    value={data.extra_cost_npr}
                    onChange={(e) => setData('extra_cost_npr', e.target.value)}
                    placeholder="e.g. 0"
                />
            </FormField>

            <div className="grid content-start gap-2">
                <Label
                    htmlFor={
                        data.profit_mode === 'amount'
                            ? 'target_profit_npr'
                            : 'target_margin_percent'
                    }
                >
                    Profit
                </Label>
                <div className="flex items-center gap-2">
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        className="h-9 shrink-0"
                        value={data.profit_mode}
                        onValueChange={(value) =>
                            value &&
                            setData('profit_mode', value as 'amount' | 'margin')
                        }
                        aria-label="Profit type"
                    >
                        <ToggleGroupItem
                            value="amount"
                            aria-label="Profit in rupees"
                            className="h-9 px-3"
                        >
                            Rs.
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="margin"
                            aria-label="Profit percentage"
                            className="h-9 px-3"
                        >
                            %
                        </ToggleGroupItem>
                    </ToggleGroup>
                    {data.profit_mode === 'amount' ? (
                        <Input
                            id="target_profit_npr"
                            type="number"
                            step="1"
                            min="0"
                            value={data.target_profit_npr}
                            onChange={(e) =>
                                setData('target_profit_npr', e.target.value)
                            }
                            placeholder="e.g. 500"
                        />
                    ) : (
                        <Input
                            id="target_margin_percent"
                            type="number"
                            step="0.5"
                            min="0"
                            max="95"
                            value={data.target_margin_percent}
                            onChange={(e) =>
                                setData('target_margin_percent', e.target.value)
                            }
                            placeholder="e.g. 40"
                        />
                    )}
                </div>
                {(errors.target_profit_npr || errors.target_margin_percent) && (
                    <div className="text-sm text-destructive">
                        {errors.target_profit_npr ??
                            errors.target_margin_percent}
                    </div>
                )}
            </div>

            <FormField id="rounding" label="Rounding" error={errors.rounding}>
                <Select
                    value={data.rounding}
                    onValueChange={(value) => setData('rounding', value)}
                >
                    <SelectTrigger id="rounding">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {roundings.map((rounding) => (
                            <SelectItem
                                key={rounding.value}
                                value={rounding.value}
                            >
                                {rounding.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField
                id="final_price_npr"
                label="Your own price (Rs.)"
                hint="Optional. Leave empty to use the suggested price."
                error={errors.final_price_npr}
            >
                <Input
                    id="final_price_npr"
                    type="number"
                    step="1"
                    min="0"
                    value={data.final_price_npr}
                    onChange={(e) => setData('final_price_npr', e.target.value)}
                    placeholder={
                        quote?.suggested_price_npr
                            ? String(quote.suggested_price_npr)
                            : 'e.g. 899'
                    }
                />
            </FormField>
        </>
    );
}

function Row({
    label,
    value,
    emphasis = false,
}: {
    label: string;
    value: string;
    emphasis?: boolean;
}) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className={emphasis ? 'font-medium' : 'text-muted-foreground'}>
                {label}
            </dt>
            <dd
                className={
                    emphasis
                        ? 'text-lg font-semibold tabular-nums'
                        : 'tabular-nums'
                }
            >
                {value}
            </dd>
        </div>
    );
}

const npr = (value: number | null): string =>
    value === null ? '—' : formatNpr(value);

/**
 * What a quote works out to for one unit: cost, suggested and selling price,
 * profit, warnings, and how the credit rate choice moves the cost.
 */
export function QuoteBreakdown({
    quote,
    costBasis,
    costBases,
}: {
    quote: Quote;
    costBasis: string;
    costBases: Option[];
}) {
    return (
        <>
            <dl className="divide-y text-sm">
                <Row
                    label="1 credit costs"
                    value={formatRate(quote.npr_per_credit)}
                />
                <Row
                    label={`${formatCredits(quote.supplier_cost_credits)} credits cost`}
                    value={npr(quote.landed_cost_npr)}
                />
                {quote.extra_cost_npr > 0 && (
                    <Row
                        label="Extra cost"
                        value={formatNpr(quote.extra_cost_npr)}
                    />
                )}
                <Row label="Our cost" value={npr(quote.total_cost_npr)} />
                <Row
                    label="Suggested price"
                    value={npr(quote.suggested_price_npr)}
                />
                <Row
                    label="Selling price"
                    value={npr(quote.selling_price_npr)}
                    emphasis
                />
                <Row
                    label="Profit"
                    value={
                        quote.profit_npr === null
                            ? '—'
                            : `${formatNpr(quote.profit_npr)}${quote.margin_percent !== null ? ` (${quote.margin_percent.toFixed(1)}%)` : ''}`
                    }
                />
            </dl>

            {quote.warnings.map((warning) => (
                <Alert key={warning}>
                    <AlertTriangle aria-hidden="true" />
                    <AlertDescription>{warning}</AlertDescription>
                </Alert>
            ))}

            {costBasis !== 'manual' && (
                <div className="rounded-md bg-muted/60 p-3 text-xs">
                    <div className="mb-1 font-medium">
                        Our cost by credit rate
                    </div>
                    {(['fifo', 'average', 'latest'] as const).map((basis) => (
                        <div
                            key={basis}
                            className="flex justify-between gap-2 py-0.5"
                        >
                            <span className="text-muted-foreground">
                                {
                                    costBases.find(
                                        (option) => option.value === basis,
                                    )?.label
                                }
                            </span>
                            <span className="tabular-nums">
                                {npr(quote.bases[basis] ?? null)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {quote.lots.length > 0 && costBasis === 'fifo' && (
                <div className="text-xs">
                    <div className="mb-1 font-medium">Credits used</div>
                    {quote.lots.map((lot) => (
                        <div
                            key={lot.top_up_id}
                            className="flex justify-between gap-2 py-0.5"
                        >
                            <span className="text-muted-foreground">
                                {lot.topped_up_at}
                                {lot.reference && ` · ${lot.reference}`} ·{' '}
                                {formatCredits(lot.credits)} @{' '}
                                {formatRate(lot.npr_per_credit)}
                            </span>
                            <span className="tabular-nums">
                                {formatNpr(lot.cost_npr)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
