<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
    ],

    'pocketsflow' => [
        'key' => env('POCKETSFLOW_API_KEY'),
        'webhook_secret' => env('POCKETSFLOW_WEBHOOK_SECRET'),
    ],

    'meta' => [
        'pixel_id' => env('META_PIXEL_ID', '2087629375156375'),
        'conversions_api_token' => env('META_CONVERSIONS_API_TOKEN'),
        'graph_version' => env('META_GRAPH_VERSION', 'v21.0'),

        /*
         * Routes events to the Test Events panel in Events Manager instead of the
         * live dataset. Must stay empty in production: Meta discards test-coded
         * events from attribution and ad optimisation.
         */
        'test_event_code' => env('META_TEST_EVENT_CODE'),
    ],

];
