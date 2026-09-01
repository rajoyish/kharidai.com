<?php

use App\Enums\NewsletterRecipientStatus;
use App\Enums\NewsletterStatus;
use App\Jobs\SendNewsletterEmail;
use App\Models\EmailDispatch;
use App\Models\Newsletter;
use App\Models\NewsletterRecipient;
use App\Models\User;
use App\Services\Mail\EmailQuotaTracker;
use App\Services\Mail\EmailRouter;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    config()->set('mail.mailers.brevo.transport', 'array');
    config()->set('mail.mailers.gmail.transport', 'array');
    config()->set('mail.quota.mailers', ['brevo' => 2, 'gmail' => 3]);

    Mail::purge('brevo');
    Mail::purge('gmail');
});

function newsletterAdmin(): User
{
    return User::factory()->create(['is_admin' => true]);
}

test('an admin sees the newsletter list with the current send quota', function () {
    Newsletter::factory()->create(['subject' => 'Spring sale']);

    $response = $this->actingAs(newsletterAdmin())
        ->get(route('admin.newsletters.index'))
        ->assertSuccessful();

    expect($response->inertiaProps('newsletters')['data'][0]['subject'])->toBe('Spring sale')
        ->and($response->inertiaProps('emailStats')['total_limit'])->toBe(5)
        ->and($response->inertiaProps('emailStats')['total_remaining'])->toBe(5);
});

test('the composer preselects the users named in the query string', function () {
    $selected = User::factory()->create(['name' => 'Asha']);
    User::factory()->create(['name' => 'Not picked']);

    $response = $this->actingAs(newsletterAdmin())
        ->get(route('admin.newsletters.create', ['users' => "{$selected->id},0,{$selected->id}"]))
        ->assertSuccessful();

    expect($response->inertiaProps('selectedUsers'))->toHaveCount(1)
        ->and($response->inertiaProps('selectedUsers')[0]['name'])->toBe('Asha');
});

test('a draft snapshots its recipients without sending anything', function () {
    $admin = newsletterAdmin();
    $recipient = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Draft subject',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => [$recipient->id],
            'action' => 'draft',
        ])
        ->assertRedirect(route('admin.newsletters.index'));

    $newsletter = Newsletter::firstOrFail();

    expect($newsletter->status)->toBe(NewsletterStatus::Draft)
        ->and($newsletter->recipient_count)->toBe(1)
        ->and(EmailDispatch::count())->toBe(0);
});

test('sending a newsletter delivers to every selected user and closes it', function () {
    $admin = newsletterAdmin();
    $recipients = User::factory()->count(2)->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => $recipients->pluck('id')->all(),
            'action' => 'send',
        ])
        ->assertRedirect();

    $newsletter = Newsletter::firstOrFail();

    expect($newsletter->status)->toBe(NewsletterStatus::Sent)
        ->and($newsletter->sent_count)->toBe(2)
        ->and($newsletter->failed_count)->toBe(0)
        ->and(EmailDispatch::pluck('recipient')->sort()->values()->all())
        ->toBe($recipients->pluck('email')->sort()->values()->all());
});

test('a banned user is never mailed, even when explicitly selected', function () {
    $admin = newsletterAdmin();
    $banned = User::factory()->create(['banned_at' => now()]);
    $active = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => [$banned->id, $active->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    expect(EmailDispatch::pluck('recipient')->all())->toBe([$active->email]);
});

test('a send spills over to gmail once the brevo allowance is spent', function () {
    $admin = newsletterAdmin();
    $recipients = User::factory()->count(3)->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'all',
            'action' => 'send',
        ])
        ->assertRedirect();

    // The admin is a registered user too, so "everyone" is four addresses: two on
    // Brevo's allowance, then the rest on Gmail's.
    expect(EmailDispatch::where('mailer', 'brevo')->count())->toBe(2)
        ->and(EmailDispatch::where('mailer', 'gmail')->count())->toBe(2)
        ->and($recipients)->toHaveCount(3);
});

test('a send that runs out of quota pauses instead of dropping the recipient', function () {
    config()->set('mail.quota.mailers', ['brevo' => 1, 'gmail' => 0]);

    $newsletter = Newsletter::factory()->sending()->create();
    $user = User::factory()->create();

    $recipient = NewsletterRecipient::create([
        'newsletter_id' => $newsletter->id,
        'user_id' => $user->id,
        'email' => $user->email,
        'status' => NewsletterRecipientStatus::Pending,
    ]);

    app(EmailQuotaTracker::class)->record('brevo', 'someone@example.test');

    (new SendNewsletterEmail($recipient))->handle(
        app(EmailRouter::class),
        app(EmailQuotaTracker::class),
    );

    expect($recipient->fresh()->status)->toBe(NewsletterRecipientStatus::Pending)
        ->and($newsletter->fresh()->status)->toBe(NewsletterStatus::Paused)
        ->and(EmailDispatch::count())->toBe(1);
});

test('the html the editor produced is what the mailbox receives', function () {
    $admin = newsletterAdmin();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Formatting check',
            'body' => '<h2>Big news</h2><p>Something <strong>bold</strong> happened.</p>',
            'audience' => 'selected',
            'user_ids' => [$admin->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    $message = Mail::mailer('brevo')->getSymfonyTransport()->messages()->first();
    $sent = $message->getOriginalMessage();

    // Markdown mailables run their view through CommonMark, which passes raw HTML
    // through. If that ever changes, the admin's formatting arrives as visible
    // tags and this is the test that says so. The tag carries an inlined style
    // attribute by the time it is sent, so the assertion matches around it.
    expect($sent->getHtmlBody())->toContain('>bold</strong>')
        ->toContain('<h2 ')
        ->toContain('Big news')
        ->and($sent->getTextBody())->toContain('Something bold happened.')
        ->not->toContain('<strong>');
});

test('a delivery failure is recorded against the recipient and closes the newsletter', function () {
    $newsletter = Newsletter::factory()->sending()->create(['recipient_count' => 1]);
    $user = User::factory()->create();

    $recipient = NewsletterRecipient::create([
        'newsletter_id' => $newsletter->id,
        'user_id' => $user->id,
        'email' => $user->email,
        'status' => NewsletterRecipientStatus::Pending,
    ]);

    (new SendNewsletterEmail($recipient))->failed(new RuntimeException('SMTP refused the address.'));

    expect($recipient->fresh()->status)->toBe(NewsletterRecipientStatus::Failed)
        ->and($recipient->fresh()->error)->toContain('SMTP refused')
        ->and($newsletter->fresh()->status)->toBe(NewsletterStatus::Sent)
        ->and($newsletter->fresh()->failed_count)->toBe(1);
});

test('a newsletter with no recipients is not queued', function () {
    Queue::fake();

    $this->actingAs(newsletterAdmin())
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Nobody home',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => [],
            'action' => 'send',
        ])
        ->assertSessionHasErrors('user_ids');

    expect(Newsletter::count())->toBe(0);
});

test('a queued newsletter can no longer be edited', function () {
    $newsletter = Newsletter::factory()->queued()->create();

    $this->actingAs(newsletterAdmin())
        ->get(route('admin.newsletters.edit', $newsletter))
        ->assertForbidden();
});

test('a newsletter still sending cannot be deleted', function () {
    $newsletter = Newsletter::factory()->sending()->create();

    $this->actingAs(newsletterAdmin())
        ->from(route('admin.newsletters.index'))
        ->delete(route('admin.newsletters.destroy', $newsletter))
        ->assertRedirect(route('admin.newsletters.index'));

    expect(Newsletter::whereKey($newsletter->id)->exists())->toBeTrue();
});

test('a non-admin cannot reach the newsletter screens', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('admin.newsletters.index'))
        ->assertForbidden();
});
