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
     * One plain-English line shown under the option in the dropdown.
     */
    public function description(): string
    {
        return match ($this) {
            self::Fifo => 'Uses the credits you would spend next, oldest top-up first.',
            self::Average => 'Blends the cost of every credit left in the wallet.',
            self::Latest => 'Uses what one credit cost in your newest top-up.',
            self::Manual => 'You enter the rupee cost of one credit yourself.',
        };
    }

    /**
     * When to pick this option, shown under the field once it is chosen.
     */
    public function guidance(): string
    {
        return match ($this) {
            self::Fifo => 'Prices from the credits this sale would really use up: the oldest top-ups still in the wallet. This is your true cost right now. If a newer top-up cost more, you will see a warning that the price may be too low once the old credits run out.',
            self::Average => 'Takes the average cost of all credits still in the wallet. Pick this for a steady price that does not jump every time you top up at a different rate.',
            self::Latest => 'Uses the rate you paid on your most recent top-up, which is roughly what buying these credits again would cost today. The safest choice when supplier prices are going up.',
            self::Manual => 'Type how many rupees one credit costs. Use this before you have topped up this supplier, or to try out a price you expect to pay.',
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
