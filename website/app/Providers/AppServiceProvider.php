<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        // Older MySQL/MariaDB on shared hosting can't index long utf8mb4 strings.
        Schema::defaultStringLength(191);

        // The site runs from a sub-folder on shared hosting; pin every link to the real address.
        $root = rtrim((string) config('app.url'), '/');
        if ($root !== '' && !app()->runningInConsole() && config('app.env') === 'production') {
            URL::forceRootUrl($root);
            if (str_starts_with($root, 'https://')) URL::forceScheme('https');
        }
    }
}
