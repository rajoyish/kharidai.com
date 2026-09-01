<?php

namespace App\Services\Mail;

use App\Models\NewsletterRecipient;
use App\Models\Order;
use Illuminate\Support\Str;

/**
 * Fills the {tags} an admin wrote into a newsletter body with one recipient's
 * own details.
 *
 * Substitution happens per recipient at send time rather than once at compose
 * time, because there is only one stored body and every job reads it. The tags
 * stay tags in the database; each person's copy is the only place they resolve.
 */
class NewsletterPlaceholders
{
    /**
     * Every supported tag, with the description the composer shows beside it.
     *
     * This is the single definition of the vocabulary: the substitution below and
     * the helper card on the compose screen both read it, so a tag the UI offers
     * is always one the send understands.
     *
     * @var array<string, string>
     */
    private const TAGS = [
        'name' => "The recipient's full name.",
        'first_name' => 'Just their first name, taken from the full name.',
        'email' => 'The address this newsletter is going to.',
        'latest_order_number' => 'The reference of their most recent order.',
        'latest_order_date' => 'The date they last ordered.',
        'total_orders' => 'How many orders they have placed in total.',
    ];

    /**
     * The date a customer reads inside a sentence, not the terse `n/j/Y` the
     * admin tables use. "…since your order on March 3, 2026" has to scan as prose.
     */
    private const DATE_FORMAT = 'F j, Y';

    /**
     * The tag list the composer offers.
     *
     * @return list<array{tag: string, description: string}>
     */
    public function definitions(): array
    {
        return array_map(
            static fn (string $tag, string $description): array => [
                'tag' => '{'.$tag.'}',
                'description' => $description,
            ],
            array_keys(self::TAGS),
            array_values(self::TAGS),
        );
    }

    /**
     * Resolve every known tag in a body against one recipient.
     *
     * Anything else in braces is left exactly as written. An admin who typed
     * `{foo}` meant `{foo}`, and quietly deleting it would be a worse surprise
     * than seeing it arrive.
     */
    public function apply(string $body, NewsletterRecipient $recipient): string
    {
        $used = $this->tagsUsedIn($body);

        if ($used === []) {
            return $body;
        }

        $values = $this->resolve($used, $recipient);

        return str_replace(
            array_map(static fn (string $tag): string => '{'.$tag.'}', array_keys($values)),
            array_values($values),
            $body,
        );
    }

    /**
     * Which tags this body actually asks for.
     *
     * Read first so the work below is bounded by what was written rather than by
     * the size of the vocabulary. A newsletter that only greets people by name
     * must not query the orders table once per recipient to discover that.
     *
     * @return list<string>
     */
    private function tagsUsedIn(string $body): array
    {
        preg_match_all(
            '/\{('.implode('|', array_keys(self::TAGS)).')\}/',
            $body,
            $matches,
        );

        return array_values(array_unique($matches[1]));
    }

    /**
     * Every requested tag's replacement, HTML-escaped.
     *
     * Escaped because the body is HTML and a name containing `&` or `<` would
     * otherwise arrive as broken markup. The plain-text part is derived from this
     * same substituted body and decodes the entities back on its way through.
     *
     * Missing context is an empty string rather than a placeholder that says so:
     * a customer who has never ordered should read a sentence with a gap in it,
     * not the word "none". The one exception is {total_orders}, where zero is the
     * true answer and reads as one.
     *
     * @param  list<string>  $tags
     * @return array<string, string>
     */
    private function resolve(array $tags, NewsletterRecipient $recipient): array
    {
        $user = $recipient->user;
        $name = trim((string) $user?->name);

        $wantsLatestOrder = array_intersect($tags, ['latest_order_number', 'latest_order_date']) !== [];
        $wantsOrderCount = in_array('total_orders', $tags, true);

        /** @var Order|null $latestOrder */
        $latestOrder = $user !== null && $wantsLatestOrder
            // Ordered by id as well as date: two orders placed in the same second
            // would otherwise pick a winner at the database's discretion, and this
            // value ends up quoted in an email.
            ? $user->orders()->orderByDesc('created_at')->orderByDesc('id')->first()
            : null;

        $totalOrders = $user !== null && $wantsOrderCount
            ? $user->orders()->count()
            : 0;

        $values = [
            'name' => $name,
            'first_name' => Str::before($name, ' '),

            // The row's own address, not the user's. That is where this copy is
            // actually being delivered, and the two can differ once a send list
            // has been snapshotted.
            'email' => $recipient->email,

            'latest_order_number' => (string) ($latestOrder?->order_number ?? ''),
            'latest_order_date' => $latestOrder?->created_at?->format(self::DATE_FORMAT) ?? '',
            'total_orders' => (string) $totalOrders,
        ];

        return array_map(
            static fn (string $value): string => e($value),
            array_intersect_key($values, array_flip($tags)),
        );
    }
}
