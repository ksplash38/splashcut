@extends('layouts.site')
@section('title', 'Payment – SplashCut')
@section('body')
<div class="center-page"><div class="card" style="text-align:center">
  <a class="brand" style="justify-content:center;margin-bottom:18px" href="{{ url('/') }}">@include('partials.logo') SplashCut</a>
  @if($payment && $payment->status === 'paid')
    <h2 class="serif" style="font-size:34px">You're Pro now</h2>
    <p class="muted">Payment received for <b>{{ $payment->plan_name }}</b>. Your access runs until <b>{{ $payment->user->accessUntil()?->format('j M Y') }}</b>.</p>
    <p class="muted">Go back to SplashCut. Your account updates automatically.</p>
  @elseif($payment)
    <h2 class="serif" style="font-size:30px">Payment not confirmed yet</h2>
    <p class="muted">We haven't received confirmation for reference <b>{{ $payment->reference }}</b>. If you were charged, it will be activated shortly. Go back to SplashCut and open Account to check.</p>
  @else
    <h2 class="serif" style="font-size:30px">Payment not found</h2>
    <p class="muted">Go back to SplashCut and try again, or contact support.</p>
  @endif
  @if(!empty($s['whatsapp']))<p><a href="https://wa.me/{{ ltrim($s['whatsapp'], '+') }}">Need help? Chat on WhatsApp</a></p>@endif
</div></div>
@endsection
