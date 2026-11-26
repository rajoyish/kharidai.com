import { router, usePage } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';
import { useState } from 'react';

import {
    dismiss as dismissNotice,
    index as noticesIndex,
} from '@/actions/App/Http/Controllers/User/NoticeController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { PageProps } from '@/types';

/**
 * Pops the oldest published notice the user has not closed yet.
 *
 * Which notice is pending comes from the `pendingNotice` prop shared by
 * `HandleInertiaRequests`. Closing it in any way records the dismissal on the
 * server, so it never pops again on any device, and the next pending notice
 * (if any) arrives with the response.
 */
export function NoticePopup() {
    const { pendingNotice } = usePage<PageProps>().props;

    // Hidden at once on close rather than after the round trip, so the dialog
    // does not linger while the dismissal is saved.
    const [closedNoticeId, setClosedNoticeId] = useState<number | null>(null);

    if (!pendingNotice || pendingNotice.id === closedNoticeId) {
        return null;
    }

    /**
     * Records the dismissal, then optionally moves on. The follow-up visit waits
     * for the dismissal to land: starting it at once would cancel the POST,
     * because Inertia cancels an in-flight visit when the next one begins.
     */
    const close = (thenVisit?: string) => {
        setClosedNoticeId(pendingNotice.id);
        router.post(
            dismissNotice.url(pendingNotice.id),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (thenVisit) {
                        router.visit(thenVisit);
                    }
                },
            },
        );
    };

    return (
        <Dialog
            open
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    close();
                }
            }}
        >
            <DialogContent data-test="notice-popup">
                <DialogHeader>
                    <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Megaphone className="size-5" />
                    </div>
                    <DialogTitle>{pendingNotice.title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        An announcement from the Kharidai team.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {pendingNotice.body}
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => close(noticesIndex.url())}
                    >
                        All notices
                    </Button>
                    <Button
                        onClick={() => close()}
                        data-test="notice-popup-dismiss"
                    >
                        Got it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
