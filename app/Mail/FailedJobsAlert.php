<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Warns the shop that queued jobs are failing.
 *
 * Deliberately not a ShouldQueue: the queue is the thing being reported on, so
 * queueing this warning could park it behind the very failure it describes.
 */
class FailedJobsAlert extends Mailable
{
    public function __construct(
        public int $failedCount,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[{$this->failedCount} failed job(s)] ".config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.failed-jobs-alert',
        );
    }
}
