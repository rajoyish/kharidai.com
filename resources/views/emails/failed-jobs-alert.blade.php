<x-mail::message>
# {{ $failedCount }} failed job{{ $failedCount === 1 ? '' : 's' }}

Something queued could not be completed on {{ config('app.name') }}. Most often this is an email that failed to send — commonly the customer mail provider refusing sends once its daily limit is reached.

Nothing is lost. Failed jobs are kept and can be retried once the cause is cleared:

```
php artisan queue:failed
php artisan queue:retry all
```

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
