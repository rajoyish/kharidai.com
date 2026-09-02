<?php

namespace App\Policies;

use App\Enums\ProductType;
use App\Models\GuideMedia;
use App\Models\Order;
use App\Models\ProductGuide;
use App\Models\User;

class GuideMediaPolicy
{
    /**
     * Whether this viewer may fetch the image file itself.
     *
     * The same three conditions that gate the guide text, applied to the
     * picture inside it: the image belongs to a released guide, that guide's
     * product is in one of the viewer's orders, and that order is paid for.
     * Anything less and a leaked URL would still hand over the screenshot.
     */
    public function view(User $user, GuideMedia $media): bool
    {
        if ($user->is_admin) {
            return true;
        }

        $productIds = ProductGuide::query()
            ->published()
            ->whereHas('media', fn ($query) => $query->whereKey($media->getKey()))
            // Matches the delivery gate: a guide on a product that has since
            // become a service is not served, so neither are its images.
            ->whereHas('product', fn ($query) => $query->whereIn('type', ProductType::guideSupportedValues()))
            ->pluck('product_id');

        if ($productIds->isEmpty()) {
            return false;
        }

        return Order::query()
            ->where('user_id', $user->id)
            ->whereIn('status', Order::PAID_STATUSES)
            ->whereHas(
                'items.productVariant',
                fn ($query) => $query->whereIn('product_id', $productIds),
            )
            ->exists();
    }

    /**
     * Only admins add and remove guide images; buyers only ever read them.
     */
    public function manage(User $user): bool
    {
        return (bool) $user->is_admin;
    }
}
