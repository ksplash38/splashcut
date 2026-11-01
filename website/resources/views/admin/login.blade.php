@extends('layouts.site')
@section('title', 'Admin sign in – SplashCut')
@section('body')
<div class="center-page"><form method="post" action="{{ url('/admin/login') }}" class="card">@csrf
  <a class="brand" style="margin-bottom:20px" href="{{ url('/') }}">@include('partials.logo') SplashCut admin</a>
  @if(request()->has('installed'))<div class="notice">SplashCut is installed. Sign in with the admin email and password you just chose.</div>@endif
  @include('partials.errors')
  <div class="field"><label>Email</label><input type="email" name="email" value="{{ old('email') }}" required autofocus></div>
  <div class="field"><label>Password</label><input type="password" name="password" required></div>
  <button class="btn gold block">Sign in</button>
</form></div>
@endsection
