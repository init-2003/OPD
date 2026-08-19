<?php

namespace App\Providers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS if incoming request is secure, or X-Forwarded-Proto is https, or APP_URL is https
        if (
            (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
            (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
            (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') ||
            str_starts_with(config('app.url'), 'https://') ||
            app()->environment('production')
        ) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        // Auto-handle Vite hot file: on production/IIS, ensure hot file is deleted so Laravel uses public/build
        if (file_exists(public_path('hot'))) {
            if (app()->environment('production') || (isset($_SERVER['SERVER_SOFTWARE']) && str_contains($_SERVER['SERVER_SOFTWARE'], 'Microsoft-IIS'))) {
                @unlink(public_path('hot'));
            } else {
                $connection = @fsockopen('127.0.0.1', 5173, $errno, $errstr, 0.1);
                if (is_resource($connection)) {
                    fclose($connection);
                } else {
                    @unlink(public_path('hot'));
                }
            }
        }

        Auth::provider('custom_sqlsrv_user', function ($app, array $config) {
            return new CustomUserProvider($app['hash'], $config['model']);
        });
    }
}
