@extends('admin.layout')
@section('title', 'Dashboard')
@php $money = fn($v) => \App\Models\Setting::money($v); $maxS = max(1, $days->max('signups')); $maxR = max(1, $days->max('revenue')); @endphp
@section('main')
<h1>Dashboard</h1>
<div class="stats">
  <div class="stat"><div class="k">Registered users</div><div class="v">{{ number_format($stats['users']) }}</div><div class="s">+{{ $stats['new_week'] }} this week · {{ $stats['active_today'] }} active today</div></div>
  <div class="stat"><div class="k">Paying (Pro)</div><div class="v gold">{{ number_format($stats['paying']) }}</div><div class="s">{{ $stats['trial'] }} on free trial · {{ $stats['expired'] }} expired</div></div>
  <div class="stat"><div class="k">Revenue this month</div><div class="v gold">{{ $money($stats['revenue_month']) }}</div><div class="s">{{ $money($stats['revenue_total']) }} all time</div></div>
  <div class="stat"><div class="k">Waiting for approval</div><div class="v">{{ $stats['pending'] }}</div><div class="s"><a href="{{ route('admin.payments') }}">Review payments →</a></div></div>
  <div class="stat"><div class="k">Downloads · exports</div><div class="v">{{ number_format($stats['downloads']) }}</div><div class="s">{{ number_format($stats['exports']) }} videos exported</div></div>
</div>
<div class="split" style="margin-bottom:18px">
  <div class="card"><h3>Sign-ups, last 14 days</h3>
    <div class="bars">@foreach($days as $d)<div title="{{ $d['label'] }}: {{ $d['signups'] }}" style="height:{{ $d['signups'] / $maxS * 100 }}%"></div>@endforeach</div>
    <div class="bars-l">@foreach($days as $i => $d)<span>{{ $i % 3 === 0 ? $d['label'] : '' }}</span>@endforeach</div>
  </div>
  <div class="card"><h3>Revenue, last 14 days</h3>
    <div class="bars">@foreach($days as $d)<div class="g" title="{{ $d['label'] }}: {{ $money($d['revenue']) }}" style="height:{{ $d['revenue'] / $maxR * 100 }}%"></div>@endforeach</div>
    <div class="bars-l">@foreach($days as $i => $d)<span>{{ $i % 3 === 0 ? $d['label'] : '' }}</span>@endforeach</div>
  </div>
</div>
<div class="split">
  <div><h3>Payments to approve</h3>@include('admin.partials.paytable', ['payments' => $pending, 'compact' => true])</div>
  <div><h3>Newest users</h3>
    <div class="tblw"><table class="tbl"><tr><th>User</th><th>Status</th><th class="r">Joined</th></tr>
    @forelse($recent as $u)<tr><td><a href="{{ route('admin.user', $u) }}">{{ $u->name }}</a><div class="dim small">{{ $u->email }}</div></td><td>@include('partials.status')</td><td class="r dim small">{{ $u->created_at->diffForHumans() }}</td></tr>
    @empty<tr><td colspan="3" class="muted">No users yet.</td></tr>@endforelse
    </table></div>
  </div>
</div>
@endsection
