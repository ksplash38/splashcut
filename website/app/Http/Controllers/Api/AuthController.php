<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $r)
    {
        $data = $r->validate([
            'name' => 'required|string|max:80',
            'email' => 'required|email:rfc|max:190|unique:users,email',
            'phone' => 'nullable|string|max:40',
            'password' => 'required|string|min:6|max:100',
            'device' => 'nullable|string|max:190',
        ], ['email.unique' => 'An account with this email already exists. Sign in instead.']);
        $user = new User();
        $user->fill([
            'name' => trim($data['name']), 'email' => strtolower(trim($data['email'])), 'phone' => $data['phone'] ?? null,
            'password' => $data['password'], 'device' => $data['device'] ?? null,
        ]);
        $user->trial_ends_at = now()->addDays(max(0, (int) Setting::get('trial_days', 30)));
        $user->last_seen_at = now();
        $user->save();
        $token = $user->issueToken();
        return response()->json(['token' => $token, 'user' => $user->toApi(), 'welcome' => true]);
    }

    public function login(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required|string', 'device' => 'nullable|string|max:190']);
        $user = User::where('email', strtolower(trim($data['email'])))->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Wrong email or password.', 'errors' => ['password' => ['Wrong email or password.']]], 422);
        }
        if ($user->blocked) return response()->json(['message' => 'This account has been suspended. Contact support.'], 403);
        $user->device = $data['device'] ?? $user->device;
        $user->last_seen_at = now();
        $token = $user->issueToken();
        return response()->json(['token' => $token, 'user' => $user->toApi()]);
    }

    public function me(Request $r)
    {
        return response()->json(['user' => $r->user()->toApi()]);
    }

    public function logout(Request $r)
    {
        $r->user()->forceFill(['api_token' => null])->save();
        return response()->json(['ok' => true]);
    }

    public function exported(Request $r)
    {
        $r->user()->increment('exports_count');
        return response()->json(['ok' => true]);
    }
}
