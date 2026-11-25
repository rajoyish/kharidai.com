import { Card, CardContent } from '@/components/ui/card';

/** A headline figure with its label and an optional line of context. */
export function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <Card className="gap-1 py-4">
            <CardContent className="px-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-xl font-semibold tabular-nums">
                    {value}
                </div>
                {hint && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {hint}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
