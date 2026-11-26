<?php

use App\Models\Notice;
use App\Models\User;

function noticeAdmin(): User
{
    return User::factory()->create(['is_admin' => true]);
}

test('a published notice pops up until the user dismisses it, then the next one surfaces', function () {
    $user = User::factory()->create();

    $this->travel(1)->minutes();
    $first = Notice::factory()->published()->create(['title' => 'First']);
    $this->travel(1)->minutes();
    $second = Notice::factory()->published()->create(['title' => 'Second']);

    $this->actingAs($user)
        ->get(route('orders.index'))
        ->assertInertia(fn ($page) => $page->where('pendingNotice.id', $first->id)->where('pendingNotice.title', 'First'));

    $this->actingAs($user)
        ->from(route('orders.index'))
        ->post(route('account.notices.dismiss', $first))
        ->assertRedirect(route('orders.index'));

    $this->actingAs($user)
        ->get(route('orders.index'))
        ->assertInertia(fn ($page) => $page->where('pendingNotice.id', $second->id));

    $this->actingAs($user)->post(route('account.notices.dismiss', $second));

    $this->actingAs($user)
        ->get(route('orders.index'))
        ->assertInertia(fn ($page) => $page->where('pendingNotice', null));

    expect($user->dismissedNotices()->pluck('notices.id')->all())->toEqualCanonicalizing([$first->id, $second->id]);
});

test('dismissing the same notice twice records it once', function () {
    $user = User::factory()->create();
    $this->travel(1)->minutes();
    $notice = Notice::factory()->published()->create();

    $this->actingAs($user)->post(route('account.notices.dismiss', $notice));
    $this->actingAs($user)->post(route('account.notices.dismiss', $notice))->assertRedirect();

    expect($notice->dismissedBy()->count())->toBe(1);
});

test('the notices page lists every notice sent to the user, dismissed or not', function () {
    $user = User::factory()->create();
    $this->travel(1)->minutes();
    $dismissed = Notice::factory()->published()->create(['title' => 'Old news']);
    $this->travel(1)->minutes();
    $fresh = Notice::factory()->published()->create(['title' => 'Fresh news']);
    $user->dismissedNotices()->attach($dismissed);

    $this->actingAs($user)
        ->get(route('account.notices.index'))
        ->assertInertia(fn ($page) => $page
            ->component('User/Notices/Index')
            ->has('notices.data', 2)
            ->where('notices.data.0.id', $fresh->id)
            ->where('notices.data.0.is_dismissed', false)
            ->where('notices.data.1.id', $dismissed->id)
            ->where('notices.data.1.is_dismissed', true));
});

test('drafts and notices published before the account existed are never shown', function () {
    $olderNotice = Notice::factory()->published()->create();
    $this->travel(1)->minutes();
    $user = User::factory()->create();
    $draft = Notice::factory()->create();

    $this->actingAs($user)
        ->get(route('account.notices.index'))
        ->assertInertia(fn ($page) => $page->has('notices.data', 0)->where('pendingNotice', null));

    $this->actingAs($user)->post(route('account.notices.dismiss', $olderNotice))->assertNotFound();
    $this->actingAs($user)->post(route('account.notices.dismiss', $draft))->assertNotFound();
});

test('guests cannot read or dismiss notices', function () {
    $notice = Notice::factory()->published()->create();

    $this->get(route('account.notices.index'))->assertRedirect(route('login'));
    $this->post(route('account.notices.dismiss', $notice))->assertRedirect(route('login'));
});

test('an admin publishes a notice or saves it as a draft', function (bool $isPublished) {
    $admin = noticeAdmin();

    $this->actingAs($admin)
        ->post(route('admin.notices.store'), [
            'title' => 'Google AI Pro update',
            'body' => "Google has discontinued third-party subscriptions.\n\nThanks for your understanding!",
            'is_published' => $isPublished,
        ])
        ->assertRedirect()
        ->assertSessionHas('success', $isPublished ? 'Notice published.' : 'Notice saved as a draft.');

    $notice = Notice::sole();

    expect($notice->user_id)->toBe($admin->id)
        ->and($notice->body)->toContain("\n\nThanks")
        ->and($notice->published_at !== null)->toBe($isPublished);
})->with(['published' => true, 'draft' => false]);

test('a notice needs a title and a message', function () {
    $this->actingAs(noticeAdmin())
        ->post(route('admin.notices.store'), ['is_published' => true])
        ->assertSessionHasErrors([
            'title' => 'The title field is required.',
            'body' => 'The body field is required.',
        ]);

    expect(Notice::count())->toBe(0);
});

test('editing a published notice keeps its publish time and its dismissals', function () {
    $user = User::factory()->create();
    $this->travel(1)->minutes();
    $notice = Notice::factory()->published()->create();
    $publishedAt = $notice->published_at;
    $user->dismissedNotices()->attach($notice);

    $this->travel(1)->hours();

    $this->actingAs(noticeAdmin())
        ->put(route('admin.notices.update', $notice), [
            'title' => 'Corrected title',
            'body' => 'Corrected body',
            'is_published' => true,
        ])
        ->assertRedirect();

    $notice->refresh();

    expect($notice->title)->toBe('Corrected title')
        ->and($notice->published_at->equalTo($publishedAt))->toBeTrue()
        ->and($notice->dismissedBy()->count())->toBe(1);
});

test('unpublishing a notice takes it out of every panel', function () {
    $user = User::factory()->create();
    $this->travel(1)->minutes();
    $notice = Notice::factory()->published()->create();

    $this->actingAs(noticeAdmin())
        ->put(route('admin.notices.update', $notice), [
            'title' => $notice->title,
            'body' => $notice->body,
            'is_published' => false,
        ]);

    expect($notice->refresh()->published_at)->toBeNull();

    $this->actingAs($user)
        ->get(route('account.notices.index'))
        ->assertInertia(fn ($page) => $page->has('notices.data', 0)->where('pendingNotice', null));
});

test('an admin deletes a notice', function () {
    $notice = Notice::factory()->published()->create();

    $this->actingAs(noticeAdmin())
        ->delete(route('admin.notices.destroy', $notice))
        ->assertRedirect();

    $this->assertModelMissing($notice);
});

test('customers cannot manage notices', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('admin.notices.store'), ['title' => 'x', 'body' => 'y', 'is_published' => true])
        ->assertForbidden();

    expect(Notice::count())->toBe(0);
});

test('the admin list shows how many users dismissed each notice', function () {
    $notice = Notice::factory()->published()->create(['title' => 'Counted']);
    $users = User::factory()->count(2)->create();
    $notice->dismissedBy()->attach($users);

    $this->actingAs(noticeAdmin())
        ->get(route('admin.notices.index'))
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Notices/Index')
            ->where('notices.data.0.title', 'Counted')
            ->where('notices.data.0.dismissed_count', 2));
});
