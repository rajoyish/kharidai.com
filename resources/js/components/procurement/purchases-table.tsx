import { Link } from '@inertiajs/react';
import { show as variantPricing } from '@/actions/App/Http/Controllers/Admin/VariantPricingController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatNpr } from '@/lib/currency';
import { formatCredits } from '@/lib/wallet-credits';

export type Purchase = {
    id: number;
    supplier_id: number;
    supplier_name: string | null;
    is_personal: boolean;
    description: string | null;
    reference: string | null;
    variant: {
        id: number;
        name: string;
        product_title: string | null;
        product_slug: string | null;
    } | null;
    quantity: number;
    unit_cost_credits: string;
    credits_spent: string;
    cost_npr: number;
    unit_cost_npr: number;
    purchased_at: string;
    notes: string | null;
};

/** The purchase list: each row's cost is what its credits actually cost. */
export function PurchasesTable({
    purchases,
    showVariant = true,
    onReverse,
}: {
    purchases: Purchase[];
    showVariant?: boolean;
    onReverse: (purchase: Purchase) => void;
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    {showVariant && <TableHead>Item</TableHead>}
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Credits each</TableHead>
                    <TableHead className="text-right">Credits used</TableHead>
                    <TableHead className="text-right">Cost (Rs.)</TableHead>
                    <TableHead className="text-right">Each (Rs.)</TableHead>
                    <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                        <TableCell className="whitespace-nowrap">
                            {purchase.purchased_at}
                            {purchase.is_personal && (
                                <Badge variant="info" className="ml-2">
                                    Personal
                                </Badge>
                            )}
                            {purchase.supplier_name && (
                                <div className="text-xs text-muted-foreground">
                                    {purchase.supplier_name}
                                </div>
                            )}
                            {purchase.reference && (
                                <div className="text-xs text-muted-foreground">
                                    {purchase.reference}
                                </div>
                            )}
                        </TableCell>
                        {showVariant && (
                            <TableCell>
                                {purchase.variant &&
                                purchase.variant.product_slug ? (
                                    <Link
                                        className="hover:underline"
                                        href={variantPricing.url({
                                            product:
                                                purchase.variant.product_slug,
                                            variant: purchase.variant.id,
                                        })}
                                    >
                                        {purchase.variant.product_title} —{' '}
                                        {purchase.variant.name}
                                    </Link>
                                ) : (
                                    (purchase.description ?? 'Deleted product')
                                )}
                            </TableCell>
                        )}
                        <TableCell className="text-right tabular-nums">
                            {purchase.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {formatCredits(purchase.unit_cost_credits)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {formatCredits(purchase.credits_spent)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {formatNpr(purchase.cost_npr)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {formatNpr(purchase.unit_cost_npr)}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onReverse(purchase)}
                            >
                                Undo
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {purchases.length === 0 && (
                    <TableRow>
                        <TableCell
                            colSpan={showVariant ? 8 : 7}
                            className="h-20 text-center text-muted-foreground"
                        >
                            No purchases yet.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
