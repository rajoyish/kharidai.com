<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per email address a message was actually handed to a transport for.
 *
 * This is the ledger the free-tier quota is enforced against, so it has to count
 * every outgoing message, not just newsletters — an order confirmation eats the
 * same Brevo allowance a newsletter does. Rows are written by
 * App\Services\Mail\QuotaRecordingTransport, which wraps every mailer's transport
 * and therefore sees mail nobody remembered to route through the newsletter code.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_dispatches', function (Blueprint $table): void {
            $table->id();
            $table->string('mailer', 64);
            $table->string('recipient');
            $table->timestamp('sent_at');

            // The only two questions ever asked of this table are "how many in the
            // last 24 hours" and "how many of those on mailer X", so the window
            // column leads and the composite covers the per-mailer breakdown.
            $table->index('sent_at');
            $table->index(['mailer', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_dispatches');
    }
};
