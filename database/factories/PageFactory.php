<?php

namespace Database\Factories;

use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Page>
 */
class PageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);

        return [
            'title' => rtrim($title, '.'),
            'content' => '<p>'.fake()->paragraph().'</p>',
            'image' => null,
            'image_alt' => null,
            'seo_title' => null,
            'seo_description' => fake()->sentence(),
            'is_published' => true,
            'published_at' => now()->subDay(),
            'show_in_nav' => true,
            'show_in_footer' => true,
        ];
    }

    public function hiddenFromNav(): static
    {
        return $this->state(fn (): array => ['show_in_nav' => false]);
    }

    public function hiddenFromFooter(): static
    {
        return $this->state(fn (): array => ['show_in_footer' => false]);
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
