import { router } from '@inertiajs/react';
import { UserRoundMinus } from 'lucide-react';
import { useState } from 'react';

import type { NewsletterRecipientOption } from '@/components/newsletter-composer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type NewsletterRecipientExclusionsProps = {
    /** Everyone the newsletter would reach. Undefined until the prop is loaded. */
    audienceUsers?: NewsletterRecipientOption[];
    /** How many the send reaches before any exclusions. */
    audienceCount: number;
    excludedIds: number[];
    onChange: (excludedIds: number[]) => void;
};

/**
 * Lets an admin drop individuals from an "every registered user" send without
 * turning it into a hand-picked list. The unchecked ids ride along with the
 * form; the audience itself is still resolved server-side at save time.
 */
export function NewsletterRecipientExclusions({
    audienceUsers,
    audienceCount,
    excludedIds,
    onChange,
}: NewsletterRecipientExclusionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * The audience list is an optional prop, so the page arrives without it.
     * Opening the dialog is what asks for it: an admin can sit on the composer
     * for a long time and never touch the recipient list, and naming every
     * customer up front is payload spent on a maybe.
     */
    const openDialog = () => {
        setIsOpen(true);

        if (audienceUsers !== undefined || isLoading) {
            return;
        }

        setIsLoading(true);
        router.reload({
            only: ['audienceUsers'],
            onFinish: () => setIsLoading(false),
        });
    };

    const setIncluded = (id: number, isIncluded: boolean) => {
        onChange(
            isIncluded
                ? excludedIds.filter((excludedId) => excludedId !== id)
                : [...excludedIds, id],
        );
    };

    const excludedCount = excludedIds.length;
    const includedCount = Math.max(audienceCount - excludedCount, 0);

    return (
        <div className="grid gap-2">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openDialog}
            >
                <UserRoundMinus className="size-4" />
                Edit recipients
            </Button>

            {excludedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                    {excludedCount} {excludedCount === 1 ? 'person' : 'people'}{' '}
                    excluded from this send.
                </p>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit recipients</DialogTitle>
                        <DialogDescription>
                            Everyone here is included. Uncheck anyone this
                            newsletter should skip.
                        </DialogDescription>
                    </DialogHeader>

                    {audienceUsers === undefined ? (
                        <div
                            className="grid gap-2 py-2"
                            role="status"
                            aria-label="Loading recipients"
                        >
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 px-2 py-1.5"
                                >
                                    <Skeleton className="size-4 rounded-[4px]" />
                                    <div className="grid flex-1 gap-1.5">
                                        <Skeleton className="h-3.5 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : audienceUsers.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No registered users are eligible for a newsletter
                            yet.
                        </p>
                    ) : (
                        <ul className="max-h-[50vh] space-y-1 overflow-y-auto rounded-lg border p-2">
                            {audienceUsers.map((user) => {
                                const isIncluded = !excludedIds.includes(
                                    user.id,
                                );

                                return (
                                    <li key={user.id}>
                                        <Label
                                            htmlFor={`recipient-${user.id}`}
                                            className="flex items-start gap-3 rounded px-2 py-1.5 font-normal hover:bg-muted/60"
                                        >
                                            <Checkbox
                                                id={`recipient-${user.id}`}
                                                checked={isIncluded}
                                                onCheckedChange={(checked) =>
                                                    setIncluded(
                                                        user.id,
                                                        checked === true,
                                                    )
                                                }
                                                className="mt-0.5"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium">
                                                    {user.name}
                                                </span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {user.email}
                                                </span>
                                            </span>
                                        </Label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <DialogFooter className="sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground tabular-nums">
                                {includedCount}
                            </span>{' '}
                            of {audienceCount} included
                        </p>
                        <div className="flex gap-2">
                            {excludedCount > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onChange([])}
                                >
                                    Include everyone
                                </Button>
                            )}
                            <DialogClose asChild>
                                <Button type="button">Done</Button>
                            </DialogClose>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
