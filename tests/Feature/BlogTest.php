<?php

use App\Models\Post;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('lists published posts on the blog index', function () {
    $published = Post::factory()->create(['title' => 'Published Post']);
    $draft = Post::factory()->draft()->create(['title' => 'Draft Post']);
    $scheduled = Post::factory()->scheduled()->create(['title' => 'Scheduled Post']);

    $this->get('/blog')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Blog/Index')
            ->has('posts.data', 1)
            ->where('posts.data.0.slug', $published->slug)
        );

    expect($draft->isPublished())->toBeFalse()
        ->and($scheduled->isPublished())->toBeFalse();
});

it('shows a published post with its author, date and read time', function () {
    $author = User::factory()->create(['name' => 'Alex Sena']);
    $post = Post::factory()->for($author, 'author')->create([
        'title' => 'Open-AI co-founder launches his own AI startup',
        'content' => '<p>'.str_repeat('word ', 400).'</p>',
    ]);

    $this->get("/blog/{$post->slug}")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Blog/Show')
            ->where('post.title', 'Open-AI co-founder launches his own AI startup')
            ->where('post.author', 'Alex Sena')
            ->where('post.read_time', 2)
        );
});

it('returns 404 for a draft post', function () {
    $post = Post::factory()->draft()->create();

    $this->get("/blog/{$post->slug}")->assertNotFound();
});

it('returns 404 for a post scheduled in the future', function () {
    $post = Post::factory()->scheduled()->create();

    $this->get("/blog/{$post->slug}")->assertNotFound();
});

it('marks blog routes as indexable', function () {
    $post = Post::factory()->create();

    $this->get('/blog')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('seo.robots', 'index,follow'));

    $this->get("/blog/{$post->slug}")
        ->assertInertia(fn (AssertableInertia $page) => $page->where('seo.robots', 'index,follow'));
});

it('derives a unique slug from the title', function () {
    $first = Post::factory()->create(['title' => 'Hello World', 'slug' => null]);
    $second = Post::factory()->create(['title' => 'Hello World', 'slug' => null]);

    expect($first->slug)->toBe('hello-world')
        ->and($second->slug)->toBe('hello-world-1');
});

it('reports a minimum read time of one minute', function () {
    $post = Post::factory()->create(['content' => '<p>Short.</p>']);

    expect($post->read_time)->toBe(1);
});
