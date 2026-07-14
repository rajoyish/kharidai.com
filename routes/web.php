<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\MenuController;
use App\Http\Controllers\Admin\NotificationController as AdminNotificationController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\PageController as AdminPageController;
use App\Http\Controllers\Admin\PostController as AdminPostController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProductVariantController;
use App\Http\Controllers\Admin\ServiceEngagementController;
use App\Http\Controllers\Admin\ShippingController;
use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Admin\TitheController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\StorefrontController;
use App\Http\Controllers\User\AddressController;
use App\Http\Controllers\User\NotificationController as UserNotificationController;
use App\Http\Controllers\User\OrderController;
use App\Http\Controllers\User\ServiceController as UserServiceController;
use App\Http\Controllers\User\SubscriptionController as UserSubscriptionController;
use Illuminate\Support\Facades\Route;

Route::get('auth/google', [GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('auth/google/callback', [GoogleController::class, 'callback'])->name('google.callback');

Route::get('/', [StorefrontController::class, 'index'])->name('home');
Route::get('/digital-products', [StorefrontController::class, 'digitalProducts'])->name('digital-products.index');
Route::get('/physical-products', [StorefrontController::class, 'physicalProducts'])->name('physical-products.index');
Route::get('/services', [StorefrontController::class, 'services'])->name('services.index');
Route::get('/categories/{category}', [StorefrontController::class, 'category'])->name('categories.show');
Route::get('/products/{product}', [StorefrontController::class, 'show'])->name('products.show');

Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('/blog/{post}', [BlogController::class, 'show'])->name('blog.show');

Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');

Route::middleware(['auth', 'verified', 'not-banned'])->group(function () {
    Route::get('cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('cart', [CartController::class, 'add'])->name('cart.add');
    Route::put('cart/{cartItem}', [CartController::class, 'update'])->name('cart.update');
    Route::delete('cart/{cartItem}', [CartController::class, 'remove'])->name('cart.remove');

    Route::get('checkout', [CheckoutController::class, 'index'])->name('checkout.index');
    Route::post('checkout', [CheckoutController::class, 'process'])->name('checkout.process');
    Route::get('checkout/{order}/npr', [CheckoutController::class, 'nprPayment'])->name('checkout.npr');
    Route::post('checkout/{order}/npr', [CheckoutController::class, 'processNprPayment'])->name('checkout.npr.process');

    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::get('subscriptions', [UserSubscriptionController::class, 'index'])->name('subscriptions.index');
    Route::put('subscriptions/{subscription}', [UserSubscriptionController::class, 'update'])->name('subscriptions.update');
    Route::get('account/services', [UserServiceController::class, 'index'])->name('account.services.index');
    Route::post('account/services/{serviceEngagement}/agree', [UserServiceController::class, 'agreeInvoice'])->name('account.services.agree');

    Route::get('account/addresses', [AddressController::class, 'index'])->name('account.addresses.index');
    Route::put('account/addresses/{address}', [AddressController::class, 'update'])->name('account.addresses.update');
    Route::patch('account/addresses/{address}/default', [AddressController::class, 'setDefault'])->name('account.addresses.default');
    Route::delete('account/addresses/{address}', [AddressController::class, 'destroy'])->name('account.addresses.destroy');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');
    Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');

    Route::prefix('user')->name('user.')->group(function () {
        Route::get('notifications', [UserNotificationController::class, 'index'])->name('notifications.index');
        Route::patch('notifications/mark-all-read', [UserNotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
        Route::delete('notifications', [UserNotificationController::class, 'destroyAll'])->name('notifications.destroy-all');
    });

    Route::post('/orders/{order}/messages', [OrderController::class, 'storeMessage'])->name('orders.messages.store');
    Route::post('/orders/{order}/ask-reupload-receipt', [OrderController::class, 'askForReceiptReupload'])->name('orders.ask-reupload-receipt');
});

Route::middleware(['auth', 'verified', 'not-banned', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('users', [UserController::class, 'index'])->name('users.index');
    Route::get('users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('users', [UserController::class, 'store'])->name('users.store');
    Route::post('users/{user}/ban', [UserController::class, 'ban'])->name('users.ban');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    Route::get('services', [ServiceEngagementController::class, 'index'])->name('services.index');
    Route::get('services/create', [ServiceEngagementController::class, 'create'])->name('services.create');
    Route::post('services', [ServiceEngagementController::class, 'store'])->name('services.store');
    Route::get('services/{serviceEngagement}', [ServiceEngagementController::class, 'show'])->name('services.show');
    Route::patch('services/{serviceEngagement}/invoice', [ServiceEngagementController::class, 'saveInvoice'])->name('services.invoice.save');
    Route::post('services/{serviceEngagement}/contract', [ServiceEngagementController::class, 'signContract'])->name('services.contract.sign');
    Route::post('services/{serviceEngagement}/advance', [ServiceEngagementController::class, 'recordAdvance'])->name('services.advance.record');
    Route::post('services/{serviceEngagement}/measurement', [ServiceEngagementController::class, 'recordMeasurement'])->name('services.measurement.record');
    Route::post('services/{serviceEngagement}/negotiate', [ServiceEngagementController::class, 'negotiate'])->name('services.negotiate');
    Route::post('services/{serviceEngagement}/complete', [ServiceEngagementController::class, 'complete'])->name('services.complete');
    Route::patch('services/{serviceEngagement}/status', [ServiceEngagementController::class, 'updateStatus'])->name('services.status.update');
    Route::patch('services/{serviceEngagement}/payment-status', [ServiceEngagementController::class, 'updatePaymentStatus'])->name('services.payment-status.update');
    Route::post('services/{serviceEngagement}/assign-order', [ServiceEngagementController::class, 'assignOrder'])->name('services.assign-order');
    Route::delete('services/{serviceEngagement}', [ServiceEngagementController::class, 'destroy'])->name('services.destroy');

    Route::resource('categories', CategoryController::class)->except(['create', 'show', 'edit']);

    // Registered before the resource so `pages/reorder` is not captured by `pages/{page}`.
    Route::patch('pages/reorder', [AdminPageController::class, 'reorder'])->name('pages.reorder');
    Route::resource('pages', AdminPageController::class)->except(['show']);
    Route::patch('pages/{page}/toggle-nav', [AdminPageController::class, 'toggleNav'])->name('pages.toggle-nav');
    Route::patch('pages/{page}/toggle-footer', [AdminPageController::class, 'toggleFooter'])->name('pages.toggle-footer');

    // Registered before the resource so `menus/reorder` is not captured by `menus/{menu}`.
    Route::patch('menus/reorder', [MenuController::class, 'reorder'])->name('menus.reorder');
    Route::resource('menus', MenuController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::resource('posts', AdminPostController::class)->except(['show']);

    Route::resource('products', ProductController::class)->except(['show']);
    Route::patch('products/{product}/toggle-stock', [ProductController::class, 'toggleStock'])->name('products.toggle-stock');
    Route::patch('products/{product}/toggle-visibility', [ProductController::class, 'toggleVisibility'])->name('products.toggle-visibility');
    Route::resource('products.variants', ProductVariantController::class)->except(['show']);

    Route::get('media', [MediaController::class, 'index'])->name('media.index');
    Route::post('media', [MediaController::class, 'store'])->name('media.store');
    Route::delete('media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');

    Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [AdminOrderController::class, 'show'])->name('orders.show');
    Route::delete('orders/{order}', [AdminOrderController::class, 'destroy'])->name('orders.destroy');
    Route::patch('orders/{order}/status', [AdminOrderController::class, 'updateStatus'])->name('orders.status.update');
    Route::patch('orders/{order}/allow-reupload', [AdminOrderController::class, 'allowReceiptReupload'])->name('orders.allow-reupload');
    Route::patch('orders/{order}/shipment-status', [AdminOrderController::class, 'updateShipmentStatus'])->name('orders.shipment-status.update');
    Route::patch('orders/{order}/mark-balance-paid', [AdminOrderController::class, 'markBalancePaid'])->name('orders.mark-balance-paid');
    Route::patch('receipts/{paymentReceipt}/status', [AdminOrderController::class, 'updateReceiptStatus'])->name('receipts.status.update');
    Route::post('orders/{order}/credentials', [AdminOrderController::class, 'storeCredential'])->name('orders.credentials.store');
    Route::put('orders/{order}/credentials/{credential}', [AdminOrderController::class, 'updateCredential'])->name('orders.credentials.update');
    Route::delete('orders/{order}/credentials/{credential}', [AdminOrderController::class, 'destroyCredential'])->name('orders.credentials.destroy');
    Route::post('orders/{order}/messages', [AdminOrderController::class, 'storeMessage'])->name('orders.messages.store');

    Route::get('shipping', [ShippingController::class, 'index'])->name('shipping.index');
    Route::post('shipping', [ShippingController::class, 'store'])->name('shipping.store');
    Route::put('shipping/{shippingZone}', [ShippingController::class, 'update'])->name('shipping.update');
    Route::delete('shipping/{shippingZone}', [ShippingController::class, 'destroy'])->name('shipping.destroy');

    Route::get('subscriptions', [AdminSubscriptionController::class, 'index'])->name('subscriptions.index');
    Route::get('tithes', [TitheController::class, 'index'])->name('tithes.index');
    Route::patch('tithes/{monthlyTithe}/toggle-status', [TitheController::class, 'toggleStatus'])->name('tithes.toggle-status');

    Route::get('notifications', [AdminNotificationController::class, 'index'])->name('notifications.index');
    Route::patch('notifications/mark-all-read', [AdminNotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('notifications', [AdminNotificationController::class, 'destroyAll'])->name('notifications.destroy-all');
});

require __DIR__.'/settings.php';

if (app()->environment('testing')) {
    require __DIR__.'/testing.php';
}

/*
 * CMS static pages live at the root (`/privacy`, `/delivery`, ...), so this
 * catch-all is registered last and only matches slug-shaped single segments.
 * Slugs that would shadow a first-party route are rejected at write time via
 * Page::RESERVED_SLUGS.
 */
Route::get('/{page}', [PageController::class, 'show'])
    ->where('page', '[a-z0-9]+(?:-[a-z0-9]+)*')
    ->name('pages.show');
