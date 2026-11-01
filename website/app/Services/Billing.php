<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class Billing
{
    /** Marks a payment as paid and gives the user their months. Safe to call twice. */
    public static function approve(Payment $payment, ?int $adminId = null): bool
    {
        return DB::transaction(function () use ($payment, $adminId) {
            $p = Payment::query()->lockForUpdate()->find($payment->id);
            if (!$p || $p->status === 'paid') return false;
            $p->status = 'paid';
            $p->approved_at = now();
            $p->approved_by = $adminId;
            $p->save();
            $p->user->addMonths($p->months);
            return true;
        });
    }

    public static function paystackEnabled(): bool
    {
        return Setting::get('paystack_secret') !== '' && Setting::get('paystack_public') !== '';
    }

    /** Starts a Paystack checkout and returns the page the customer pays on. */
    public static function paystackInit(Payment $payment): ?string
    {
        $res = Http::withToken(Setting::get('paystack_secret'))->timeout(30)
            ->post('https://api.paystack.co/transaction/initialize', [
                'email' => $payment->user->email,
                'amount' => (int) round($payment->amount * 100),
                'currency' => Setting::get('currency', 'NGN'),
                'reference' => $payment->reference,
                'callback_url' => url('/paystack/callback'),
                'metadata' => ['payment_id' => $payment->id, 'plan' => $payment->plan_name, 'user_id' => $payment->user_id],
            ]);
        if (!$res->ok() || !$res->json('status')) return null;
        return $res->json('data.authorization_url');
    }

    /** Asks Paystack whether the reference was paid in full; approves it if so. */
    public static function paystackVerify(string $reference): ?Payment
    {
        $payment = Payment::where('reference', $reference)->first();
        if (!$payment) return null;
        if ($payment->status === 'paid') return $payment;
        $res = Http::withToken(Setting::get('paystack_secret'))->timeout(30)
            ->get('https://api.paystack.co/transaction/verify/' . rawurlencode($reference));
        if ($res->ok() && $res->json('data.status') === 'success'
            && (int) $res->json('data.amount') >= (int) round($payment->amount * 100)) {
            static::approve($payment);
            $payment->refresh();
        }
        return $payment;
    }
}
