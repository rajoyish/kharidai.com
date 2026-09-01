<?php

namespace App\Mail;

use App\Models\Newsletter;
use App\Models\NewsletterRecipient;
use App\Services\Mail\NewsletterPlaceholders;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * One admin-written newsletter, addressed to one subscriber.
 *
 * Deliberately not a ShouldQueue mailable. App\Jobs\SendNewsletterEmail is
 * already the queued unit of work, and it has to know whether this particular
 * send succeeded before it marks the recipient row — queueing again from inside
 * the job would hand that answer to a second job it cannot see.
 */
class NewsletterMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Newsletter $newsletter,
        public NewsletterRecipient $recipient,
    ) {}

    public function envelope(): Envelope
    {
        $from = config('mail.customer_from.address');

        return new Envelope(
            // From our own authenticated domain, like every other customer-facing
            // message. A mass mail sent from the shop's Gmail is the fastest way to
            // teach a mailbox provider that our domain is a spammer.
            from: filled($from)
                ? new Address($from, (string) config('mail.customer_from.name'))
                : null,
            subject: $this->newsletter->subject,
        );
    }

    public function content(): Content
    {
        /*
         * The one place the {tags} in the body resolve. There is a single stored
         * body and one job per recipient reading it, so personalisation belongs
         * here, where the copy being built is already one person's.
         */
        $body = app(NewsletterPlaceholders::class)
            ->apply($this->newsletter->body, $this->recipient);

        return new Content(
            markdown: 'emails.newsletter',

            /*
             * The derived plain-text part of a markdown mailable emits the markdown
             * source, which for a body that is already HTML means a text client is
             * shown tags. A hand-written part strips them instead.
             */
            text: 'emails.newsletter_text',

            with: [
                'subject' => $this->newsletter->subject,
                'bodyHtml' => $body,

                // Derived from the substituted body, not the stored one, so the
                // text part carries the same names and order numbers the HTML does.
                'bodyText' => $this->plainTextBody($body),
            ],
        );
    }

    /**
     * The editor's HTML flattened to readable text: block tags become line breaks
     * before the tags are stripped, so paragraphs do not run together.
     */
    private function plainTextBody(string $body): string
    {
        $withBreaks = preg_replace(
            '/<\/(p|div|h[1-6]|li|tr|blockquote)>/i',
            "\n\n",
            $body,
        );

        $withBreaks = preg_replace('/<br\s*\/?>/i', "\n", (string) $withBreaks);

        return trim((string) preg_replace(
            "/\n{3,}/",
            "\n\n",
            html_entity_decode(strip_tags((string) $withBreaks), ENT_QUOTES, 'UTF-8'),
        )) ?: Str::of($this->newsletter->subject)->toString();
    }
}
