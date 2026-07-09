<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(5);

        return [
            'user_id' => User::factory(),
            'title' => rtrim($title, '.'),
            'excerpt' => fake()->sentence(12),
            'content' => '<p>'.implode('</p><p>', (array) fake()->paragraphs(3)).'</p>',
            'image' => null,
            'image_alt' => null,
            'seo_title' => null,
            'seo_description' => fake()->sentence(),
            'is_published' => true,
            'published_at' => now()->subDay(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (): array => [
            'is_published' => false,
            'published_at' => null,
        ]);
    }

    public function scheduled(): static
    {
        return $this->state(fn (): array => [
            'is_published' => true,
            'published_at' => now()->addWeek(),
        ]);
    }
}
