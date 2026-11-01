<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class ApiToken
{
    public function handle(Request $request, Closure $next)
    {
        // Some shared hosts strip the Authorization header, so the app also sends X-Token.
        $plain = $request->bearerToken() ?: $request->header('X-Token');
        $user = $plain ? User::where('api_token', hash('sha256', $plain))->first() : null;
        if (!$user) {
            return response()->json(['message' => 'Please sign in again.', 'code' => 'signed_out'], 401);
        }
        if ($user->blocked) {
            return response()->json(['message' => 'This account has been suspended. Contact support.', 'code' => 'blocked'], 403);
        }
        if (!$user->last_seen_at || $user->last_seen_at->lt(now()->subMinutes(10))) {
            $user->forceFill(['last_seen_at' => now()])->save();
        }
        $request->setUserResolver(fn () => $user);
        return $next($request);
    }
}
