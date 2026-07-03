import { useEffect, useState } from 'react';
import { SubscriptionStatusBadge } from '@/components/subscription-status-badge';

export function DaysLeft({
    startDate,
    endDate,
    initialDaysLeft,
    isExpired,
}: {
    startDate: string | null;
    endDate: string | null;
    initialDaysLeft: number | null;
    isExpired?: boolean;
}) {
    const [daysLeft, setDaysLeft] = useState<number | null>(initialDaysLeft);
    const [expired, setExpired] = useState<boolean>(isExpired || false);

    useEffect(() => {
        if (!endDate) {
            return;
        }

        const calculateDaysLeft = () => {
            // Parse end date in local timezone midnight
            const endParts = endDate.split(' ')[0].split('-');
            const end = new Date(
                parseInt(endParts[0]),
                parseInt(endParts[1]) - 1,
                parseInt(endParts[2]),
            );

            const now = new Date();
            // Reset now to midnight local time for accurate day difference
            now.setHours(0, 0, 0, 0);

            if (now.getTime() > end.getTime()) {
                setExpired(true);
                setDaysLeft(0);

                return;
            } else {
                setExpired(false);
            }

            let start = now;

            if (startDate) {
                const startParts = startDate.split(' ')[0].split('-');
                start = new Date(
                    parseInt(startParts[0]),
                    parseInt(startParts[1]) - 1,
                    parseInt(startParts[2]),
                );
            }

            if (now < start) {
                // Subscription has not started yet; days left is total duration
                const diffTime = end.getTime() - start.getTime();
                setDaysLeft(
                    Math.max(Math.round(diffTime / (1000 * 60 * 60 * 24)), 0),
                );
            } else {
                // Subscription is active
                const diffTime = end.getTime() - now.getTime();
                setDaysLeft(
                    Math.max(Math.round(diffTime / (1000 * 60 * 60 * 24)), 0),
                );
            }
        };

        calculateDaysLeft();

        // Update every hour (3600000 ms)
        const intervalId = setInterval(calculateDaysLeft, 1000 * 60 * 60);

        return () => clearInterval(intervalId);
    }, [startDate, endDate]);

    if (expired) {
        return <SubscriptionStatusBadge isExpired={true} />;
    }

    if (daysLeft === null) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <span
            className={`font-bold ${
                daysLeft <= 5
                    ? 'text-destructive'
                    : 'text-green-600 dark:text-green-400'
            }`}
        >
            {daysLeft}
        </span>
    );
}
