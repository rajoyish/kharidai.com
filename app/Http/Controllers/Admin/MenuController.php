<?php

namespace App\Http\Controllers\Admin;

use App\Enums\MenuLinkType;
use App\Enums\MenuLocation;
use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Page;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    /**
     * The menu builder for one location, alongside the published pages an item
     * can be pointed at.
     */
    public function index(Request $request): Response
    {
        $location = $this->resolveLocation($request->query('location'));

        $items = MenuItem::query()
            ->forLocation($location)
            ->with('page:id,title,slug')
            ->ordered()
            ->get();

        return Inertia::render('Admin/Menus/Index', [
            'location' => $location->value,
            'locations' => array_map(
                fn (MenuLocation $case): array => ['value' => $case->value, 'label' => $case->label()],
                MenuLocation::cases(),
            ),
            'items' => $this->tree($items),
            'pages' => Page::query()
                ->published()
                ->ordered()
                ->get(['id', 'title', 'slug'])
                ->map(fn (Page $page): array => [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                ])
                ->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        MenuItem::create($this->validateItem($request));

        return redirect()->back()->with('success', 'Menu item added.');
    }

    public function update(Request $request, MenuItem $menu): RedirectResponse
    {
        $menu->update($this->validateItem($request, $menu));

        return redirect()->back()->with('success', 'Menu item updated.');
    }

    public function destroy(MenuItem $menu): RedirectResponse
    {
        // Children cascade in the database, so removing a top-level item takes
        // its whole dropdown with it.
        $menu->delete();

        return redirect()->back()->with('success', 'Menu item removed.');
    }

    /**
     * Persists a location's whole tree from the drag-and-drop builder: both the
     * order within each branch and which parent an item now hangs off.
     */
    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'location' => ['required', Rule::in(MenuLocation::values())],
            'tree' => ['present', 'array'],
            'tree.*.id' => ['required', 'integer', Rule::exists('menu_items', 'id')],
            'tree.*.children' => ['sometimes', 'array'],
            'tree.*.children.*.id' => ['required', 'integer', Rule::exists('menu_items', 'id')],
        ]);

        $location = MenuLocation::from($validated['location']);

        // A reorder may only shuffle items already in this location, never adopt
        // one out of another menu.
        $foreignIds = array_diff(
            $this->flattenIds($validated['tree']),
            MenuItem::query()->forLocation($location)->pluck('id')->all(),
        );

        if ($foreignIds !== []) {
            throw ValidationException::withMessages([
                'tree' => 'The menu order references items outside this menu.',
            ]);
        }

        DB::transaction(function () use ($validated): void {
            foreach ($validated['tree'] as $position => $node) {
                MenuItem::whereKey($node['id'])->update([
                    'parent_id' => null,
                    'sort_order' => $position + 1,
                ]);

                foreach ($node['children'] ?? [] as $childPosition => $child) {
                    MenuItem::whereKey($child['id'])->update([
                        'parent_id' => $node['id'],
                        'sort_order' => $childPosition + 1,
                    ]);
                }
            }
        });

        // Mass updates bypass model events, so the cache is cleared by hand.
        MenuItem::forgetCache($location);

        return redirect()->back()->with('success', 'Menu order updated.');
    }

    /**
     * Nests a flat, ordered collection into the two-level shape the builder
     * renders.
     *
     * @param  Collection<int, MenuItem>  $items
     * @return list<array<string, mixed>>
     */
    private function tree(Collection $items): array
    {
        $childrenByParent = $items->whereNotNull('parent_id')->groupBy('parent_id');

        return array_values(
            $items
                ->whereNull('parent_id')
                ->map(fn (MenuItem $item): array => [
                    ...$this->itemPayload($item),
                    'children' => array_values(
                        $childrenByParent
                            ->get($item->id, collect())
                            ->map(fn (MenuItem $child): array => $this->itemPayload($child))
                            ->all()
                    ),
                ])
                ->all()
        );
    }

    /** @return array<string, mixed> */
    private function itemPayload(MenuItem $item): array
    {
        return [
            'id' => $item->id,
            'label' => $item->label,
            'link_type' => $item->link_type->value,
            'url' => $item->url,
            'page_id' => $item->page_id,
            'page_title' => $item->page?->title,
            'opens_in_new_tab' => $item->opens_in_new_tab,
            'is_active' => $item->is_active,
            // Surfaced so the builder can flag items that resolve to nothing —
            // a page link whose page was unpublished, for instance.
            'href' => $item->resolveHref(),
        ];
    }

    /**
     * @param  list<array{id: int, children?: list<array{id: int}>}>  $tree
     * @return list<int>
     */
    private function flattenIds(array $tree): array
    {
        $ids = [];

        foreach ($tree as $node) {
            $ids[] = $node['id'];

            foreach ($node['children'] ?? [] as $child) {
                $ids[] = $child['id'];
            }
        }

        return $ids;
    }

    private function resolveLocation(mixed $value): MenuLocation
    {
        return is_string($value)
            ? MenuLocation::tryFrom($value) ?? MenuLocation::Header
            : MenuLocation::Header;
    }

    /**
     * A custom item carries a URL; a page item carries a page. Whichever field
     * does not apply is nulled, so switching an item's link type never leaves
     * the previous destination behind as stale data.
     *
     * @return array<string, mixed>
     */
    private function validateItem(Request $request, ?MenuItem $menu = null): array
    {
        $validated = $request->validate([
            'location' => ['required', Rule::in(MenuLocation::values())],
            'label' => ['required', 'string', 'max:255'],
            'link_type' => ['required', Rule::in(MenuLinkType::values())],
            // Optional on purpose: a parent that only opens a dropdown has no
            // destination of its own. An item left with neither a URL nor any
            // children simply never reaches the storefront.
            'url' => ['nullable', 'string', 'max:2048'],
            'page_id' => [
                Rule::requiredIf(fn (): bool => $request->input('link_type') === MenuLinkType::Page->value),
                'nullable',
                Rule::exists('pages', 'id'),
            ],
            'parent_id' => ['nullable', Rule::exists('menu_items', 'id')],
            'opens_in_new_tab' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $isCustom = $validated['link_type'] === MenuLinkType::Custom->value;

        // A nullable field the request omitted entirely is absent from the
        // validated set, not null — so both are coalesced rather than indexed.
        $validated['url'] = $isCustom ? ($validated['url'] ?? null) : null;
        $validated['page_id'] = $isCustom ? null : ($validated['page_id'] ?? null);
        $validated['opens_in_new_tab'] = $request->boolean('opens_in_new_tab');
        $validated['is_active'] = $request->boolean('is_active', true);
        $validated['parent_id'] = $this->resolveParent($validated, $menu);

        return $validated;
    }

    /**
     * A parent must live in the same menu, be top-level itself (the tree is only
     * `MenuItem::MAX_DEPTH` deep), and never be the item being edited.
     *
     * @param  array<string, mixed>  $validated
     */
    private function resolveParent(array $validated, ?MenuItem $menu): ?int
    {
        $parentId = $validated['parent_id'] ?? null;

        if ($parentId === null) {
            return null;
        }

        $parent = MenuItem::query()->find((int) $parentId);

        if (! $parent || $parent->location->value !== $validated['location']) {
            throw ValidationException::withMessages([
                'parent_id' => 'The parent item must belong to the same menu.',
            ]);
        }

        if ($menu && $parent->id === $menu->id) {
            throw ValidationException::withMessages([
                'parent_id' => 'An item cannot be nested under itself.',
            ]);
        }

        if ($parent->parent_id !== null) {
            throw ValidationException::withMessages([
                'parent_id' => 'Menus can only nest '.MenuItem::MAX_DEPTH.' levels deep.',
            ]);
        }

        // Nesting an item that already has a dropdown would push its own
        // children down to a third level.
        if ($menu && $menu->children()->exists()) {
            throw ValidationException::withMessages([
                'parent_id' => 'This item has sub-items, so it cannot be nested under another item.',
            ]);
        }

        return $parent->id;
    }
}
