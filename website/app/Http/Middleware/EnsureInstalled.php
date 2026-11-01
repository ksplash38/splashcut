<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureInstalled
{
    public static function installed(): bool
    {
        return is_file(storage_path('app/installed'));
    }

    public function handle(Request $request, Closure $next)
    {
        $isInstall = $request->is('install') || $request->is('install/*');
        if (!static::installed() && !$isInstall) {
            if ($request->is('api/*')) return response()->json(['message' => 'The SplashCut server is being set up. Try again soon.'], 503);
            return redirect('/install');
        }
        if (static::installed() && $isInstall) abort(404);
        return $next($request);
    }
}
