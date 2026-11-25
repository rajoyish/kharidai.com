<?php

namespace App\Http\Controllers\Concerns;

use Inertia\Inertia;

/**
 * Flashes a one-off toast for the next Inertia page, which the frontend's
 * `useFlashToast()` hook renders.
 */
trait FlashesToasts
{
    /**
     * @param  'success'|'error'|'info'|'warning'  $type
     */
    protected function toast(string $type, string $message): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }
}
