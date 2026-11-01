@extends('admin.layout')
@section('title', 'Payment settings')
@section('main')
<h1>Payment settings</h1>
<form method="post" action="{{ route('admin.settings.save') }}">@csrf
<div class="split" style="margin-bottom:18px">
  <div class="card"><h3>Trial and currency</h3>
    <div class="field"><label>Free trial for new accounts (days)</label><input type="number" min="0" max="365" name="trial_days" value="{{ $s['trial_days'] }}"></div>
    <div class="grid2"><div class="field"><label>Currency code</label><input name="currency" value="{{ $s['currency'] }}"></div><div class="field"><label>Currency symbol</label><input name="currency_symbol" value="{{ $s['currency_symbol'] }}"></div></div>
    <h3 style="margin-top:10px">Support contacts</h3>
    <div class="field"><label>WhatsApp number (with country code, e.g. +2348012345678)</label><input name="whatsapp" value="{{ $s['whatsapp'] }}"></div>
    <div class="field"><label>Support email</label><input type="email" name="support_email" value="{{ $s['support_email'] }}"></div>
  </div>
  <div class="card"><h3>Paystack (instant card, transfer and USSD payments)</h3>
    <p class="muted small">Find your keys in Paystack → Settings → API Keys & Webhooks. Set the webhook URL there to <b>{{ url('/paystack/webhook') }}</b>. Leave both empty to offer bank transfer only.</p>
    <div class="field"><label>Public key</label><input name="paystack_public" value="{{ $s['paystack_public'] }}" placeholder="pk_live_..."></div>
    <div class="field"><label>Secret key {!! $s['paystack_secret'] ? '<span class="badge ok">saved</span>' : '' !!}</label><input type="password" name="paystack_secret" placeholder="{{ $s['paystack_secret'] ? 'Saved. Type a new one to replace it' : 'sk_live_...' }}" autocomplete="new-password"></div>
    @if($s['paystack_secret'])<label class="row"><input type="checkbox" name="clear_paystack" value="1"> Turn off Paystack and remove the keys</label>@endif
  </div>
</div>
<div class="card" style="margin-bottom:18px"><h3>Bank transfer accounts</h3>
  <p class="muted small">Users see these in the app with a Copy button. After paying they tap "I have paid", and the payment waits for your approval under Payments.</p>
  @foreach(array_pad($banks, max(3, count($banks) + 1), ['bank' => '', 'name' => '', 'number' => '']) as $i => $b)
    <div class="grid2" style="grid-template-columns:1fr 1.4fr 1fr">
      <div class="field"><label>Bank</label><input name="bank[{{ $i }}][bank]" value="{{ $b['bank'] }}" placeholder="e.g. GTBank"></div>
      <div class="field"><label>Account name</label><input name="bank[{{ $i }}][name]" value="{{ $b['name'] }}"></div>
      <div class="field"><label>Account number</label><input name="bank[{{ $i }}][number]" value="{{ $b['number'] }}" inputmode="numeric"></div>
    </div>
  @endforeach
  <div class="field"><label>Instructions shown with the accounts</label><textarea name="payment_instructions" rows="3">{{ $s['payment_instructions'] }}</textarea></div>
</div>
<button class="btn gold">Save settings</button>
</form>
@endsection
