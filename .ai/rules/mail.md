---
paths:
  - 'app/Mail/**'
---

# Mail

## Every outgoing email is counted against a free-tier quota
Brevo (300/day) and Gmail (500/day) are free tiers with hard ceilings, so the app counts its own sends over a rolling 24 hours in `email_dispatches`.

`App\Services\Mail\QuotaAwareMailManager` wraps every mailer's Symfony transport, so any send is recorded automatically — you do not have to remember to count a new mailable, and you cannot opt out by calling `Mail::mailer()` directly.

Two consequences worth knowing:
- `App\Listeners\EnforceEmailQuota` returns false from `MessageSending` once the combined limit is spent, which cancels the send silently and makes `send()` return null. Check that return value if the caller needs to know whether the mail went out.
- Pick the mailer with `App\Services\Mail\EmailRouter::resolveMailer()` rather than hardcoding one. Null means both tiers are spent; queued work should release itself using `EmailQuotaTracker::secondsUntilCapacity()`.

`Mail::fake()` replaces the manager wholesale, so quota behaviour is untestable under it — point the mailers at the `array` transport instead (see tests/Feature/EmailQuotaTest.php).

## Newsletters never go to admins or the app's own mailboxes
A mass newsletter may only reach customers. Three groups are excluded from the audience: banned accounts, users with `is_admin`, and any address the app itself sends from.

`App\Services\Mail\SystemMailboxes` derives that last group from the mail config (`mail.from.address`, `mail.customer_from.address`, `mail.order_notification_address`, and every `mail.mailers.*.username` that parses as an email), so a mailer added later is covered without editing a list. Mailing the address a newsletter was sent from is a loop, and the engagement signal it creates is one spam filters read badly.

`NewsletterController::eligibleUsers()` is the single definition of the audience — the composer, the recipient snapshot, and the "every registered user" count all read it. Do not hand-roll a second user query for newsletter recipients.

The send list is a snapshot, so `SendNewsletterEmail` re-checks before sending and marks the row `Skipped` (not `Failed`) if the user was promoted to admin, or the config changed, after queueing.
