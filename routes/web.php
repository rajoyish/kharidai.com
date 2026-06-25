<?php

use App\Http\Controllers\Auth\GoogleController;
use Illuminate\Support\Facades\Route;

Route::get('auth/google', [GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('auth/google/callback', [GoogleController::class, 'callback'])->name('google.callback');

Route::get('/', [\App\Http\Controllers\StorefrontController::class, 'index'])->name('home');
Route::get('/products/{product}', [\App\Http\Controllers\StorefrontController::class, 'show'])->name('products.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia\Inertia::render('dashboard', [
            'recentOrders' => auth()->user()->orders()->with('items.product_variant.product')->latest()->take(5)->get()
        ]);
    })->name('dashboard');

    Route::get('cart', [\App\Http\Controllers\CartController::class, 'index'])->name('cart.index');
    Route::post('cart', [\App\Http\Controllers\CartController::class, 'add'])->name('cart.add');
    Route::put('cart/{cartItem}', [\App\Http\Controllers\CartController::class, 'update'])->name('cart.update');
    Route::delete('cart/{cartItem}', [\App\Http\Controllers\CartController::class, 'remove'])->name('cart.remove');

    Route::get('checkout', [\App\Http\Controllers\CheckoutController::class, 'index'])->name('checkout.index');
    Route::post('checkout', [\App\Http\Controllers\CheckoutController::class, 'process'])->name('checkout.process');
    Route::get('checkout/{order}/npr', [\App\Http\Controllers\CheckoutController::class, 'nprPayment'])->name('checkout.npr');
    Route::post('checkout/{order}/npr', [\App\Http\Controllers\CheckoutController::class, 'processNprPayment'])->name('checkout.npr.process');
    Route::get('checkout/{order}/usd-mock', [\App\Http\Controllers\CheckoutController::class, 'mockPocketsflow'])->name('checkout.usd.mock');
    Route::post('checkout/{order}/usd-mock', [\App\Http\Controllers\CheckoutController::class, 'processMockPocketsflow'])->name('checkout.usd.mock.process');

    Route::get('orders', [\App\Http\Controllers\User\OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [\App\Http\Controllers\User\OrderController::class, 'show'])->name('orders.show');
    Route::post('orders/{order}/messages', [\App\Http\Controllers\User\OrderController::class, 'storeMessage'])->name('orders.messages.store');
});

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Admin\DashboardController::class, 'index'])->name('dashboard');
    Route::get('users', [\App\Http\Controllers\Admin\UserController::class, 'index'])->name('users.index');
    Route::post('users/{user}/ban', [\App\Http\Controllers\Admin\UserController::class, 'ban'])->name('users.ban');
    Route::delete('users/{user}', [\App\Http\Controllers\Admin\UserController::class, 'destroy'])->name('users.destroy');

    Route::resource('products', \App\Http\Controllers\Admin\ProductController::class)->except(['show']);
    Route::resource('products.variants', \App\Http\Controllers\Admin\ProductVariantController::class)->except(['show']);

    Route::get('orders', [\App\Http\Controllers\Admin\OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [\App\Http\Controllers\Admin\OrderController::class, 'show'])->name('orders.show');
    Route::patch('orders/{order}/status', [\App\Http\Controllers\Admin\OrderController::class, 'updateStatus'])->name('orders.status.update');
    Route::patch('receipts/{paymentReceipt}/status', [\App\Http\Controllers\Admin\OrderController::class, 'updateReceiptStatus'])->name('receipts.status.update');
    Route::post('orders/{order}/credentials', [\App\Http\Controllers\Admin\OrderController::class, 'storeCredential'])->name('orders.credentials.store');
    Route::post('orders/{order}/messages', [\App\Http\Controllers\Admin\OrderController::class, 'storeMessage'])->name('orders.messages.store');
});

require __DIR__.'/settings.php';
