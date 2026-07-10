<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Casts a monetary column stored as integer paisa to float NPR and back.
 *
 * Storage stays integer to avoid floating-point drift; rounding on write
 * guards against values like 19.99 * 100 === 1998.9999999999998.
 *
 * @implements CastsAttributes<float|null, float|int|null>
 */
class MoneyNpr implements CastsAttributes
{
    /**
     * Cast the stored paisa value to NPR.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?float
    {
        if ($value === null) {
            return null;
        }

        return ((int) $value) / 100;
    }

    /**
     * Prepare the given NPR value for storage as integer paisa.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?int
    {
        if ($value === null) {
            return null;
        }

        return (int) round(((float) $value) * 100);
    }
}
