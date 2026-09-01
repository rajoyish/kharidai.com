<?php

namespace Database\Factories;

use App\Enums\NewsletterStatus;
use App\Models\Newsletter;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Newsletter>
 */
class NewsletterFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['is_admin' => true]),
            'subject' => rtrim(fake()->sentence(6), '.'),
            'body' => '<p>'.implode('</p><p>', (array) fake()->paragraphs(2)).'</p>',
            'status' => NewsletterStatus::Draft,
        ];
    }

    public function queued(): static
    {
        return $this->state(fn (): array => [
            'status' => NewsletterStatus::Queued,
            'queued_at' => now(),
        ]);
    }

    public function sending(): static
    {
        return $this->state(fn (): array => [
            'status' => NewsletterStatus::Sending,
            'queued_at' => now(),
        ]);
    }
}
