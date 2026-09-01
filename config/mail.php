<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send all email
    | messages unless another mailer is explicitly specified when sending
    | the message. All additional mailers can be configured within the
    | "mailers" array. Examples of each type of mailer are provided.
    |
    */

    'default' => env('MAIL_MAILER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Here you may configure all of the mailers used by your application plus
    | their respective settings. Several examples have been configured for
    | you and you are free to add your own as your application requires.
    |
    | Laravel supports a variety of mail "transport" drivers that can be used
    | when delivering an email. You may specify which one you're using for
    | your mailers below. You may also add additional mailers if needed.
    |
    | Supported: "smtp", "sendmail", "mailgun", "ses", "ses-v2",
    |            "postmark", "resend", "log", "array",
    |            "failover", "roundrobin"
    |
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

        /*
         * The shop's own alerts, sent to the owner's inbox. Gmail is fine here and
         * nowhere else: mail to yourself carries no deliverability risk, and free
         * Gmail's terms do not cover automated mail to third parties.
         */
        'gmail' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_GMAIL_SCHEME', 'smtp'),
            'host' => env('MAIL_GMAIL_HOST', 'smtp.gmail.com'),
            'port' => env('MAIL_GMAIL_PORT', 587),
            'username' => env('MAIL_GMAIL_USERNAME'),
            'password' => env('MAIL_GMAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

        /*
         * Customer-facing mail. A transactional provider sending from our own
         * authenticated domain, so the message can be verified as ours and lands
         * in an inbox rather than a spam folder.
         */
        'brevo' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_BREVO_SCHEME', 'smtp'),
            'host' => env('MAIL_BREVO_HOST', 'smtp-relay.brevo.com'),
            'port' => env('MAIL_BREVO_PORT', 587),
            'username' => env('MAIL_BREVO_USERNAME'),
            'password' => env('MAIL_BREVO_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'postmark' => [
            'transport' => 'postmark',
            // 'message_stream_id' => env('POSTMARK_MESSAGE_STREAM_ID'),
            // 'client' => [
            //     'timeout' => 5,
            // ],
        ],

        'resend' => [
            'transport' => 'resend',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -bs -i'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
            'retry_after' => 60,
        ],

        'roundrobin' => [
            'transport' => 'roundrobin',
            'mailers' => [
                'ses',
                'postmark',
            ],
            'retry_after' => 60,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all emails sent by your application to be sent from
    | the same address. Here you may specify a name and address that is
    | used globally for all emails that are sent by your application.
    |
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
        'name' => env('MAIL_FROM_NAME', env('APP_NAME', 'Laravel')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Order Notification Address
    |--------------------------------------------------------------------------
    |
    | The shop inbox that is emailed whenever a customer places an order. This
    | is the shop's own address, not a customer's, so it is a single mailbox
    | rather than a per-user routing decision.
    |
    | Deliberately without a fallback address: this repository is public, and a
    | default here would publish the shop's inbox to anyone reading the source.
    | Left unset, no order email is sent.
    |
    */

    'order_notification_address' => env('MAIL_ORDER_NOTIFICATION_ADDRESS'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Routing
    |--------------------------------------------------------------------------
    |
    | Which mailer each kind of message goes out on. The shop's own alerts and
    | customer-facing mail have different needs, so they are sent on different
    | transports rather than sharing the default one.
    |
    | Unset means "use the default mailer", which is what local and CI want.
    |
    */

    'shop_mailer' => env('MAIL_SHOP_MAILER'),

    /*
    | Customer mail is gated on this: with no transactional provider configured,
    | sending from our domain via Gmail would land in spam and put the account at
    | risk, so we send the customer nothing at all rather than something harmful.
    */
    'customer_mailer' => env('MAIL_CUSTOMER_MAILER'),

    /*
    |--------------------------------------------------------------------------
    | Free-Tier Send Quotas
    |--------------------------------------------------------------------------
    |
    | Both transports are free tiers with a hard daily ceiling, and neither tells
    | us how much of it is left. So the app counts its own sends over a rolling
    | window and refuses to exceed them: blowing through a free tier gets the
    | account suspended, which costs us every transactional email too.
    |
    | Order matters. The first mailer with capacity wins, and Brevo leads because
    | it sends from our own authenticated domain — Gmail is the overflow, not the
    | preference.
    |
    */

    'quota' => [

        'mailers' => [
            'brevo' => (int) env('MAIL_BREVO_DAILY_LIMIT', 300),
            'gmail' => (int) env('MAIL_GMAIL_DAILY_LIMIT', 500),
        ],

        /*
         * Rolling, not calendar. The providers reset on their own clock in their
         * own timezone, and a rolling window is the conservative reading of both.
         */
        'window_hours' => (int) env('MAIL_QUOTA_WINDOW_HOURS', 24),

        /*
         * How long a dispatch row is kept after it leaves the window. Only the
         * window is load-bearing; the extra days are there so the stats widget can
         * be trusted after a clock change and so a bad day is still readable.
         */
        'retention_days' => (int) env('MAIL_QUOTA_RETENTION_DAYS', 7),
    ],

    'customer_from' => [
        'address' => env('MAIL_CUSTOMER_FROM_ADDRESS'),
        'name' => env('MAIL_CUSTOMER_FROM_NAME', env('APP_NAME', 'Laravel')),
    ],

];
