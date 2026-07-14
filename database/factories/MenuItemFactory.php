<?php

namespace Database\Factories;

use App\Enums\MenuLinkType;
use App\Enums\MenuLocation;
use App\Models\MenuItem;
use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MenuItem>
 */
class MenuItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'location' => MenuLocation::Header,
            'parent_id' => null,
            'label' => rtrim(fake()->unique()->sentence(2), '.'),
            'link_type' => MenuLinkType::Custom,
            'url' => '/'.fake()->unique()->slug(2),
            'page_id' => null,
            'opens_in_new_tab' => false,
            'is_active' => true,
        ];
    }

    public function footer(): static
    {
        return $this->state(fn (): array => ['location' => MenuLocation::Footer]);
    }

    public function forPage(?Page $page = null): static
    {
        return $this->state(fn (): array => [
            'link_type' => MenuLinkType::Page,
            'url' => null,
            'page_id' => $page->id ?? Page::factory(),
        ]);
    }

    public function childOf(MenuItem $parent): static
    {
        return $this->state(fn (): array => [
            'parent_id' => $parent->id,
            'location' => $parent->location,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }
}
