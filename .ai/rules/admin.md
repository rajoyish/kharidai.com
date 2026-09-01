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
