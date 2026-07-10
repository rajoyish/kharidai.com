<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\MobileNumberUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MobileNumberController extends Controller
{
    /**
     * Session key marking the prompt as dismissed for the current login.
     */
    public const DISMISSED_SESSION_KEY = 'mobile_number_prompt_dismissed';

    /**
     * Store the mobile number captured by the prompt shown to users who have
     * not supplied one yet. The value is normalized by the model mutator.
     */
    public function update(MobileNumberUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->mobile_number = $request->validated('mobile_number');
        $user->save();

        $request->session()->forget(self::DISMISSED_SESSION_KEY);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Mobile number saved.')]);

        return back();
    }

    /**
     * Silence the prompt for the rest of this login. The flag lives in the
     * session rather than the browser, so logging out clears it and the user is
     * prompted again on their next login while the number is still missing.
     */
    public function dismiss(Request $request): RedirectResponse
    {
        $request->session()->put(self::DISMISSED_SESSION_KEY, true);

        return back();
    }
}
