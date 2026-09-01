<?php

namespace App\Services\Mail;

use Illuminate\Mail\MailManager;
use Symfony\Component\Mailer\Transport\TransportInterface;

/**
 * Builds every mailer with its transport wrapped in
 * {@see QuotaRecordingTransport}, so no configured mailer can send without being
 * counted.
 *
 * Subclassing the manager is what makes the mailer's own name available: Laravel
 * passes it through in the config array it hands to the transport factory, and it
 * is the one place in the send path where "which provider is this" is knowable.
 */
class QuotaAwareMailManager extends MailManager
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function createSymfonyTransport(array $config): TransportInterface
    {
        $transport = parent::createSymfonyTransport($config);

        return new QuotaRecordingTransport(
            $transport,
            (string) ($config['name'] ?? 'default'),
            $this->app->make(EmailQuotaTracker::class),
        );
    }
}
