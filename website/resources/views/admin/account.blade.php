@extends('admin.layout')
@section('title', 'My account')
@section('main')
<h1>My account</h1>
<form method="post" action="{{ route('admin.account.save') }}" class="card" style="max-width:560px">@csrf
  <div class="field"><label>Name</label><input name="name" value="{{ old('name', $u->name) }}"></div>
  <div class="field"><label>Email</label><input type="email" name="email" value="{{ old('email', $u->email) }}"></div>
  <div class="grid2"><div class="field"><label>New password (optional)</label><input type="password" name="password" autocomplete="new-password"></div><div class="field"><label>Repeat new password</label><input type="password" name="password_confirmation"></div></div>
  <div class="field"><label>Current password (required to save)</label><input type="password" name="current_password" required></div>
  <button class="btn gold">Save</button>
</form>
@endsection
