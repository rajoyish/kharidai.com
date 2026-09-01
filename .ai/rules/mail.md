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
