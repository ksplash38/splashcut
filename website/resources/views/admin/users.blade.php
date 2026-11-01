@extends('admin.layout')
@section('title', 'Users')
@section('main')
<h1>Users</h1>
<div class="filters">
  @php $cur = request('status'); @endphp
  @foreach(['' => 'All', 'active' => 'Pro', 'trial' => 'Trial', 'expired' => 'Expired', 'blocked' => 'Blocked'] as $k => $l)
    <a class="{{ (string) $cur === $k ? 'on' : '' }}" href="{{ route('admin.users', array_filter(['status' => $k, 'q' => request('q')])) }}">{{ $l }}</a>
  @endforeach
  <form method="get"><input type="hidden" name="status" value="{{ $cur }}"><input name="q" value="{{ request('q') }}" placeholder="Search name, email, phone"><button class="btn sm">Search</button></form>
</div>
<div class="tblw"><table class="tbl">
<tr><th>User</th><th>Phone</th><th>Status</th><th>Access until</th><th>Exports</th><th>Last seen</th><th class="r">Joined</th></tr>
@forelse($users as $u)
<tr>
  <td><a href="{{ route('admin.user', $u) }}">{{ $u->name }}</a><div class="dim small">{{ $u->email }}</div></td>
  <td>{{ $u->phone ?: '—' }}</td>
  <td>@include('partials.status')</td>
  <td>{{ $u->accessUntil()?->format('j M Y') ?? '—' }}@if($u->daysLeft())<div class="dim small">{{ $u->daysLeft() }} days left</div>@endif</td>
  <td>{{ $u->exports_count }}</td>
  <td class="dim small">{{ $u->last_seen_at?->diffForHumans() ?? '—' }}</td>
  <td class="r dim small">{{ $u->created_at->format('j M Y') }}</td>
</tr>
@empty<tr><td colspan="7" class="muted">No users found.</td></tr>@endforelse
</table></div>
{{ $users->links('admin.partials.pager') }}
@endsection
