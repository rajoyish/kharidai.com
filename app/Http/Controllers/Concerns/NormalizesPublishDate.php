<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Carbon;

/**
 * Normalizes an incoming publish date to a UTC instant.
 *
 * The admin form submits an ISO-8601 string carrying the editor's offset. The
 * datetime cast formats whatever timezone Carbon parsed, so an offset-bearing
 * value would otherwise be stored as local wall time and read back as UTC —
 * scheduling content into the future by the size of the offset.
 */
trait NormalizesPublishDate
{
    protected function normalizePublishDate(?string $value): ?Carbon
    {
        if (blank($value)) {
            return null;
        }

        return Carbon::parse($value)->utc();
    }
}
