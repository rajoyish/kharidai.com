<?php

namespace App\Services\Mail;

/**
 * The addresses that belong to the application rather than to a customer.
 *
 * Mass mail must never reach these. Sending a newsletter to the mailbox the
 * newsletter was sent *from* is at best pointless and at worst a loop, and it
 * teaches Gmail and Brevo that our own account engages with our own bulk mail,
 * which is exactly the signal a spam filter is looking for.
 *
 * Derived from the mail config rather than listed by hand, so a mailer added
 * later is covered without anyone remembering to come back here.
 */
class SystemMailboxes
{
    /**
     * @var list<string>|null
     */
    private ?array $addresses = null;

    /**
     * Every app-owned address, lowercased.
     *
     * @return list<string>
     */
    public function all(): array
    {
        return $this->addresses ??= $this->resolve();
    }

    public function contains(?string $email): bool
    {
        if (blank($email)) {
            return false;
        }

        return in_array(mb_strtolower(trim($email)), $this->all(), true);
    }

    /**
     * @return list<string>
     */
    private function resolve(): array
    {
        $candidates = [
            config('mail.from.address'),
            config('mail.customer_from.address'),
            config('mail.order_notification_address'),
        ];

        /** @var array<string, array<string, mixed>> $mailers */
        $mailers = config('mail.mailers', []);

        foreach ($mailers as $mailer) {
            // The SMTP login for Gmail is the account's own address. Brevo's is a
            // relay login that is not an address at all, which the filter below
            // drops on its own rather than needing a special case.
            $candidates[] = $mailer['username'] ?? null;
        }

        $addresses = [];

        foreach ($candidates as $candidate) {
            if (! is_string($candidate) || filter_var($candidate, FILTER_VALIDATE_EMAIL) === false) {
                continue;
            }

            $addresses[] = mb_strtolower(trim($candidate));
        }

        return array_values(array_unique($addresses));
    }
}
