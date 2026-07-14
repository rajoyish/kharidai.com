New order {{ $order->order_number }}

{{ $order->user->name }} ({{ $order->user->email }}) just placed an order.

@foreach ($order->items as $item)
- {{ $item->displayName() }} x{{ $item->quantity }} — Rs. {{ number_format($item->revenueNpr(), 0) }}
@endforeach

Total: Rs. {{ number_format($total, 0) }}
@if ($order->amount_due_now > 0)
Due now: Rs. {{ number_format($order->amount_due_now, 0) }} | Balance: Rs. {{ number_format($order->balance_due, 0) }}
@endif

@if ($order->shipment)
Shipping to:
{{ $order->shipment->recipient_name }} · {{ $order->shipment->mobile_number }}
{{ $order->shipment->address_line }}, {{ $order->shipment->city }}@if ($order->shipment->landmark) ({{ $order->shipment->landmark }})@endif

@endif
@if ($order->additional_data['note'] ?? null)
Customer note:
{{ $order->additional_data['note'] }}

@endif
View order: {{ $adminUrl }}

Thanks,
{{ config('app.name') }}
