<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShippingController extends Controller
{
    public function index(): Response
    {
        $zones = ShippingZone::query()
            ->with('rate')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (ShippingZone $zone): array => [
                'id' => $zone->id,
                'name' => $zone->name,
                'is_active' => $zone->is_active,
                'sort_order' => $zone->sort_order,
                'base_fee_npr' => $zone->rate?->base_fee_npr ?? 0,
                'per_kg_fee_npr' => $zone->rate?->per_kg_fee_npr ?? 0,
                'free_over_npr' => $zone->rate?->free_over_npr,
                'min_days' => $zone->rate?->min_days,
                'max_days' => $zone->rate?->max_days,
            ]);

        return Inertia::render('Admin/Shipping/Index', [
            'zones' => $zones,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateZone($request);

        $zone = ShippingZone::create([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        $zone->rate()->create($this->rateAttributes($validated));

        return redirect()->back()->with('success', 'Shipping zone created.');
    }

    public function update(Request $request, ShippingZone $shippingZone): RedirectResponse
    {
        $validated = $this->validateZone($request);

        $shippingZone->update([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        $shippingZone->rate()->updateOrCreate([], $this->rateAttributes($validated));

        return redirect()->back()->with('success', 'Shipping zone updated.');
    }

    public function destroy(ShippingZone $shippingZone): RedirectResponse
    {
        $shippingZone->delete();

        return redirect()->back()->with('success', 'Shipping zone deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateZone(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'base_fee_npr' => ['required', 'numeric', 'min:0'],
            'per_kg_fee_npr' => ['required', 'numeric', 'min:0'],
            'free_over_npr' => ['nullable', 'numeric', 'min:0'],
            'min_days' => ['nullable', 'integer', 'min:0'],
            'max_days' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function rateAttributes(array $validated): array
    {
        return [
            'base_fee_npr' => $validated['base_fee_npr'],
            'per_kg_fee_npr' => $validated['per_kg_fee_npr'],
            'free_over_npr' => $validated['free_over_npr'] ?? null,
            'min_days' => $validated['min_days'] ?? null,
            'max_days' => $validated['max_days'] ?? null,
        ];
    }
}
