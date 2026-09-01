import { Link, router, useForm } from '@inertiajs/react';
import { Maximize2, Minimize2, Send, Users } from 'lucide-react';
import type { EditorInstance } from 'novel';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { EmailQuotaStats } from '@/components/email-quota-stats';
import type { EmailQuotaSummary } from '@/components/email-quota-stats';
import { NewsletterPlaceholders } from '@/components/newsletter-placeholders';
import type { NewsletterPlaceholder } from '@/components/newsletter-placeholders';
import { NewsletterRecipientExclusions } from '@/components/newsletter-recipient-exclusions';
import { NewsletterRecipientPicker } from '@/components/newsletter-recipient-picker';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import NovelEditor from '@/components/ui/editor/novel-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaManager } from '@/components/ui/media-manager';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export type NewsletterRecipientOption = {
    id: number;
    name: string;
    email: string;
};

type NewsletterComposerProps = {
    submitUrl: string;
    cancelUrl: string;
    /** The draft being edited. Absent when composing a new newsletter. */
    newsletter?: { id: number; subject: string; body: string };
    selectedUsers: NewsletterRecipientOption[];
    /** How many users a newsletter addressed to everyone would reach. */
    audienceCount: number;
    /**
     * That same audience by name, for the exclusion dialog. An optional prop, so
     * it is absent until the dialog asks for it with a partial reload.
     */
    audienceUsers?: NewsletterRecipientOption[];
    /** The {tags} the send knows how to resolve, listed beside the editor. */
    placeholders: NewsletterPlaceholder[];
    emailStats?: EmailQuotaSummary;
};

export function NewsletterComposer({
    submitUrl,
    cancelUrl,
    newsletter,
    selectedUsers,
    audienceCount,
    audienceUsers,
    placeholders,
    emailStats,
}: NewsletterComposerProps) {
    const isEditing = Boolean(newsletter);
    const [isEditorExpanded, setIsEditorExpanded] = useState(false);

    /** Held so the placeholder list can write into the body at the cursor. */
    const editorRef = useRef<EditorInstance | null>(null);

    /**
     * Whether the audience fetch has already gone out. A ref, not state: the
     * effect below asks on the first render of the selected branch, and setting
     * state from an effect is what `react-hooks/set-state-in-effect` forbids.
     * Nothing renders differently for it either — the skeletons key off
     * `audienceUsers` still being undefined.
     */
    const hasRequestedAudience = useRef(false);

    /**
     * `audienceUsers` is an optional prop, so the page arrives without it. Two
     * controls need it — the picker on the selected branch and the exclusion
     * dialog on the everyone branch — so the fetch lives here and both ask.
     */
    const requestAudience = useCallback(() => {
        if (audienceUsers !== undefined || hasRequestedAudience.current) {
            return;
        }

        hasRequestedAudience.current = true;
        router.reload({ only: ['audienceUsers'] });
    }, [audienceUsers]);

    /**
     * The picked recipients, kept as objects rather than ids so the list can name
     * who it is about after the user has navigated away from the users table.
     */
    const [recipients, setRecipients] =
        useState<NewsletterRecipientOption[]>(selectedUsers);

    const { data, setData, post, processing, errors, transform } = useForm({
        _method: isEditing ? 'put' : 'post',
        subject: newsletter?.subject ?? '',
        body: newsletter?.body ?? '',
        audience: selectedUsers.length > 0 ? 'selected' : 'all',
        user_ids: selectedUsers.map((user) => user.id),
        /** Who to drop from an "every registered user" send. */
        excluded_user_ids: [] as number[],
        action: 'draft',
    });

    // The picker is unusable without the list, so entering that branch fetches it
    // rather than waiting for the admin to click into an empty field.
    useEffect(() => {
        if (data.audience === 'selected') {
            requestAudience();
        }
    }, [data.audience, requestAudience]);

    useEffect(() => {
        if (!isEditorExpanded) {
            return;
        }

        const exitOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsEditorExpanded(false);
            }
        };

        window.addEventListener('keydown', exitOnEscape);

        return () => window.removeEventListener('keydown', exitOnEscape);
    }, [isEditorExpanded]);

    const insertPlaceholder = (tag: string) => {
        // focus() before the insert puts the cursor back where it was left, so a
        // tag clicked from the sidebar lands mid-sentence rather than at the top.
        editorRef.current?.chain().focus().insertContent(tag).run();
    };

    const setRecipientSelection = (users: NewsletterRecipientOption[]) => {
        setRecipients(users);
        setData(
            'user_ids',
            users.map((user) => user.id),
        );
    };

    /**
     * Which button was pressed rides on the request rather than in form state:
     * `setData` is asynchronous, so staging the action and submitting in the same
     * handler would serialise the previous value. `transform` is applied when the
     * request is built, so setting it here is read by the `post` on the next line.
     */
    const submit = (event: FormEvent, action: 'draft' | 'send') => {
        event.preventDefault();

        transform((current) => ({
            ...current,
            action,
            // A newsletter addressed to everyone resolves its list server-side, so
            // shipping thousands of ids the server will ignore is wasted payload.
            // The exclusions are the mirror image: they only mean anything to a
            // send that resolves its own list.
            user_ids: current.audience === 'all' ? [] : current.user_ids,
            excluded_user_ids:
                current.audience === 'all' ? current.excluded_user_ids : [],
        }));

        post(submitUrl);
    };

    const recipientTotal =
        data.audience === 'all'
            ? Math.max(audienceCount - data.excluded_user_ids.length, 0)
            : recipients.length;

    return (
        <form
            onSubmit={(event) => submit(event, 'draft')}
            className="flex w-full flex-col gap-6"
        >
            {/*
                Page-level actions, in the same top-right position the rest of
                the admin uses. `position: sticky` is inert inside this shell:
                <main> computes to `overflow: hidden auto`, which makes it a
                scrollport that never scrolls, so a pinned footer would simply
                sit at the bottom of a very long form.
            */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b pb-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4 shrink-0" />
                    Sending to{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                        {recipientTotal}
                    </span>{' '}
                    {recipientTotal === 1 ? 'person' : 'people'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link href={cancelUrl}>Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        variant="outline"
                        disabled={processing}
                    >
                        Save as draft
                    </Button>
                    <Button
                        type="button"
                        disabled={processing || recipientTotal === 0}
                        onClick={(event) => submit(event, 'send')}
                    >
                        <Send className="size-4" />
                        {processing ? 'Working...' : 'Queue and send'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
                {/*
                    Subject and body share one surface, so the form reads as the
                    email being written rather than as two unrelated fields in
                    two unrelated boxes.
                */}
                <Card
                    className={cn(
                        'min-w-0 gap-0 py-0',
                        isEditorExpanded &&
                            'fixed inset-4 z-50 overflow-hidden shadow-2xl',
                    )}
                >
                    <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
                        <div className="min-w-0 flex-1">
                            <Label
                                htmlFor="subject"
                                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                            >
                                Subject
                            </Label>
                            <Input
                                id="subject"
                                value={data.subject}
                                onChange={(event) =>
                                    setData('subject', event.target.value)
                                }
                                placeholder="What is this newsletter about?"
                                className="mt-1.5 h-auto rounded-none border-0 bg-transparent p-0 text-lg font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-xl"
                                required
                            />
                            {errors.subject && (
                                <p className="mt-2 text-xs font-medium text-destructive">
                                    {errors.subject}
                                </p>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <MediaManager />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                    setIsEditorExpanded(!isEditorExpanded)
                                }
                                aria-label={
                                    isEditorExpanded
                                        ? 'Exit full screen'
                                        : 'Expand editor to full screen'
                                }
                            >
                                {isEditorExpanded ? (
                                    <Minimize2 className="size-4" />
                                ) : (
                                    <Maximize2 className="size-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div
                        className={cn(
                            'flex flex-col p-5 sm:p-6',
                            isEditorExpanded && 'min-h-0 flex-1',
                        )}
                    >
                        <p className="mb-3 text-xs text-muted-foreground">
                            Type &quot;/&quot; for formatting commands. This is
                            the same editor the blog uses.
                        </p>
                        <NovelEditor
                            initialValue={data.body}
                            onChange={(html) => setData('body', html)}
                            onReady={(editor) => {
                                editorRef.current = editor;
                            }}
                            className={cn(
                                // The card already draws the box. A second
                                // border around the editor is a box in a box.
                                'min-h-104 resize-none rounded-none border-0 bg-transparent px-0 py-0 focus-within:ring-0 focus-within:ring-offset-0',
                                isEditorExpanded &&
                                    'h-full min-h-0 flex-1 resize-none',
                            )}
                            contentClassName="w-full max-w-[72ch]"
                        />
                        {errors.body && (
                            <p className="mt-2 text-xs font-medium text-destructive">
                                {errors.body}
                            </p>
                        )}
                    </div>
                </Card>

                <div className="grid gap-6 lg:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recipients</CardTitle>
                            <CardDescription>
                                Only accounts that signed in with Google are
                                eligible. Banned accounts and admins are always
                                excluded.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <RadioGroup
                                value={data.audience}
                                onValueChange={(value) =>
                                    setData('audience', value)
                                }
                                className="gap-3"
                            >
                                <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-surface">
                                    <RadioGroupItem
                                        value="selected"
                                        id="audience-selected"
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="audience-selected"
                                        className="grid gap-0.5 font-normal"
                                    >
                                        <span className="font-medium">
                                            Selected users
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {recipients.length === 0
                                                ? 'Search for people below.'
                                                : `${recipients.length} chosen`}
                                        </span>
                                    </Label>
                                </div>

                                <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-surface">
                                    <RadioGroupItem
                                        value="all"
                                        id="audience-all"
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="audience-all"
                                        className="grid gap-0.5 font-normal"
                                    >
                                        <span className="font-medium">
                                            Every registered user
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {audienceCount} accounts
                                        </span>
                                    </Label>
                                </div>
                            </RadioGroup>

                            {data.audience === 'all' && (
                                <NewsletterRecipientExclusions
                                    audienceUsers={audienceUsers}
                                    onRequestAudience={requestAudience}
                                    audienceCount={audienceCount}
                                    excludedIds={data.excluded_user_ids}
                                    onChange={(excludedIds) =>
                                        setData(
                                            'excluded_user_ids',
                                            excludedIds,
                                        )
                                    }
                                />
                            )}

                            {errors.user_ids && (
                                <p className="text-xs font-medium text-destructive">
                                    {errors.user_ids}
                                </p>
                            )}

                            {data.audience === 'selected' && (
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="recipient-search"
                                        className="text-xs text-muted-foreground"
                                    >
                                        Who should get this
                                    </Label>
                                    <NewsletterRecipientPicker
                                        inputId="recipient-search"
                                        audienceUsers={audienceUsers}
                                        value={recipients}
                                        onChange={setRecipientSelection}
                                        invalid={Boolean(errors.user_ids)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <NewsletterPlaceholders
                        placeholders={placeholders}
                        onInsert={insertPlaceholder}
                    />

                    {emailStats && <EmailQuotaStats stats={emailStats} />}
                </div>
            </div>
        </form>
    );
}
