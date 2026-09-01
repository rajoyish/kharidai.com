---
paths:
  - app/Http/Controllers/Admin/NewsletterController.php
---

# Admin

## Only Google sign-ins are newsletter-eligible
`eligibleUsers()` requires `whereNotNull('google_id')`, so a newsletter only reaches accounts created by signing in with Google.

`google_id` is written solely by `GoogleController::callback()`. A null one marks an address nobody proved they own: the Fortify registration form, a seeder, or a support fix. Those bounce, and on a free tier a bounce costs the same quota as a delivery.

Do not swap this for an email-domain check. A Workspace account signs in with Google from its own domain, and a hand-typed address can be a gmail.com one, so the domain answers a different question.

`UserFactory` gives every user a `google_id` by default. Use the `manual()` state for an account created by hand.

## Resending a newsletter copies it, never reopens it
`duplicate()` creates a new Draft from a Sent newsletter. Do not "simplify" this by making `isEditable()` accept Sent and letting the original be edited in place.

`syncRecipients()` deletes and rebuilds the recipient rows on every save, so reopening a sent newsletter would erase who received it, on which mailer, and what failed. That table is the only record of what actually went out.

The old send list carries over as the copy's starting selection, but goes back through `eligibleUsers()` first, so an account banned, promoted, or deleted since the last send does not reappear.
