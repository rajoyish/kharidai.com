<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ManagesUserNotifications;
use App\Http\Controllers\Controller;

class NotificationController extends Controller
{
    use ManagesUserNotifications;

    protected function notificationsComponent(): string
    {
        return 'Admin/Notifications/Index';
    }
}
