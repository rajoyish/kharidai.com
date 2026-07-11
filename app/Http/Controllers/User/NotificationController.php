<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Concerns\ManagesUserNotifications;
use App\Http\Controllers\Controller;

class NotificationController extends Controller
{
    use ManagesUserNotifications;

    protected function notificationsComponent(): string
    {
        return 'User/Notifications/Index';
    }
}
