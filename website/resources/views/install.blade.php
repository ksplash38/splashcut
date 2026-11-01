@extends('layouts.site')
@section('title', 'Install SplashCut')
@section('body')
<div class="wrap" style="max-width:720px;padding:48px 20px">
  <a class="brand" href="#">@include('partials.logo') SplashCut setup</a>
  <p class="muted" style="margin:16px 0 26px">This one-time setup connects your website to its database and creates your admin account.</p>
  @include('partials.errors')
  <div class="card" style="margin-bottom:18px"><h3>Server check</h3>
    @foreach($checks as $label => $ok)
      <div class="check"><span>{{ $label }}</span><span class="badge {{ $ok ? 'ok' : 'bad' }}">{{ $ok ? 'OK' : 'Fix this' }}</span></div>
    @endforeach
  </div>
  <form method="post" action="{{ url('/install') }}" class="card">@csrf
    <h3>Website</h3>
    <div class="field"><label>Website address</label><input name="app_url" value="{{ old('app_url', $url) }}" required><div class="dim small">Use https:// so the app can connect securely.</div></div>
    <h3 style="margin-top:22px">Database (create it in cPanel → MySQL Databases)</h3>
    <div class="grid2">
      <div class="field"><label>Database host</label><input name="db_host" value="{{ old('db_host', 'localhost') }}" required></div>
      <div class="field"><label>Port</label><input name="db_port" value="{{ old('db_port', '3306') }}" required></div>
      <div class="field"><label>Database name</label><input name="db_name" value="{{ old('db_name') }}" placeholder="cpaneluser_splashcut" required></div>
      <div class="field"><label>Database user</label><input name="db_user" value="{{ old('db_user') }}" placeholder="cpaneluser_admin" required></div>
    </div>
    <div class="field"><label>Database password</label><input type="password" name="db_pass"></div>
    <h3 style="margin-top:22px">Your admin account</h3>
    <div class="grid2">
      <div class="field"><label>Your name</label><input name="admin_name" value="{{ old('admin_name') }}" required></div>
      <div class="field"><label>Admin email</label><input type="email" name="admin_email" value="{{ old('admin_email') }}" required></div>
      <div class="field"><label>Password (8+ characters)</label><input type="password" name="admin_password" required></div>
      <div class="field"><label>Repeat password</label><input type="password" name="admin_password_confirmation" required></div>
    </div>
    <button class="btn gold block" style="margin-top:8px">Install SplashCut</button>
  </form>
</div>
@endsection
