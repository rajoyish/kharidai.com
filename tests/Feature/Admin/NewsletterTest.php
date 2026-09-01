<?php

use App\Enums\NewsletterRecipientStatus;
use App\Enums\NewsletterStatus;
use App\Jobs\SendNewsletterEmail;
use App\Models\EmailDispatch;
use App\Models\Newsletter;
use App\Models\NewsletterRecipient;
use App\Models\Order;
use App\Models\User;
use App\Services\Mail\EmailQuotaTracker;
use App\Services\Mail\EmailRouter;
use App\Services\Mail\SystemMailboxes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

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
    User::factory()->count(3)->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'all',
            'action' => 'send',
        ])
        ->assertRedirect();

    // "Everyone" is the three customers, not the admin who wrote it: two go on
    // Brevo's allowance of 2, then the third spills to Gmail.
    expect(EmailDispatch::where('mailer', 'brevo')->count())->toBe(2)
        ->and(EmailDispatch::where('mailer', 'gmail')->count())->toBe(1);
});

test('an account created by hand is never mailed, whatever its address', function () {
    $admin = newsletterAdmin();
    // A gmail.com address someone typed into the registration form is still a
    // hand-made account. The domain is not what makes a recipient eligible.
    $manual = User::factory()->manual()->create(['email' => 'typed-in@gmail.com']);
    $signedIn = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => [$manual->id, $signedIn->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    expect(EmailDispatch::pluck('recipient')->all())->toBe([$signedIn->email])
        ->and(Newsletter::firstOrFail()->recipient_count)->toBe(1);
});

test('the audience count leaves out accounts that never signed in with google', function () {
    User::factory()->count(2)->create();
    User::factory()->manual()->count(3)->create();

    $response = $this->actingAs(newsletterAdmin())
        ->get(route('admin.newsletters.create'))
        ->assertSuccessful();

    expect($response->inertiaProps('audienceCount'))->toBe(2);
});

test('the full audience list is only sent when the exclusion dialog asks for it', function () {
    User::factory()->create(['name' => 'Asha']);
    User::factory()->manual()->create(['name' => 'Typed in by hand']);

    $this->actingAs(newsletterAdmin())
        ->get(route('admin.newsletters.create'))
        ->assertSuccessful()
        ->assertInertia(fn (AssertableInertia $page) => $page
            // Optional, so a plain visit does not name every customer on a page
            // most composes never ask it of.
            ->missing('audienceUsers')
            ->reloadOnly('audienceUsers', fn (AssertableInertia $reloaded) => $reloaded
                ->has('audienceUsers', 1)
                ->where('audienceUsers.0.name', 'Asha')
                ->etc()
            )
            ->etc()
        );
});

test('an excluded user is dropped from an every-registered-user send', function () {
    $admin = newsletterAdmin();
    $excluded = User::factory()->create();
    $included = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'all',
            'excluded_user_ids' => [$excluded->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    expect(EmailDispatch::pluck('recipient')->all())->toBe([$included->email])
        ->and(Newsletter::firstOrFail()->recipient_count)->toBe(1);
});

test('exclusions are ignored by a send addressed to a picked list', function () {
    $admin = newsletterAdmin();
    $picked = User::factory()->count(2)->create();

    // The picked list is edited in place, so a stale exclusion left over from
    // toggling the audience back and forth must not quietly shrink it.
    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => $picked->pluck('id')->all(),
            'excluded_user_ids' => [$picked->first()->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    expect(Newsletter::firstOrFail()->recipient_count)->toBe(2);
});

test('an admin is never mailed, even when explicitly selected', function () {
    $admin = newsletterAdmin();
    $otherAdmin = User::factory()->create(['is_admin' => true]);
    $customer = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => [$otherAdmin->id, $customer->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    expect(EmailDispatch::pluck('recipient')->all())->toBe([$customer->email])
        ->and(Newsletter::firstOrFail()->recipient_count)->toBe(1);
});

test('the mailboxes the app sends from are never mailed', function () {
    config()->set('mail.from.address', 'shop@kharidai.test');
    config()->set('mail.mailers.gmail.username', 'sender@gmail.test');

    $admin = newsletterAdmin();
    $shopAccount = User::factory()->create(['email' => 'shop@kharidai.test']);
    $sendingAccount = User::factory()->create(['email' => 'SENDER@gmail.test']);
    $customer = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Weekly news',
            'body' => '<p>Hello there.</p>',
            'audience' => 'selected',
            'user_ids' => [$shopAccount->id, $sendingAccount->id, $customer->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    expect(EmailDispatch::pluck('recipient')->all())->toBe([$customer->email]);
});

test('the composer does not offer an admin as a preselected recipient', function () {
    $admin = newsletterAdmin();
    $customer = User::factory()->create(['name' => 'Asha']);

    $response = $this->actingAs($admin)
        ->get(route('admin.newsletters.create', ['users' => "{$admin->id},{$customer->id}"]))
        ->assertSuccessful();

    expect($response->inertiaProps('selectedUsers'))->toHaveCount(1)
        ->and($response->inertiaProps('selectedUsers')[0]['name'])->toBe('Asha');
});

test('a recipient promoted to admin after queueing is skipped rather than mailed', function () {
    $newsletter = Newsletter::factory()->sending()->create(['recipient_count' => 1]);
    $user = User::factory()->create();

    $recipient = NewsletterRecipient::create([
        'newsletter_id' => $newsletter->id,
        'user_id' => $user->id,
        'email' => $user->email,
        'status' => NewsletterRecipientStatus::Pending,
    ]);

    // The send list is a snapshot, so the promotion happens after it was taken.
    $user->forceFill(['is_admin' => true])->save();

    (new SendNewsletterEmail($recipient))->handle(
        app(EmailRouter::class),
        app(EmailQuotaTracker::class),
        app(SystemMailboxes::class),
    );

    expect($recipient->fresh()->status)->toBe(NewsletterRecipientStatus::Skipped)
        ->and(EmailDispatch::count())->toBe(0)
        ->and($newsletter->fresh()->status)->toBe(NewsletterStatus::Sent);
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
        app(SystemMailboxes::class),
    );

    expect($recipient->fresh()->status)->toBe(NewsletterRecipientStatus::Pending)
        ->and($newsletter->fresh()->status)->toBe(NewsletterStatus::Paused)
        ->and(EmailDispatch::count())->toBe(1);
});

/**
 * Send one body to everybody named and hand back what each address received,
 * keyed by address.
 *
 * @param  list<int>  $userIds
 * @return array<string, string>
 */
function newsletterBodiesFor(string $body, array $userIds): array
{
    test()->actingAs(newsletterAdmin())
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Placeholder check',
            'body' => $body,
            'audience' => 'selected',
            'user_ids' => $userIds,
            'action' => 'send',
        ])
        ->assertRedirect();

    $delivered = [];

    foreach (['brevo', 'gmail'] as $mailer) {
        foreach (Mail::mailer($mailer)->getSymfonyTransport()->messages() as $message) {
            $sent = $message->getOriginalMessage();
            $to = $sent->getTo()[0]->getAddress();
            $delivered[$to] = (string) $sent->getHtmlBody();
        }
    }

    return $delivered;
}

test('each recipient gets their own details in place of the tags', function () {
    $alex = User::factory()->create(['name' => 'Alex Rai', 'email' => 'alex@example.test']);
    $bina = User::factory()->create(['name' => 'Bina Shrestha', 'email' => 'bina@example.test']);

    $bodies = newsletterBodiesFor(
        '<p>Hi {first_name}, we have you at {email}. Full name: {name}.</p>',
        [$alex->id, $bina->id],
    );

    expect($bodies['alex@example.test'])
        ->toContain('Hi Alex, we have you at alex@example.test. Full name: Alex Rai.')
        ->and($bodies['bina@example.test'])
        ->toContain('Hi Bina, we have you at bina@example.test. Full name: Bina Shrestha.');
});

test('order tags resolve against the recipients most recent order', function () {
    $user = User::factory()->create(['email' => 'buyer@example.test']);

    Order::factory()->for($user)->create([
        'order_number' => 'ORD-OLDER',
        'created_at' => now()->subMonths(2),
    ]);
    Order::factory()->for($user)->create([
        'order_number' => 'ORD-NEWEST',
        'created_at' => now()->subDays(3)->setTime(9, 0),
    ]);

    $bodies = newsletterBodiesFor(
        '<p>Order {latest_order_number} on {latest_order_date}. That is {total_orders} so far.</p>',
        [$user->id],
    );

    $expectedDate = now()->subDays(3)->format('F j, Y');

    expect($bodies['buyer@example.test'])
        ->toContain("Order ORD-NEWEST on {$expectedDate}. That is 2 so far.");
});

test('a recipient who has never ordered gets a gap rather than a broken tag', function () {
    $user = User::factory()->create(['email' => 'browser@example.test']);

    $bodies = newsletterBodiesFor(
        '<p>Order [{latest_order_number}] on [{latest_order_date}], total [{total_orders}].</p>',
        [$user->id],
    );

    expect($bodies['browser@example.test'])->toContain('Order [] on [], total [0].');
});

test('a name with markup characters is escaped rather than injected', function () {
    $user = User::factory()->create([
        'name' => 'Ram & Sons <script>',
        'email' => 'ram@example.test',
    ]);

    $bodies = newsletterBodiesFor('<p>Hi {name}.</p>', [$user->id]);

    expect($bodies['ram@example.test'])
        ->toContain('Ram &amp; Sons &lt;script&gt;')
        ->not->toContain('<script>');
});

test('a tag the send does not know is left exactly as written', function () {
    $user = User::factory()->create(['name' => 'Asha Gurung', 'email' => 'asha@example.test']);

    // An admin who typed {discount_code} meant it. Deleting it silently would be
    // a worse surprise than seeing it arrive.
    $bodies = newsletterBodiesFor('<p>Hi {name}, use {discount_code}.</p>', [$user->id]);

    expect($bodies['asha@example.test'])->toContain('Hi Asha Gurung, use {discount_code}.');
});

test('a body without order tags never queries the orders table', function () {
    $user = User::factory()->create();
    Order::factory()->for($user)->create();

    DB::enableQueryLog();

    newsletterBodiesFor('<p>Hi {first_name}.</p>', [$user->id]);

    $orderQueries = collect(DB::getQueryLog())
        ->filter(fn (array $query): bool => str_contains($query['query'], '"orders"')
            || str_contains($query['query'], '`orders`'));

    DB::disableQueryLog();

    // Personalisation runs once per recipient, so a greeting that never mentions
    // orders must not cost the orders table a round trip per person.
    expect($orderQueries)->toBeEmpty();
});

test('the composer offers the same tags the send resolves', function () {
    $response = $this->actingAs(newsletterAdmin())
        ->get(route('admin.newsletters.create'))
        ->assertSuccessful();

    expect(collect($response->inertiaProps('placeholders'))->pluck('tag')->all())
        ->toBe([
            '{name}',
            '{first_name}',
            '{email}',
            '{latest_order_number}',
            '{latest_order_date}',
            '{total_orders}',
        ]);
});

test('the plain text part carries the same substitutions as the html', function () {
    $user = User::factory()->create(['name' => 'Asha Gurung']);

    $this->actingAs(newsletterAdmin())
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Placeholder check',
            'body' => '<p>Hi {first_name} &amp; friends.</p>',
            'audience' => 'selected',
            'user_ids' => [$user->id],
            'action' => 'send',
        ])
        ->assertRedirect();

    $message = Mail::mailer('brevo')->getSymfonyTransport()->messages()->first();
    $sent = $message->getOriginalMessage();

    expect($sent->getTextBody())->toContain('Hi Asha & friends.');
});

test('the html the editor produced is what the mailbox receives', function () {
    $customer = User::factory()->create();

    $this->actingAs(newsletterAdmin())
        ->post(route('admin.newsletters.store'), [
            'subject' => 'Formatting check',
            'body' => '<h2>Big news</h2><p>Something <strong>bold</strong> happened.</p>',
            'audience' => 'selected',
            'user_ids' => [$customer->id],
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
