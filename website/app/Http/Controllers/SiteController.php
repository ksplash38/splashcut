<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Setting;
use App\Services\Billing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SiteController extends Controller
{
    public function home()
    {
        return view('site.home', [
            'plans' => Plan::visible()->get(),
            's' => Setting::all_(),
            'banks' => Setting::banks(),
            'hasApk' => Storage::exists(static::apkPath()),
        ]);
    }

    public function download()
    {
        $path = static::apkPath();
        if (!Storage::exists($path)) {
            return redirect()->route('home')->with('notice', 'The app download will be available very soon.');
        }
        Setting::put(['downloads' => (string) ((int) Setting::get('downloads', 0) + 1)]);
        $v = Setting::get('apk_version');
        return Storage::download($path, 'SplashCut' . ($v ? '-' . preg_replace('/[^\w.]+/', '', $v) : '') . '.apk', [
            'Content-Type' => 'application/vnd.android.package-archive',
        ]);
    }

    /** Uploaded in the admin, or put there by hand with cPanel File Manager (storage/app/private/apk/SplashCut.apk). */
    public static function apkPath(): string
    {
        return Setting::get('apk_path') ?: 'apk/SplashCut.apk';
    }

    public function paystackCallback(Request $r)
    {
        $ref = (string) $r->query('reference', $r->query('trxref', ''));
        $payment = $ref !== '' && Billing::paystackEnabled() ? Billing::paystackVerify($ref) : null;
        return view('site.paid', ['payment' => $payment, 's' => Setting::all_()]);
    }

    public function paystackWebhook(Request $r)
    {
        $secret = Setting::get('paystack_secret');
        $sig = (string) $r->header('x-paystack-signature');
        if ($secret === '' || !hash_equals(hash_hmac('sha512', $r->getContent(), $secret), $sig)) {
            return response('invalid', 401);
        }
        if ($r->input('event') === 'charge.success') {
            try { Billing::paystackVerify((string) $r->input('data.reference')); } catch (\Throwable $e) { Log::warning($e->getMessage()); }
        }
        return response('ok');
    }
}
