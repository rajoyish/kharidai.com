---
paths:
  - public/.htaccess
---

# Public

## The server's PHP version must be pinned in the committed public/.htaccess
On cPanel, MultiPHP Manager selects a site's PHP version by writing a `# php -- BEGIN cPanel-generated handler` block into the docroot's .htaccess. The deploy rsyncs with --delete, so a block that exists only on the server gets replaced by the repo copy, and the site quietly drops back to the server's default PHP. vendor/composer/platform_check.php then fails every request. If the server's .htaccess has that block, copy it into public/.htaccess and commit it. The deploy's "Preflight Server PHP" step refuses to run until you do.
