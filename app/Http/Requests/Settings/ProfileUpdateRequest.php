<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // The email is the account's identity: Google sign-in finds the account
        // by it, and nothing here verifies a new one. A user who could rewrite it
        // could park their account on someone else's address and be handed that
        // person's Google sign-in, so the profile form never changes it.
        return Arr::except($this->profileRules($this->user()->id), ['email']);
    }
}
