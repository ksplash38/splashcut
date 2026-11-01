@extends('layouts.site')
@php
  $money = fn($v) => \App\Models\Setting::money($v);
  $trial = (int) ($s['trial_days'] ?? 30);
  $size = (int) ($s['apk_size'] ?? 0);
  $wa = $s['whatsapp'] ?? '';
@endphp
@section('body')
<nav class="nav"><div class="wrap">
  <a class="brand" href="{{ url('/') }}">@include('partials.logo') SplashCut</a>
  <div class="links">
    <a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#pay">How to pay</a><a href="#faq">FAQ</a>
    <a class="btn gold sm" href="{{ route('download') }}">Download</a>
  </div>
</div></nav>

<header class="hero"><div class="wrap">
  <div>
    @if(session('notice'))<div class="notice">{{ session('notice') }}</div>@endif
    <span class="eyebrow">For Android · Free to edit · {{ $trial }}-day Pro trial</span>
    <h1 class="serif">Edit like a studio.<br>Right on your phone.</h1>
    <p class="lead">SplashCut is a complete video editor with AI built in: auto captions, background removal, stabilization, overlays, keyframes and export up to 4K.</p>
    <div class="ctas">
      <a class="btn gold" href="{{ route('download') }}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>
        Download for Android
      </a>
      <a class="btn" href="#pricing">See Pro plans</a>
    </div>
    <div class="meta">
      @if(!empty($s['apk_version']))Version {{ $s['apk_version'] }} · @endif
      @if($size) {{ number_format($size / 1048576, 1) }} MB · @endif
      Android 8 or newer
      @unless($hasApk)<span class="gold">· download available soon</span>@endunless
    </div>
  </div>
  <div class="phone" aria-hidden="true">
    <svg viewBox="0 0 270 560" fill="none">
      <rect width="270" height="560" rx="26" fill="#121212"/>
      <rect x="16" y="22" width="60" height="8" rx="4" fill="#2a2a2a"/><rect x="214" y="18" width="40" height="16" rx="8" fill="#c9a45c"/>
      <rect x="16" y="48" width="238" height="300" rx="10" fill="#1d1d1d"/>
      <circle cx="135" cy="172" r="54" fill="#2a2a2a"/><path d="M95 260c10-34 70-34 80 0" stroke="#2f2f2f" stroke-width="22" stroke-linecap="round"/>
      <rect x="62" y="300" width="146" height="22" rx="4" fill="#111" opacity=".75"/><rect x="74" y="308" width="122" height="6" rx="3" fill="#f1ede6"/>
      <rect x="16" y="364" width="238" height="1" fill="#2a2a2a"/>
      <circle cx="135" cy="384" r="12" fill="#f1ede6"/><path d="M131 378l10 6-10 6z" fill="#121212"/>
      <rect x="134" y="404" width="2" height="104" fill="#f1ede6"/>
      <rect x="16" y="412" width="78" height="34" rx="6" fill="#2a2a2a"/><rect x="98" y="412" width="96" height="34" rx="6" fill="#c9a45c" opacity=".9"/><rect x="198" y="412" width="56" height="34" rx="6" fill="#2a2a2a"/>
      <rect x="60" y="452" width="110" height="18" rx="5" fill="#3a3326"/><rect x="40" y="476" width="200" height="18" rx="5" fill="#26292a"/>
      <g fill="#78736b"><rect x="26" y="524" width="22" height="4" rx="2"/><rect x="74" y="524" width="22" height="4" rx="2"/><rect x="124" y="524" width="22" height="4" rx="2"/><rect x="174" y="524" width="22" height="4" rx="2"/><rect x="222" y="524" width="22" height="4" rx="2"/></g>
    </svg>
  </div>
</div></header>

<section id="features"><div class="wrap">
  <div class="sec-h"><h2 class="serif">Everything you need to make videos people watch</h2><p class="muted">Professional tools, simple enough to use with one thumb.</p></div>
  <div class="feats">
    @php
    $feats = [
      ['Export in 4K Ultra HD', 'Sharp 720p, 1080p or 4K at up to 60 fps, saved straight to your gallery.', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15v-6l3 4 3-4v6M16 9v6"/>'],
      ['AI auto captions', 'Speech turns into timed, styled captions automatically, on your phone.', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/>'],
      ['Remove background', 'Cut people out of any video, or blur what is behind them, with one tap.', '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/><path d="M3 3l18 18" opacity=".5"/>'],
      ['Overlays & green screen', 'Stack videos and photos, blend them, and remove green or blue screens.', '<rect x="3" y="3" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2"/>'],
      ['Keyframes & animation', 'Move, zoom and rotate anything over time with smooth keyframes.', '<path d="M12 3l4 4-4 4-4-4z"/><path d="M4 17h16M8 21h8"/>'],
      ['Stabilize & auto frame', 'Smooth out shaky footage and keep the subject in frame for 9:16.', '<path d="M3 12h3M18 12h3M12 3v3M12 18v3"/><circle cx="12" cy="12" r="5"/>'],
      ['Clean audio', 'Noise reduction, voice effects, auto ducking music and beat sync.', '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>'],
      ['30+ effects & filters', 'Film looks, motion blur, glow, light leaks, masks, transitions and relighting.', '<path d="M12 3l2.2 5.4L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.6z"/>'],
      ['Motion tracking', 'Pin text and stickers to a moving face, car or ball automatically.', '<circle cx="12" cy="12" r="2"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="7" opacity=".5"/>'],
    ];
    @endphp
    @foreach($feats as [$t, $d, $icon])
      <div class="feat"><svg viewBox="0 0 24 24">{!! $icon !!}</svg><h3>{{ $t }}</h3><p>{{ $d }}</p></div>
    @endforeach
  </div>
</div></section>

<section><div class="wrap">
  <div class="sec-h"><h2 class="serif">How it works</h2></div>
  <div class="steps">
    <div class="step"><h3>Download</h3><p>Install SplashCut on your Android phone from this page.</p></div>
    <div class="step"><h3>Edit for free</h3><p>Use every tool in the editor without an account.</p></div>
    <div class="step"><h3>Sign up to export</h3><p>Create your account when you export and get {{ $trial }} days of Pro free.</p></div>
    <div class="step"><h3>Go Pro</h3><p>Keep exporting in up to 4K with a plan that suits you.</p></div>
  </div>
</div></section>

<section id="pricing"><div class="wrap">
  <div class="sec-h"><h2 class="serif">Simple pricing</h2><p class="muted">Start with {{ $trial }} days of Pro free. Then pick a plan. No hidden charges.</p></div>
  <div class="plans">
    @forelse($plans as $p)
      @php $save = $p->old_price && $p->old_price > $p->price ? round(100 - $p->price / $p->old_price * 100) : 0; @endphp
      <div class="plan {{ $p->is_popular ? 'pop' : '' }}">
        @if($p->is_popular)<span class="tag">Most popular</span>@endif
        <h3>{{ $p->name }}</h3>
        <div class="muted small">{{ $p->description ?: $p->months . ' month' . ($p->months > 1 ? 's' : '') . ' of Pro' }}</div>
        <div class="price">{{ $money($p->price) }}@if($save)<span class="old">{{ $money($p->old_price) }}</span>@endif</div>
        <div class="muted small">{{ $p->months > 1 ? $money(round($p->perMonth())) . ' per month' : 'per month' }} @if($save)<span class="badge gold">Save {{ $save }}%</span>@endif</div>
        <ul><li>Export in 4K, 1080p or 720p</li><li>Up to 60 fps, high bitrate</li><li>Every AI tool and effect</li><li>{{ $p->months }} month{{ $p->months > 1 ? 's' : '' }} of access</li></ul>
        <a class="btn {{ $p->is_popular ? 'gold' : '' }} block" href="{{ route('download') }}">Get SplashCut</a>
      </div>
    @empty
      <p class="muted">Plans will be announced soon.</p>
    @endforelse
  </div>
</div></section>

<section id="pay"><div class="wrap">
  <div class="sec-h"><h2 class="serif">How to pay</h2><p class="muted">Pay inside the app from Account → Go Pro.</p></div>
  <div class="split">
    @if(($s['paystack_secret'] ?? '') !== '' && ($s['paystack_public'] ?? '') !== '')<div class="card"><h3>Card, transfer or USSD</h3><p class="muted">Pay instantly with Paystack. Your Pro access switches on as soon as the payment goes through.</p></div>@endif
    <div class="card"><h3>Direct bank transfer</h3><p class="muted">{{ $s['payment_instructions'] ?? '' }}</p>
      @if($banks)<div class="banks">@foreach($banks as $b)<div class="bank"><span class="dim small">{{ $b['bank'] }}</span><b>{{ $b['number'] }}</b><span class="muted small">{{ $b['name'] }}</span></div>@endforeach</div>@endif
    </div>
  </div>
</div></section>

<section id="faq" class="faq"><div class="wrap" style="max-width:780px">
  <div class="sec-h"><h2 class="serif">Questions</h2></div>
  <details><summary>How do I install the app?</summary><p>Tap Download on your Android phone, then open the downloaded SplashCut file. If your phone asks, allow your browser to "install unknown apps", then tap Install. New versions install over the old one and keep your projects.</p></details>
  <details><summary>Is SplashCut free?</summary><p>Editing is free for everyone. To export videos you create an account, which gives you {{ $trial }} days of Pro for free. After that, choose any plan to keep exporting.</p></details>
  <details><summary>What happens when my trial ends?</summary><p>Your projects stay on your phone and you can keep editing. Exporting is unlocked again as soon as you subscribe.</p></details>
  <details><summary>I paid by bank transfer. When is my account activated?</summary><p>After you tap "I have paid" in the app, we confirm the transfer and activate your Pro access, usually within a few hours. Open the app's Account page to see your status.</p></details>
  <details><summary>Can every phone export in 4K?</summary><p>4K needs a recent phone with a strong processor. If your phone can't manage it smoothly, export in 1080p, which looks great on every social app.</p></details>
</div></section>

<footer><div class="wrap">
  <span>© {{ date('Y') }} SplashCut</span>
  <span>
    @if($wa)<a href="https://wa.me/{{ ltrim($wa, '+') }}">WhatsApp support</a>@endif
    @if(!empty($s['support_email'])) · <a href="mailto:{{ $s['support_email'] }}">{{ $s['support_email'] }}</a>@endif
  </span>
</div></footer>
@endsection
