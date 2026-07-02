import { Badge } from '@/components/ui/badge';

export function SubscriptionStatusBadge({ isExpired }: { isExpired: boolean }) {
    if (!isExpired) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive"
        >
            Expired
        </Badge>
    );
}
