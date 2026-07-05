<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Google-login admin: matched by email on OAuth callback, keeps is_admin.
        User::updateOrCreate(
            ['email' => 'rajoyish@gmail.com'],
            [
                'name' => 'Rajesh Budhathoki',
                'is_admin' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
        );

        // Password-login admin fallback.
        User::updateOrCreate(
            ['email' => 'admin@kharidai.test'],
            [
                'name' => 'Store Admin',
                'is_admin' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
        );

        // A regular customer for testing the storefront/checkout flow.
        User::updateOrCreate(
            ['email' => 'customer@kharidai.test'],
            [
                'name' => 'Test Customer',
                'is_admin' => false,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
        );
    }
}
