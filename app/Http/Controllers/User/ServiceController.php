<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\ServiceEngagement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    public function index(Request $request): Response
    {
        $engagements = $request->user()
            ->serviceEngagements()
            ->with(['product:id,title', 'productVariant:id,name', 'orderItem.order:id,order_number'])
            ->latest()
            ->get()
            ->map(fn (ServiceEngagement $engagement): array => [
                'id' => $engagement->id,
                'status' => $engagement->status->value,
                'price_npr' => $engagement->price_npr,
                'product' => $engagement->product?->only('id', 'title'),
                'variant' => $engagement->productVariant?->only('id', 'name'),
                'order_number' => $engagement->orderItem?->order?->order_number,
                'delivery_note' => $engagement->delivery_note,
                'created_at' => $engagement->created_at?->format('n/j/Y'),
            ]);

        return Inertia::render('User/Services/Index', [
            'engagements' => $engagements,
        ]);
    }
}
