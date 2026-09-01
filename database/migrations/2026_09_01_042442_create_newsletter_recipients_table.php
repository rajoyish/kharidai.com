<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The per-person send list for one newsletter, snapshotted when it is queued.
 *
 * A row is the unit of work: one queued job per row, and the row's status is what
 * makes a resumed send idempotent after the daily quota pauses it mid-run.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('newsletter_recipients', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('newsletter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Snapshotted rather than read back off the user: the address the mail
            // went to is what a delivery record has to remember.
            $table->string('email');
            $table->string('status', 32)->default('pending');
            $table->string('mailer', 64)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->unique(['newsletter_id', 'user_id'], 'newsletter_recipients_unique');
            $table->index(['newsletter_id', 'status'], 'newsletter_recipients_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_recipients');
    }
};
