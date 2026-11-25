<?php

namespace App\Enums;

/**
 * Where a recorded variant price came from.
 */
enum PriceSnapshotSource: string
{
    /** Applied from the price calculator, with the cost inputs it used. */
    case Calculator = 'calculator';

    /** Typed into the variant form directly. */
    case Manual = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::Calculator => 'Calculator',
            self::Manual => 'Edited'
        };
    }
}
