<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProductVariantController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PocketsflowWebhookController;
use App\Http\Controllers\StorefrontController;
use App\Http\Controllers\User\OrderController;
use Illuminate\Support\Facades\Route;

Route::get('auth/google', [GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('auth/google/callback', [GoogleController::class, 'callback'])->name('google.callback');

Route::get('/', [StorefrontController::class, 'index'])->name('home');
Route::get('/products/{product}', [StorefrontController::class, 'show'])->name('products.show');

Route::get('/sitemap.xml', [\App\Http\Controllers\SitemapController::class, 'index'])->name('sitemap');

Route::post('webhooks/pocketsflow', [PocketsflowWebhookController::class, 'handle'])->name('webhooks.pocketsflow');

Route::middleware(['auth', 'verified', 'not-banned'])->group(function () {
    Route::get('cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('cart', [CartController::class, 'add'])->name('cart.add');
    Route::put('cart/{cartItem}', [CartController::class, 'update'])->name('cart.update');
    Route::delete('cart/{cartItem}', [CartController::class, 'remove'])->name('cart.remove');

    Route::get('checkout', [CheckoutController::class, 'index'])->name('checkout.index');
    Route::post('checkout', [CheckoutController::class, 'process'])->name('checkout.process');
    Route::get('checkout/{order}/npr', [CheckoutController::class, 'nprPayment'])->name('checkout.npr');
    Route::post('checkout/{order}/npr', [CheckoutController::class, 'processNprPayment'])->name('checkout.npr.process');
    Route::get('checkout/{order}/usd/success', [CheckoutController::class, 'usdSuccess'])->name('checkout.usd.success');
    Route::get('checkout/{order}/usd/cancel', [CheckoutController::class, 'usdCancel'])->name('checkout.usd.cancel');

    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');
    Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');

    Route::post('/orders/{order}/messages', [OrderController::class, 'storeMessage'])->name('orders.messages.store');
});

Route::middleware(['auth', 'verified', 'not-banned', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('users', [UserController::class, 'index'])->name('users.index');
    Route::post('users/{user}/ban', [UserController::class, 'ban'])->name('users.ban');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    Route::resource('categories', CategoryController::class)->except(['create', 'show', 'edit']);

    Route::resource('products', ProductController::class)->except(['show']);
    Route::post('products/{product}/media', [ProductController::class, 'uploadMedia'])->name('products.media.store');
    Route::delete('products/{product}/media/{media}', [ProductController::class, 'deleteMedia'])->name('products.media.destroy');
    Route::patch('products/{product}/toggle-stock', [ProductController::class, 'toggleStock'])->name('products.toggle-stock');
    Route::resource('products.variants', ProductVariantController::class)->except(['show']);

    Route::get('media', [MediaController::class, 'index'])->name('media.index');
    Route::post('media', [MediaController::class, 'store'])->name('media.store');
    Route::delete('media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');

    Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [AdminOrderController::class, 'show'])->name('orders.show');
    Route::delete('orders/{order}', [AdminOrderController::class, 'destroy'])->name('orders.destroy');
    Route::patch('orders/{order}/status', [AdminOrderController::class, 'updateStatus'])->name('orders.status.update');
    Route::patch('receipts/{paymentReceipt}/status', [AdminOrderController::class, 'updateReceiptStatus'])->name('receipts.status.update');
    Route::post('orders/{order}/credentials', [AdminOrderController::class, 'storeCredential'])->name('orders.credentials.store');
    Route::put('orders/{order}/credentials/{credential}', [AdminOrderController::class, 'updateCredential'])->name('orders.credentials.update');
    Route::delete('orders/{order}/credentials/{credential}', [AdminOrderController::class, 'destroyCredential'])->name('orders.credentials.destroy');
    Route::post('orders/{order}/messages', [AdminOrderController::class, 'storeMessage'])->name('orders.messages.store');
});

require __DIR__.'/settings.php';
