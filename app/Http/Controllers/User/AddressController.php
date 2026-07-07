<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\ShippingAddress;
use App\Models\ShippingZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AddressController extends Controller
{
    public function index(Request $request): Response
    {
        $addresses = $request->user()->shippingAddresses()
            ->latest('is_default')
            ->latest()
            ->get();

        $zones = ShippingZone::query()->active()->orderBy('sort_order')->get(['id', 'name']);

        return Inertia::render('User/Addresses/Index', [
            'addresses' => $addresses,
            'zones' => $zones,
        ]);
    }

    public function update(Request $request, ShippingAddress $address): RedirectResponse
    {
        $this->authorizeAddress($request, $address);

        $address->update($this->validatedData($request));

        return redirect()->route('account.addresses.index')->with('success', 'Address updated.');
    }

    public function setDefault(Request $request, ShippingAddress $address): RedirectResponse
    {
        $this->authorizeAddress($request, $address);

        $request->user()->shippingAddresses()->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return redirect()->route('account.addresses.index')->with('success', 'Default address updated.');
    }

    public function destroy(Request $request, ShippingAddress $address): RedirectResponse
    {
        $this->authorizeAddress($request, $address);

        $address->delete();

        return redirect()->route('account.addresses.index')->with('success', 'Address removed.');
    }

    /**
     * Ensure the address belongs to the authenticated user.
     */
    private function authorizeAddress(Request $request, ShippingAddress $address): void
    {
        abort_unless($address->user_id === $request->user()->id, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        return $request->validate([
            'recipient_name' => ['required', 'string', 'max:255'],
            'mobile_number' => ['required', 'string', 'max:30'],
            'address_line' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'shipping_zone_id' => ['nullable', Rule::exists('shipping_zones', 'id')->where('is_active', true)],
        ]);
    }
}
