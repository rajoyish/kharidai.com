<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create specific users for testing and local development
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@kharidai.test',
            'is_admin' => true,
        ]);

        User::factory()->create([
            'name' => 'Regular Customer',
            'email' => 'customer@kharidai.test',
            'is_admin' => false,
        ]);

        // Generate additional random fake users for testing purposes.
        User::factory()->count(10)->create();
    }
}
