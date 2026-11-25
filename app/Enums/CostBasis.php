<?php

namespace App\Enums;

/**
 * How the NPR value of one wallet credit is decided when pricing a variant.
 */
enum CostBasis: string
{
    /** The credits the next purchase would actually consume, oldest top-up first. */
    case Fifo = 'fifo';

    /** The weighted average cost of every credit still in the wallet. */
    case Average = 'average';

    /** The rate of the most recent top-up: what replacing the credits costs today. */
    case Latest = 'latest';

    /** A rate typed in by hand, for planning before a top-up exists. */
    case Manual = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::Fifo => 'Oldest credits first',
            self::Average => 'Average price',
            self::Latest => 'Latest top-up price',
            self::Manual => 'Type my own',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $basis): string => $basis->value, self::cases());
    }
}
