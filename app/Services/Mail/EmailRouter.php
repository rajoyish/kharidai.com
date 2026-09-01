<?php

namespace App\Services\Mail;

/**
 * Picks which free tier the next email goes out on.
 *
 * The rule is "first configured mailer with headroom wins", and the order in
 * `mail.quota.mailers` is the preference: Brevo first, because it sends from our
 * own authenticated domain, with Gmail as overflow once Brevo's 300 is spent.
 * Null means both are spent — the caller must not send.
 */
class EmailRouter
{
    public function __construct(
        private readonly EmailQuotaTracker $tracker,
    ) {}

    public function resolveMailer(): ?string
    {
        foreach (array_keys($this->tracker->limits()) as $mailer) {
            if (! $this->isConfigured($mailer)) {
                continue;
            }

            if ($this->tracker->remainingFor($mailer) > 0) {
                return $mailer;
            }
        }

        return null;
    }

    /**
     * Whether the mailer can actually send.
     *
     * A capped mailer with no credentials is a live trap: the router would hand it
     * work it cannot deliver and every job would fail on authentication. Only SMTP
     * needs credentials — the `log` and `array` transports are always ready, which
     * is what makes local and test runs route somewhere sensible.
     */
    private function isConfigured(string $mailer): bool
    {
        /** @var array<string, mixed>|null $config */
        $config = config("mail.mailers.{$mailer}");

        if ($config === null) {
            return false;
        }

        if (($config['transport'] ?? null) !== 'smtp') {
            return true;
        }

        return filled($config['username'] ?? null) || filled($config['url'] ?? null);
    }
}
