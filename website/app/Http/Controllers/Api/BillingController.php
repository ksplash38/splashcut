<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Setting;
use App\Services\Billing;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BillingController extends Controller
{
    public function info()
    {
        return response()->json([
            'plans' => Plan::visible()->get()->map->toApi(),
            'currency' => Setting::get('currency'),
            'symbol' => Setting::get('currency_symbol'),
            'trial_days' => (int) Setting::get('trial_days', 30),
            'paystack' => Billing::paystackEnabled(),
            'banks' => Setting::banks(),
            'instructions' => Setting::get('payment_instructions'),
            'whatsapp' => Setting::get('whatsapp'),
            'email' => Setting::get('support_email'),
            'latest_version' => Setting::get('apk_version'),
            'download_url' => url('/download'),
        ]);
    }

    public function payments(Request $r)
    {
        return response()->json(['payments' => $r->user()->payments()->limit(30)->get()->map->toApi()]);
    }

    private function newPayment(Request $r, string $method): Payment
    {
        $plan = Plan::visible()->findOrFail((int) $r->input('plan_id'));
        return Payment::create([
            'user_id' => $r->user()->id, 'plan_id' => $plan->id, 'plan_name' => $plan->name, 'months' => $plan->months,
            'amount' => $plan->price, 'method' => $method, 'status' => 'pending',
            'reference' => 'SC' . now()->format('ymd') . strtoupper(Str::random(8)),
        ]);
    }

    public function paystack(Request $r)
    {
        $r->validate(['plan_id' => 'required|integer']);
        if (!Billing::paystackEnabled()) return response()->json(['message' => 'Card payment is not available right now. Please use bank transfer.'], 422);
        $payment = $this->newPayment($r, 'paystack');
        $url = Billing::paystackInit($payment);
        if (!$url) {
            $payment->update(['status' => 'rejected', 'note' => 'Paystack did not start the checkout']);
            return response()->json(['message' => 'Could not start the card payment. Try again or use bank transfer.'], 502);
        }
        return response()->json(['url' => $url, 'reference' => $payment->reference]);
    }

    public function verify(Request $r)
    {
        $r->validate(['reference' => 'required|string|max:80']);
        $p = Payment::where('reference', $r->input('reference'))->where('user_id', $r->user()->id)->first();
        if ($p && $p->method === 'paystack' && Billing::paystackEnabled()) Billing::paystackVerify($p->reference);
        return response()->json(['user' => $r->user()->fresh()->toApi(), 'status' => $p?->fresh()->status]);
    }

    public function bank(Request $r)
    {
        $r->validate([
            'plan_id' => 'required|integer',
            'sender_name' => 'required|string|max:120',
            'note' => 'nullable|string|max:500',
            'proof' => 'nullable|image|max:6144',
        ], ['sender_name.required' => 'Enter the name on the bank account you paid from.']);
        $payment = $this->newPayment($r, 'bank');
        $payment->sender_name = $r->input('sender_name');
        $payment->note = $r->input('note');
        if ($r->hasFile('proof')) $payment->proof_path = $r->file('proof')->store('proofs');
        $payment->save();
        return response()->json(['payment' => $payment->toApi(), 'user' => $r->user()->fresh()->toApi()]);
    }
}
