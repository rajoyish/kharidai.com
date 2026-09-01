<?php

use App\Models\EmailDispatch;
use App\Services\Mail\EmailQuotaTracker;
use App\Services\Mail\EmailRouter;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    // The real transports are SMTP, so the test suite points both at the array
    // transport. The quota code cares about the mailer's name and its configured
    // ceiling, neither of which the transport changes.
    config()->set('mail.mailers.brevo.transport', 'array');
    config()->set('mail.mailers.gmail.transport', 'array');
    config()->set('mail.quota.mailers', ['brevo' => 2, 'gmail' => 3]);

    Mail::purge('brevo');
    Mail::purge('gmail');
});

function sendRaw(string $mailer, string $to): mixed
{
    return Mail::mailer($mailer)->raw('Hello.', function ($message) use ($to): void {
        $message->to($to)->subject('Test');
    });
}

test('every sent email is counted against the mailer that sent it', function () {
    sendRaw('brevo', 'one@example.test');
    sendRaw('gmail', 'two@example.test');

    expect(EmailDispatch::pluck('mailer', 'recipient')->all())->toBe([
        'one@example.test' => 'brevo',
        'two@example.test' => 'gmail',
    ]);
});

test('an email to several addresses is counted once per address', function () {
    Mail::mailer('brevo')->raw('Hello.', function ($message): void {
        $message->to('one@example.test')
            ->cc('two@example.test')
            ->subject('Test');
    });

    expect(EmailDispatch::count())->toBe(2);
});

test('transactional mail spends the same allowance a newsletter does', function () {
    $tracker = app(EmailQuotaTracker::class);

    sendRaw('brevo', 'customer@example.test');

    expect($tracker->remainingFor('brevo'))->toBe(1)
        ->and($tracker->remainingTotal())->toBe(4);
});

test('the router prefers brevo and falls back to gmail once it is spent', function () {
    $router = app(EmailRouter::class);

    expect($router->resolveMailer())->toBe('brevo');

    sendRaw('brevo', 'one@example.test');
    sendRaw('brevo', 'two@example.test');

    expect($router->resolveMailer())->toBe('gmail');
});

test('the router refuses to route once every mailer is spent', function () {
    $router = app(EmailRouter::class);

    foreach (['brevo', 'brevo', 'gmail', 'gmail', 'gmail'] as $index => $mailer) {
        sendRaw($mailer, "user{$index}@example.test");
    }

    expect($router->resolveMailer())->toBeNull();
});

test('the router skips a capped mailer that has no credentials', function () {
    config()->set('mail.mailers.brevo.transport', 'smtp');
    config()->set('mail.mailers.brevo.username', null);
    config()->set('mail.mailers.brevo.url', null);

    expect(app(EmailRouter::class)->resolveMailer())->toBe('gmail');
});

test('the circuit breaker cancels any send once the combined limit is reached', function () {
    foreach (['brevo', 'brevo', 'gmail', 'gmail', 'gmail'] as $index => $mailer) {
        sendRaw($mailer, "user{$index}@example.test");
    }

    expect(EmailDispatch::count())->toBe(5);

    $sent = sendRaw('brevo', 'blocked@example.test');

    expect($sent)->toBeNull()
        ->and(EmailDispatch::count())->toBe(5);
});

test('sends that have aged out of the window stop counting', function () {
    $tracker = app(EmailQuotaTracker::class);

    $tracker->record('brevo', 'old@example.test', now()->subHours(25));
    $tracker->record('brevo', 'recent@example.test', now()->subHour());

    expect($tracker->sentInWindow('brevo'))->toBe(1)
        ->and($tracker->remainingFor('brevo'))->toBe(1);
});

test('the ledger is pruned past the retention window', function () {
    $tracker = app(EmailQuotaTracker::class);

    config()->set('mail.quota.retention_days', 2);

    $tracker->record('brevo', 'old@example.test', now()->subDays(3));
    $tracker->record('brevo', 'recent@example.test', now()->subHour());

    $this->artisan('mail:prune-dispatches')->assertSuccessful();

    expect(EmailDispatch::pluck('recipient')->all())->toBe(['recent@example.test']);
});
