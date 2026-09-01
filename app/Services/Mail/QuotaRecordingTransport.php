<?php

namespace App\Services\Mail;

use Stringable;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\TransportInterface;
use Symfony\Component\Mime\RawMessage;

/**
 * Wraps a mailer's real transport and writes one quota row per address it
 * delivered to.
 *
 * This sits at the transport rather than on the MessageSent event for two
 * reasons: the event does not say which mailer sent the message, and the free
 * tiers are per provider, so a count that cannot tell Brevo from Gmail cannot
 * enforce them. Being the last hop also means mail nobody routed through the
 * newsletter code — order confirmations, the failed-jobs alert, anything added
 * later — is counted without having to remember to count it.
 */
readonly class QuotaRecordingTransport implements Stringable, TransportInterface
{
    public function __construct(
        private TransportInterface $transport,
        private string $mailer,
        private EmailQuotaTracker $tracker,
    ) {}

    public function send(RawMessage $message, ?Envelope $envelope = null): ?SentMessage
    {
        $sent = $this->transport->send($message, $envelope);

        // Only what the transport accepted is counted. A throw above means the
        // provider never saw the message, and charging it against the day's
        // allowance would shrink the allowance for nothing.
        foreach ($this->recipients($sent, $envelope) as $recipient) {
            $this->tracker->record($this->mailer, $recipient);
        }

        return $sent;
    }

    /**
     * Every address the provider counts, which is the envelope's — one per To, Cc
     * and Bcc, since a free tier bills per recipient rather than per message.
     *
     * @return list<string>
     */
    private function recipients(?SentMessage $sent, ?Envelope $envelope): array
    {
        $recipients = ($sent?->getEnvelope() ?? $envelope)?->getRecipients() ?? [];

        return array_values(array_map(
            static fn ($address): string => $address->getAddress(),
            $recipients,
        ));
    }

    /**
     * Forward anything else to the wrapped transport.
     *
     * A decorated mailer should stay as introspectable as an undecorated one —
     * `Mail::mailer('x')->getSymfonyTransport()->messages()` on the array
     * transport, for instance, which tests rely on.
     *
     * @param  array<int, mixed>  $parameters
     */
    public function __call(string $method, array $parameters): mixed
    {
        return $this->transport->{$method}(...$parameters);
    }

    public function __toString(): string
    {
        return (string) $this->transport;
    }
}
