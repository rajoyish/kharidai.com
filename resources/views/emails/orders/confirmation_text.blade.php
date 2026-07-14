Thank you for your order

Hi {{ $order->user->name }}, we have received your order {{ $order->order_number }} and are getting it ready.

@foreach ($order->items as $item)
- {{ $item->displayName() }} x{{ $item->quantity }} — Rs. {{ number_format($item->revenueNpr(), 0) }}
@endforeach

Total: Rs. {{ number_format($total, 0) }}
@if ($order->amount_due_now > 0)
Due now: Rs. {{ number_format($order->amount_due_now, 0) }} | Balance: Rs. {{ number_format($order->balance_due, 0) }}
@endif

@if ($order->shipment)
Delivering to:
{{ $order->shipment->recipient_name }} · {{ $order->shipment->mobile_number }}
{{ $order->shipment->address_line }}, {{ $order->shipment->city }}@if ($order->shipment->landmark) ({{ $order->shipment->landmark }})@endif

@endif
View your order: {{ $orderUrl }}

If anything looks wrong, just reply to this email and we will sort it out.

Thanks,
{{ config('app.name') }}
