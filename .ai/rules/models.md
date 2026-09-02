---
paths:
  - app/Models/ProductGuide.php
---

# Models

## Delivery guides are gated by the order, never by a route
A `ProductGuide` is deliberately not a `Post`. Posts carry a slug and are served by the blog index, storefront search and the sitemap, so a "private post type" would leak the first time one of those queries forgot to filter it. A guide has no slug and no public route, so there is nothing to forget.

`App\Http\Controllers\Concerns\AttachesProductGuides` is the only path a guide takes to a browser. Do not add a second one, and do not eager load `Product::guides()` on a storefront or listing query — the relation serializes with the product.

The customer gate is three checks together: the order is theirs (the controller's own 403), `Order::isPaid()`, and `ProductGuide::scopePublished()`. Admins get drafts too, via `attachAdminDeliveryGuides()`.

Only digital and physical products carry guides — `ProductType::supportsGuides()` is the single answer, and the authoring controller, the delivery query and `GuideMediaPolicy` all read it. A service is scoped and delivered per engagement, so it has no one document every buyer reads. Converting a product to a service does not delete its guides; it stops delivering them, so converting back restores them.

A guide holds only what is identical for every buyer. Per-order logins, passwords and activation links stay in `OrderCredential`.

Guide images are gated the same way. They are `GuideMedia`, not `Media`: the files sit on the `local` disk with no URL and no symlink, and `GuideMediaController::show()` asks `GuideMediaPolicy` before streaming one. Never store a guide image on the `public` disk — that disk is a symlink into the web root and the check stops meaning anything.

The policy answers from `ProductGuide::media()`, which `syncEmbeddedMedia()` rewrites from the body on every save. So an image edited out of a guide stops being readable, and a `ProductGuide` written anywhere that skips that call would leave stale readers behind.
