<?php

namespace App\Concerns;

use App\Models\User;
use App\Rules\MobileNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
            'mobile_number' => $this->mobileNumberRules(),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user mobile numbers.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function mobileNumberRules(): array
    {
        return ['nullable', 'string', 'max:20', new MobileNumber];
    }

    /**
     * The mobile number rules for contexts where the number is mandatory, such
     * as the prompt shown to users who have not supplied one yet.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function requiredMobileNumberRules(): array
    {
        return ['required', 'string', 'max:20', new MobileNumber];
    }
}
