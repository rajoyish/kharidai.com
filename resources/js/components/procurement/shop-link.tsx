import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Opens the supplier's shop, bot or website in a new tab. */
export function ShopLink({
    href,
    className,
}: {
    href: string | null;
    className?: string;
}) {
    if (!href) {
        return null;
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'inline-flex items-center gap-1 text-xs underline underline-offset-2',
                className,
            )}
        >
            Open shop
            <ExternalLink className="size-3" aria-hidden="true" />
        </a>
    );
}
