<x-mail::message>
# New order {{ $order->order_number }}

**{{ $order->user->name }}** ({{ $order->user->email }}) just placed an order.

{{--
    A pipe is Markdown's column separator, and variant names really do contain one
    ("Activation Link | 18 Months"). Left raw it splits the row into extra cells,
    shunting quantity and price into the wrong columns and dropping the price off
    the end. Escaping it keeps the name in its own cell.

    Keep comments and blank lines out of the table below: a blank line ends the
    table, and the rows after it render as a literal paragraph of pipes.
--}}
<x-mail::table>
| Item | Qty | Price |
| :--- | :-: | ----: |
@foreach ($order->items as $item)
| {{ str_replace('|', '\|', $item->displayName()) }} | {{ $item->quantity }} | Rs. {{ number_format($item->revenueNpr(), 0) }} |
@endforeach
</x-mail::table>

**Total: Rs. {{ number_format($total, 0) }}**
@if ($order->amount_due_now > 0)
Due now: Rs. {{ number_format($order->amount_due_now, 0) }} · Balance: Rs. {{ number_format($order->balance_due, 0) }}
@endif

@if ($order->shipment)
## Shipping to
{{ $order->shipment->recipient_name }} · {{ $order->shipment->mobile_number }}
{{ $order->shipment->address_line }}, {{ $order->shipment->city }}@if ($order->shipment->landmark) ({{ $order->shipment->landmark }})@endif
@endif

@if ($order->additional_data['note'] ?? null)
## Customer note
{{ $order->additional_data['note'] }}
@endif

<x-mail::button :url="$adminUrl">
View order
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
