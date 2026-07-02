import { useEffect, useState } from 'react';

export function DaysLeft({
    startDate,
    endDate,
    initialDaysLeft,
}: {
    startDate: string | null;
    endDate: string | null;
    initialDaysLeft: number | null;
}) {
    const [daysLeft, setDaysLeft] = useState<number | null>(initialDaysLeft);

    useEffect(() => {
        if (!endDate) return;

        const calculateDaysLeft = () => {
            // Parse end date in local timezone midnight
            const endParts = endDate.split(' ')[0].split('-');
            const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
            
            const now = new Date();
            // Reset now to midnight local time for accurate day difference
            now.setHours(0, 0, 0, 0);

            let start = now;
            if (startDate) {
                const startParts = startDate.split(' ')[0].split('-');
                start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
            }

            if (now < start) {
                // Subscription has not started yet; days left is total duration
                const diffTime = end.getTime() - start.getTime();
                setDaysLeft(Math.round(diffTime / (1000 * 60 * 60 * 24)));
            } else {
                // Subscription is active
                const diffTime = end.getTime() - now.getTime();
                setDaysLeft(Math.round(diffTime / (1000 * 60 * 60 * 24)));
            }
        };

        calculateDaysLeft();

        // Update every hour (3600000 ms)
        const intervalId = setInterval(calculateDaysLeft, 1000 * 60 * 60);

        return () => clearInterval(intervalId);
    }, [startDate, endDate]);

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
