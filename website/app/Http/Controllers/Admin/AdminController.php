<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\User;
use App\Services\Billing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    private function customers()
    {
        return User::query()->where('is_admin', false);
    }

    public function dashboard()
    {
        $now = now();
        $base = $this->customers();
        $stats = [
            'users' => (clone $base)->count(),
            'new_week' => (clone $base)->where('created_at', '>=', $now->copy()->subDays(7))->count(),
            'paying' => (clone $base)->where('subscribed_until', '>', $now)->where('blocked', false)->count(),
            'trial' => (clone $base)->where(fn ($q) => $q->whereNull('subscribed_until')->orWhere('subscribed_until', '<=', $now))->where('trial_ends_at', '>', $now)->count(),
            'expired' => 0,
            'pending' => Payment::where('status', 'pending')->count(),
            'revenue_month' => (float) Payment::where('status', 'paid')->where('approved_at', '>=', $now->copy()->startOfMonth())->sum('amount'),
            'revenue_total' => (float) Payment::where('status', 'paid')->sum('amount'),
            'exports' => (int) (clone $base)->sum('exports_count'),
            'downloads' => (int) Setting::get('downloads', 0),
            'active_today' => (clone $base)->where('last_seen_at', '>=', $now->copy()->subDay())->count(),
        ];
        $stats['expired'] = max(0, $stats['users'] - $stats['paying'] - $stats['trial']);
        $days = collect(range(13, 0))->map(function ($i) use ($now) {
            $d = $now->copy()->subDays($i)->startOfDay();
            return [
                'label' => $d->format('j/n'),
                'signups' => User::where('is_admin', false)->whereBetween('created_at', [$d, $d->copy()->endOfDay()])->count(),
                'revenue' => (float) Payment::where('status', 'paid')->whereBetween('approved_at', [$d, $d->copy()->endOfDay()])->sum('amount'),
            ];
        });
        return view('admin.dashboard', [
            'stats' => $stats, 'days' => $days,
            'pending' => Payment::with('user')->where('status', 'pending')->latest()->limit(8)->get(),
            'recent' => $this->customers()->latest()->limit(8)->get(),
        ]);
    }

    public function users(Request $r)
    {
        $q = $this->customers();
        if ($s = trim((string) $r->query('q'))) {
            $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('phone', 'like', "%$s%"));
        }
        $now = now();
        switch ($r->query('status')) {
            case 'active': $q->where('subscribed_until', '>', $now)->where('blocked', false); break;
            case 'trial': $q->where(fn ($w) => $w->whereNull('subscribed_until')->orWhere('subscribed_until', '<=', $now))->where('trial_ends_at', '>', $now)->where('blocked', false); break;
            case 'expired': $q->where(fn ($w) => $w->whereNull('subscribed_until')->orWhere('subscribed_until', '<=', $now))->where(fn ($w) => $w->whereNull('trial_ends_at')->orWhere('trial_ends_at', '<=', $now))->where('blocked', false); break;
            case 'blocked': $q->where('blocked', true); break;
        }
        return view('admin.users', ['users' => $q->latest()->paginate(30)->withQueryString()]);
    }

    public function user(User $user)
    {
        return view('admin.user', ['u' => $user, 'payments' => $user->payments()->get(), 'plans' => Plan::orderBy('months')->get()]);
    }

    public function updateUser(Request $r, User $user)
    {
        $action = $r->input('action');
        if ($action === 'add_months') {
            $m = max(1, min(60, (int) $r->input('months', 1)));
            $p = Payment::create([
                'user_id' => $user->id, 'plan_name' => "Manual $m month" . ($m > 1 ? 's' : ''), 'months' => $m,
                'amount' => (float) $r->input('amount', 0), 'method' => 'manual', 'status' => 'pending',
                'reference' => 'MAN' . now()->format('ymdHis') . $user->id, 'note' => 'Added by admin',
            ]);
            Billing::approve($p, Auth::id());
            return back()->with('notice', "Added $m month(s) of Pro to {$user->name}.");
        }
        if ($action === 'set_dates') {
            $user->trial_ends_at = $r->filled('trial_ends_at') ? \Illuminate\Support\Carbon::parse($r->input('trial_ends_at'))->endOfDay() : null;
            $user->subscribed_until = $r->filled('subscribed_until') ? \Illuminate\Support\Carbon::parse($r->input('subscribed_until'))->endOfDay() : null;
            $user->save();
            return back()->with('notice', 'Dates saved.');
        }
        if ($action === 'cancel') {
            $user->subscribed_until = now(); $user->trial_ends_at = now()->min($user->trial_ends_at ?? now()); $user->save();
            return back()->with('notice', 'Access ended. The user can no longer export until they pay.');
        }
        if ($action === 'block') { $user->blocked = !$user->blocked; $user->api_token = $user->blocked ? null : $user->api_token; $user->save(); return back()->with('notice', $user->blocked ? 'User blocked and signed out.' : 'User unblocked.'); }
        if ($action === 'details') {
            $d = $r->validate(['name' => 'required|max:80', 'email' => 'required|email|unique:users,email,' . $user->id, 'phone' => 'nullable|max:40', 'admin_note' => 'nullable|max:500']);
            $user->fill($d); $user->admin_note = $d['admin_note'] ?? null; $user->email = strtolower($d['email']); $user->save();
            return back()->with('notice', 'Details saved.');
        }
        if ($action === 'password') {
            $r->validate(['password' => 'required|min:6']);
            $user->password = $r->input('password'); $user->api_token = null; $user->save();
            return back()->with('notice', 'Password changed. Give the user the new password; they must sign in again.');
        }
        return back();
    }

    public function deleteUser(User $user)
    {
        abort_if($user->is_admin, 403);
        foreach ($user->payments as $p) if ($p->proof_path) Storage::delete($p->proof_path);
        $user->delete();
        return redirect()->route('admin.users')->with('notice', 'User deleted.');
    }

    public function payments(Request $r)
    {
        $status = $r->query('status', 'pending');
        $q = Payment::with('user')->latest();
        if (in_array($status, ['pending', 'paid', 'rejected'], true)) $q->where('status', $status);
        return view('admin.payments', ['payments' => $q->paginate(30)->withQueryString(), 'status' => $status, 'pendingCount' => Payment::where('status', 'pending')->count()]);
    }

    public function approve(Payment $payment)
    {
        Billing::approve($payment, Auth::id());
        return back()->with('notice', "Approved. {$payment->user->name} now has Pro for {$payment->months} more month(s).");
    }

    public function reject(Request $r, Payment $payment)
    {
        if ($payment->status === 'pending') { $payment->status = 'rejected'; $payment->note = trim(($payment->note ? $payment->note . ' | ' : '') . (string) $r->input('reason', 'Rejected by admin')); $payment->save(); }
        return back()->with('notice', 'Payment rejected.');
    }

    public function proof(Payment $payment)
    {
        abort_unless($payment->proof_path && Storage::exists($payment->proof_path), 404);
        return Storage::response($payment->proof_path);
    }

    public function plans()
    {
        return view('admin.plans', ['plans' => Plan::orderBy('sort')->orderBy('months')->get()]);
    }

    public function savePlan(Request $r)
    {
        $d = $r->validate([
            'id' => 'nullable|integer', 'name' => 'required|string|max:80', 'months' => 'required|integer|min:1|max:60',
            'price' => 'required|numeric|min:0', 'old_price' => 'nullable|numeric|min:0', 'description' => 'nullable|string|max:255',
            'sort' => 'nullable|integer',
        ]);
        $plan = !empty($d['id']) ? Plan::findOrFail($d['id']) : new Plan();
        $plan->fill($d);
        $plan->is_popular = $r->boolean('is_popular');
        $plan->active = $r->boolean('active');
        $plan->sort = (int) ($d['sort'] ?? 0);
        $plan->save();
        if ($plan->is_popular) Plan::where('id', '!=', $plan->id)->update(['is_popular' => false]);
        return back()->with('notice', 'Plan saved. The app shows the new price straight away.');
    }

    public function deletePlan(Plan $plan)
    {
        $plan->delete();
        return back()->with('notice', 'Plan deleted.');
    }

    public function settings()
    {
        return view('admin.settings', ['s' => Setting::all_(), 'banks' => Setting::banks()]);
    }

    public function saveSettings(Request $r)
    {
        $d = $r->validate([
            'trial_days' => 'required|integer|min:0|max:365', 'currency' => 'required|string|max:3', 'currency_symbol' => 'required|string|max:5',
            'paystack_public' => 'nullable|string|max:120', 'paystack_secret' => 'nullable|string|max:120',
            'payment_instructions' => 'nullable|string|max:2000', 'whatsapp' => 'nullable|string|max:30', 'support_email' => 'nullable|email',
            'bank' => 'array', 'bank.*.bank' => 'nullable|string|max:80', 'bank.*.name' => 'nullable|string|max:120', 'bank.*.number' => 'nullable|string|max:30',
        ]);
        $banks = collect($d['bank'] ?? [])->filter(fn ($b) => !empty($b['number']))->map(fn ($b) => ['bank' => trim($b['bank'] ?? ''), 'name' => trim($b['name'] ?? ''), 'number' => preg_replace('/\s+/', '', $b['number'])])->values();
        $vals = [
            'trial_days' => (string) $d['trial_days'], 'currency' => strtoupper($d['currency']), 'currency_symbol' => $d['currency_symbol'],
            'paystack_public' => trim((string) ($d['paystack_public'] ?? '')),
            'payment_instructions' => (string) ($d['payment_instructions'] ?? ''), 'whatsapp' => preg_replace('/[^\d+]/', '', (string) ($d['whatsapp'] ?? '')),
            'support_email' => (string) ($d['support_email'] ?? ''), 'bank_accounts' => $banks->toJson(),
        ];
        // The secret key is never shown again; an empty box keeps the saved one.
        if (trim((string) ($d['paystack_secret'] ?? '')) !== '') $vals['paystack_secret'] = trim($d['paystack_secret']);
        if ($r->boolean('clear_paystack')) { $vals['paystack_secret'] = ''; $vals['paystack_public'] = ''; }
        Setting::put($vals);
        return back()->with('notice', 'Settings saved.');
    }

    public function app()
    {
        return view('admin.app', ['s' => Setting::all_(), 'max' => ini_get('upload_max_filesize'), 'post' => ini_get('post_max_size')]);
    }

    public function uploadApk(Request $r)
    {
        $r->validate(['apk' => 'required|file|max:204800', 'version' => 'nullable|string|max:30'], ['apk.uploaded' => 'The upload was too big for your hosting. See the note below to upload it with File Manager instead.']);
        $f = $r->file('apk');
        if (strtolower($f->getClientOriginalExtension()) !== 'apk') return back()->withErrors(['apk' => 'Choose the SplashCut.apk file.']);
        $old = Setting::get('apk_path');
        $path = $f->storeAs('apk', 'SplashCut.apk');
        Setting::put(['apk_path' => $path, 'apk_version' => (string) $r->input('version', ''), 'apk_size' => (string) $f->getSize(), 'apk_updated' => now()->toIso8601String()]);
        if ($old && $old !== $path) Storage::delete($old);
        return back()->with('notice', 'App uploaded. The Download button on your website now gives people this version.');
    }

    public function account()
    {
        return view('admin.account', ['u' => Auth::user()]);
    }

    public function saveAccount(Request $r)
    {
        $u = Auth::user();
        $d = $r->validate(['name' => 'required|max:80', 'email' => 'required|email|unique:users,email,' . $u->id, 'current_password' => 'required', 'password' => 'nullable|min:8|confirmed']);
        if (!Hash::check($d['current_password'], $u->password)) return back()->withErrors(['current_password' => 'Your current password is wrong.']);
        $u->name = $d['name']; $u->email = strtolower($d['email']);
        if (!empty($d['password'])) $u->password = $d['password'];
        $u->save();
        return back()->with('notice', 'Account saved.');
    }
}
