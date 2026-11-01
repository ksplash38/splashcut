@extends('admin.layout')
@section('title', $u->name)
@section('main')
<h1>{{ $u->name }} @include('partials.status')</h1>
<div class="split" style="margin-bottom:18px">
  <div class="card"><h3>Subscription</h3>
    <dl class="kv">
      <dt>Free trial until</dt><dd>{{ $u->trial_ends_at?->format('j M Y, g:ia') ?? '—' }}</dd>
      <dt>Paid until</dt><dd>{{ $u->subscribed_until?->format('j M Y, g:ia') ?? '—' }}</dd>
      <dt>Days left</dt><dd>{{ $u->daysLeft() }}</dd>
      <dt>Videos exported</dt><dd>{{ $u->exports_count }}</dd>
      <dt>Phone model</dt><dd>{{ $u->device ?: '—' }}</dd>
      <dt>Last seen</dt><dd>{{ $u->last_seen_at?->diffForHumans() ?? '—' }}</dd>
      <dt>Joined</dt><dd>{{ $u->created_at->format('j M Y, g:ia') }}</dd>
    </dl>
    <form method="post" action="{{ route('admin.user.update', $u) }}" class="row" style="margin-top:18px">@csrf
      <input type="hidden" name="action" value="add_months">
      <select name="months" style="width:auto">@foreach([1,2,3,6,12] as $m)<option value="{{ $m }}">{{ $m }} month{{ $m > 1 ? 's' : '' }}</option>@endforeach</select>
      <input name="amount" placeholder="Amount received (optional)" style="width:210px">
      <button class="btn gold sm">Give Pro</button>
    </form>
    <p class="dim small">Use "Give Pro" when someone pays you outside the app. It adds the months on top of any access they still have.</p>
  </div>
  <div class="card"><h3>Details</h3>
    <form method="post" action="{{ route('admin.user.update', $u) }}">@csrf<input type="hidden" name="action" value="details">
      <div class="grid2"><div class="field"><label>Name</label><input name="name" value="{{ $u->name }}"></div><div class="field"><label>Phone</label><input name="phone" value="{{ $u->phone }}"></div></div>
      <div class="field"><label>Email</label><input name="email" value="{{ $u->email }}"></div>
      <div class="field"><label>Private note</label><input name="admin_note" value="{{ $u->admin_note }}"></div>
      <button class="btn sm">Save details</button>
    </form>
  </div>
</div>
<div class="split" style="margin-bottom:18px">
  <div class="card"><h3>Change dates</h3>
    <form method="post" action="{{ route('admin.user.update', $u) }}">@csrf<input type="hidden" name="action" value="set_dates">
      <div class="grid2"><div class="field"><label>Trial ends</label><input type="date" name="trial_ends_at" value="{{ $u->trial_ends_at?->format('Y-m-d') }}"></div>
      <div class="field"><label>Paid until</label><input type="date" name="subscribed_until" value="{{ $u->subscribed_until?->format('Y-m-d') }}"></div></div>
      <button class="btn sm">Save dates</button>
    </form>
  </div>
  <div class="card"><h3>Account actions</h3>
    <form method="post" action="{{ route('admin.user.update', $u) }}" class="row" style="margin-bottom:12px">@csrf<input type="hidden" name="action" value="password">
      <input name="password" placeholder="New password for this user" style="flex:1"><button class="btn sm">Set password</button></form>
    <div class="row">
      <form method="post" action="{{ route('admin.user.update', $u) }}">@csrf<input type="hidden" name="action" value="cancel"><button class="btn sm">End access now</button></form>
      <form method="post" action="{{ route('admin.user.update', $u) }}">@csrf<input type="hidden" name="action" value="block"><button class="btn sm danger">{{ $u->blocked ? 'Unblock' : 'Block user' }}</button></form>
      <form method="post" action="{{ route('admin.user.delete', $u) }}" onsubmit="return confirm('Delete {{ addslashes($u->name) }} and their payment history?')">@csrf<button class="btn sm danger">Delete</button></form>
    </div>
  </div>
</div>
<h3>Payments</h3>
@include('admin.partials.paytable', ['payments' => $payments])
@endsection
