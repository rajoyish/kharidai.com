<?php

namespace App\Http\Controllers\Admin;

use App\Enums\NewsletterRecipientStatus;
use App\Enums\NewsletterStatus;
use App\Http\Controllers\Controller;
use App\Jobs\QueueNewsletterRecipients;
use App\Models\Newsletter;
use App\Models\NewsletterRecipient;
use App\Models\User;
use App\Services\Mail\EmailQuotaTracker;
use App\Services\Mail\SystemMailboxes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class NewsletterController extends Controller
{
    /**
     * How many recipient rows are built per insert. Large enough that a few
     * thousand users is a handful of round trips, small enough that neither the
     * hydrated chunk nor the insert statement is a memory problem on shared
     * hosting.
     */
    private const RECIPIENT_CHUNK = 500;

    public function index(Request $request, EmailQuotaTracker $tracker): Response
    {
        $newsletters = Newsletter::query()
            ->with('author:id,name')
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Newsletter $newsletter): array => $this->summarize($newsletter));

        return Inertia::render('Admin/Newsletters/Index', [
            'newsletters' => $newsletters,

            /*
             * Its own prop so the page can poll for it alone. The stats move every
             * time any email leaves the app, including transactional mail nobody on
             * this screen triggered, and re-sending the paginated list on every
             * tick would be most of the payload for none of the change.
             */
            'emailStats' => $tracker->stats(),
        ]);
    }

    public function create(Request $request, EmailQuotaTracker $tracker): Response
    {
        $selectedIds = $this->parseUserIds($request->query('users'));

        $selected = $selectedIds === []
            ? new EloquentCollection
            : $this->eligibleUsers()
                ->whereIn('id', $selectedIds)
                ->select(['id', 'name', 'email'])
                ->orderBy('name')
                ->get();

        return Inertia::render('Admin/Newsletters/Create', [
            'selectedUsers' => $selected->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])->all(),
            'audienceCount' => $this->eligibleUsers()->count(),
            'emailStats' => $tracker->stats(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateNewsletter($request);

        $newsletter = Newsletter::create([
            'user_id' => $request->user()->id,
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'status' => NewsletterStatus::Draft,
        ]);

        $this->syncRecipients($newsletter, $validated['audience'], $validated['user_ids'] ?? []);

        if ($validated['action'] === 'send') {
            return $this->dispatchNewsletter($newsletter);
        }

        return redirect()
            ->route('admin.newsletters.index')
            ->with('success', 'Newsletter saved as a draft.');
    }

    public function show(Newsletter $newsletter, EmailQuotaTracker $tracker): Response
    {
        $newsletter->loadMissing('author:id,name');

        $recipients = $newsletter->recipients()
            ->with('user:id,name')
            ->orderByRaw('case when status = ? then 0 else 1 end', [NewsletterRecipientStatus::Failed->value])
            ->orderBy('id')
            ->paginate(50)
            ->through(fn (NewsletterRecipient $recipient): array => [
                'id' => $recipient->id,
                'name' => $recipient->user?->name,
                'email' => $recipient->email,
                'status' => $recipient->status->value,
                'status_label' => $recipient->status->label(),
                'mailer' => $recipient->mailer,
                'sent_at' => $recipient->sent_at?->diffForHumans(),
                'error' => $recipient->error,
            ]);

        return Inertia::render('Admin/Newsletters/Show', [
            'newsletter' => [
                ...$this->summarize($newsletter),
                'body' => $newsletter->body,
            ],
            'recipients' => $recipients,
            'emailStats' => $tracker->stats(),
        ]);
    }

    public function edit(Newsletter $newsletter, EmailQuotaTracker $tracker): Response
    {
        $this->assertEditable($newsletter);

        $selected = $newsletter->recipients()
            ->with('user:id,name')
            ->orderBy('id')
            ->get();

        return Inertia::render('Admin/Newsletters/Edit', [
            'newsletter' => [
                'id' => $newsletter->id,
                'subject' => $newsletter->subject,
                'body' => $newsletter->body,
            ],
            'selectedUsers' => $selected->map(fn (NewsletterRecipient $recipient): array => [
                'id' => $recipient->user_id,
                'name' => $recipient->user->name,
                'email' => $recipient->email,
            ])->all(),
            'audienceCount' => $this->eligibleUsers()->count(),
            'emailStats' => $tracker->stats(),
        ]);
    }

    public function update(Request $request, Newsletter $newsletter): RedirectResponse
    {
        $this->assertEditable($newsletter);

        $validated = $this->validateNewsletter($request);

        $newsletter->update([
            'subject' => $validated['subject'],
            'body' => $validated['body'],
        ]);

        $this->syncRecipients($newsletter, $validated['audience'], $validated['user_ids'] ?? []);

        if ($validated['action'] === 'send') {
            return $this->dispatchNewsletter($newsletter);
        }

        return redirect()
            ->route('admin.newsletters.index')
            ->with('success', 'Newsletter updated.');
    }

    /**
     * Hand a saved draft to the queue.
     */
    public function send(Newsletter $newsletter): RedirectResponse
    {
        if ($newsletter->status !== NewsletterStatus::Draft) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'This newsletter has already been queued.']);

            return back();
        }

        return $this->dispatchNewsletter($newsletter);
    }

    public function destroy(Newsletter $newsletter): RedirectResponse
    {
        // Deleting mid-send would leave orphaned jobs holding a model that no
        // longer exists, and half a send list is not a record of anything.
        if ($newsletter->status->isInFlight()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Wait for this newsletter to finish sending before deleting it.']);

            return back();
        }

        $newsletter->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Newsletter deleted.']);

        return back();
    }

    /**
     * @return array{
     *     subject: string,
     *     body: string,
     *     audience: string,
     *     action: string,
     *     user_ids?: list<int>
     * }
     */
    private function validateNewsletter(Request $request): array
    {
        /** @var array{subject: string, body: string, audience: string, action: string, user_ids?: list<int>} $validated */
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'audience' => ['required', Rule::in(['all', 'selected'])],
            'user_ids' => ['required_if:audience,selected', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'action' => ['required', Rule::in(['draft', 'send'])],
        ]);

        return $validated;
    }

    private function assertEditable(Newsletter $newsletter): void
    {
        abort_unless($newsletter->status->isEditable(), 403, 'Only a draft newsletter can be edited.');
    }

    private function dispatchNewsletter(Newsletter $newsletter): RedirectResponse
    {
        if ($newsletter->recipient_count === 0) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'This newsletter has no recipients.']);

            return redirect()->route('admin.newsletters.edit', $newsletter);
        }

        $newsletter->markQueued();

        QueueNewsletterRecipients::dispatch($newsletter)->onQueue('newsletter');

        return redirect()
            ->route('admin.newsletters.show', $newsletter)
            ->with('success', "Queued for {$newsletter->recipient_count} recipient(s). Delivery is paced by the daily send quota.");
    }

    /**
     * Snapshot the send list onto the newsletter.
     *
     * Rebuilt from scratch on every draft save, and walked in chunks rather than
     * loaded at once: the row count follows the user table, and hydrating every
     * user to build it is exactly the query that runs a shared host out of memory.
     *
     * @param  list<int>  $userIds
     */
    private function syncRecipients(Newsletter $newsletter, string $audience, array $userIds): void
    {
        $newsletter->recipients()->delete();

        $query = $this->eligibleUsers();

        if ($audience === 'selected') {
            $query->whereIn('id', $userIds);
        }

        $now = now();
        $total = 0;

        $query->select(['id', 'email'])->chunkById(self::RECIPIENT_CHUNK, function ($users) use ($newsletter, $now, &$total): void {
            $rows = $users->map(fn (User $user): array => [
                'newsletter_id' => $newsletter->id,
                'user_id' => $user->id,
                'email' => $user->email,
                'status' => NewsletterRecipientStatus::Pending->value,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all();

            DB::table('newsletter_recipients')->insert($rows);

            $total += count($rows);
        });

        $newsletter->forceFill([
            'recipient_count' => $total,
            'sent_count' => 0,
            'failed_count' => 0,
        ])->save();
    }

    /**
     * Who a newsletter may go to.
     *
     * Three exclusions, all deliberate:
     *
     * - Banned accounts, because we have already decided not to talk to them.
     * - Admins, who run the shop rather than shop at it. A blast to the people
     *   who wrote it is noise, and it is the fastest way to train the team to
     *   ignore mail from their own domain.
     * - The app's own mailboxes. Mailing the address a newsletter was sent from
     *   is a loop, and the engagement signal it creates is one spam filters read
     *   badly. See {@see SystemMailboxes}.
     *
     * This is the single definition of the audience: the composer, the recipient
     * snapshot, and the "every registered user" count all read it, so none of
     * them can disagree with the others.
     *
     * @return Builder<User>
     */
    private function eligibleUsers(): Builder
    {
        $systemAddresses = app(SystemMailboxes::class)->all();

        return User::query()
            ->whereNull('banned_at')
            ->whereNotNull('email')
            ->where('is_admin', false)
            ->when(
                $systemAddresses !== [],
                // Compared lowercased: MySQL's default collation would match
                // either way, SQLite's `=` would not, and the test suite runs on
                // SQLite.
                fn (Builder $query) => $query->whereNotIn(DB::raw('lower(email)'), $systemAddresses),
            );
    }

    /**
     * @return list<int>
     */
    private function parseUserIds(mixed $value): array
    {
        if (! is_string($value) || $value === '') {
            return [];
        }

        $ids = array_map(
            static fn (string $id): int => (int) trim($id),
            explode(',', $value),
        );

        return array_values(array_unique(array_filter(
            $ids,
            static fn (int $id): bool => $id > 0,
        )));
    }

    /**
     * @return array<string, mixed>
     */
    private function summarize(Newsletter $newsletter): array
    {
        return [
            'id' => $newsletter->id,
            'subject' => $newsletter->subject,
            'status' => $newsletter->status->value,
            'status_label' => $newsletter->status->label(),
            'is_editable' => $newsletter->status->isEditable(),
            'is_in_flight' => $newsletter->status->isInFlight(),
            'author' => $newsletter->author?->name,
            'recipient_count' => $newsletter->recipient_count,
            'sent_count' => $newsletter->sent_count,
            'failed_count' => $newsletter->failed_count,
            'queued_at' => $newsletter->queued_at?->diffForHumans(),
            'completed_at' => $newsletter->completed_at?->diffForHumans(),
            'created_at' => $newsletter->created_at?->format('n/j/Y'),
        ];
    }
}
