/**
 * The environment the browser suite's Laravel processes run under.
 *
 * Only APP_ENV is set here, and that is deliberate: `php artisan serve` forwards
 * just a whitelist of variables to the PHP process it spawns (see
 * ServeCommand::$passthroughVariables), and DB_CONNECTION is not on it. Setting
 * the database here would be silently dropped and the suite would run against
 * the development database.
 *
 * APP_ENV=testing is on the whitelist, so the served process loads `.env.testing`
 * itself and picks up the throwaway sqlite database from there. It is also what
 * registers `routes/testing.php`, which provides the login route the suite
 * authenticates through.
 */
export const PLAYWRIGHT_ENV = {
    APP_ENV: 'testing',
};
