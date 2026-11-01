<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>@yield('title', 'Admin') – SplashCut</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{ asset('css/app.css') }}?v=3">
</head>
<body>
@php $pc = \App\Models\Payment::where('status','pending')->count(); $r = request()->route()?->getName(); @endphp
<div class="adm">
  <aside class="side">
    <a class="brand" href="{{ route('admin.dashboard') }}">@include('partials.logo') SplashCut</a>
    <a class="nl {{ $r === 'admin.dashboard' ? 'on' : '' }}" href="{{ route('admin.dashboard') }}">Dashboard</a>
    <a class="nl {{ str_starts_with($r, 'admin.user') ? 'on' : '' }}" href="{{ route('admin.users') }}">Users</a>
    <a class="nl {{ str_starts_with($r, 'admin.payment') ? 'on' : '' }}" href="{{ route('admin.payments') }}">Payments @if($pc)<span class="cnt">{{ $pc }}</span>@endif</a>
    <a class="nl {{ str_starts_with($r, 'admin.plan') ? 'on' : '' }}" href="{{ route('admin.plans') }}">Plans & prices</a>
    <a class="nl {{ str_starts_with($r, 'admin.settings') ? 'on' : '' }}" href="{{ route('admin.settings') }}">Payment settings</a>
    <a class="nl {{ str_starts_with($r, 'admin.app') ? 'on' : '' }}" href="{{ route('admin.app') }}">App download</a>
    <a class="nl {{ str_starts_with($r, 'admin.account') ? 'on' : '' }}" href="{{ route('admin.account') }}">My account</a>
    <a class="nl" href="{{ url('/') }}" target="_blank">View website ↗</a>
    <form method="post" action="{{ route('admin.logout') }}">@csrf<button class="btn sm block">Sign out</button></form>
  </aside>
  <main class="main">
    @include('partials.errors')
    @yield('main')
  </main>
</div>
</body>
</html>
