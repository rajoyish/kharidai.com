<?php

namespace App\Providers;

use App\Listeners\EnforceEmailQuota;
use App\Listeners\LogSsrRenderFailure;
use App\Models\Order;
use App\Models\ServiceEngagement;
use App\Observers\OrderObserver;
use App\Observers\ServiceEngagementObserver;
use App\Services\Mail\QuotaAwareMailManager;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\Ssr\SsrRenderFailed;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->registerQuotaAwareMailManager();
    }

    /**
     * Swap Laravel's mail manager for the one that counts what it sends.
     *
     * Done by extending the binding rather than rebinding it, because
     * MailServiceProvider is deferred: a plain singleton() here would be
     * overwritten the moment something resolved a mailer and loaded that provider.
     *
     * @see QuotaAwareMailManager
     */
    protected function registerQuotaAwareMailManager(): void
    {
        $this->app->extend('mail.manager', fn ($manager, $app): QuotaAwareMailManager => new QuotaAwareMailManager($app));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Order::observe(OrderObserver::class);
        ServiceEngagement::observe(ServiceEngagementObserver::class);

        $this->configureDefaults();
        $this->embedLogoInOutgoingMail();

        /*
         * The last line of defence on the free-tier send limits. Registered before
         * the logo listener has no bearing on order — both are MessageSending
         * listeners, but only this one returns a value, and a `false` from any of
         * them cancels the send.
         */
        Event::listen(MessageSending::class, EnforceEmailQuota::class);

        // Registered here rather than left to event discovery so it survives
        // `event:cache` and stays obvious: without a listener Inertia's SSR
        // failures go nowhere and the site quietly serves an empty root.
        Event::listen(SsrRenderFailed::class, LogSsrRenderFailure::class);
    }

    /**
     * Attach the logo to every outgoing email as an inline image.
     *
     * The mail layout's header renders it as <img src="cid:logo">. A cid rather
     * than a URL because Gmail's image proxy has to be able to fetch a URL, and
     * http://localhost never is — the logo would arrive broken in every email sent
     * from a dev machine. Embedding it in the message sidesteps that entirely.
     *
     * Done here, once, rather than per-Mailable: the header is shared by every
     * email we send, so a Mailable that forgot to embed the image would render a
     * broken cid. Hooking the send makes that impossible to get wrong.
     */
    protected function embedLogoInOutgoingMail(): void
    {
        Event::listen(function (MessageSending $event): void {
            $logo = public_path('images/logo-email.png');

            if (! is_file($logo)) {
                return;
            }

            $event->message->embedFromPath($logo, 'logo');
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        $this->configureModels();

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Catch N+1 queries at the source. Prevention stays on everywhere so the same
     * rule holds in every environment, but a violation is only fatal while
     * developing — in production it is logged, because a page that renders one
     * query too many still beats a page that 500s.
     */
    protected function configureModels(): void
    {
        Model::preventLazyLoading();

        Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation): void {
            // A custom callback replaces Laravel's default handler wholesale, so the
            // exemption it grants to unsaved and just-created models has to be
            // restated here — neither can have caused an N+1.
            if (! $model->exists || $model->wasRecentlyCreated) {
                return;
            }

            if (! app()->isProduction()) {
                throw new LazyLoadingViolationException($model, $relation);
            }

            $class = $model::class;

            Log::warning("Attempted to lazy load [{$relation}] on model [{$class}].");
        });
    }
}
