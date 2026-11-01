@php $money = fn($v) => \App\Models\Setting::money($v); @endphp
<div class="tblw"><table class="tbl">
<tr><th>User</th><th>Plan</th><th>Amount</th>@unless(!empty($compact))<th>Method · reference</th><th>Paid from</th>@endunless<th>Status</th><th class="r"></th></tr>
@forelse($payments as $p)
<tr>
  <td>@if($p->user)<a href="{{ route('admin.user', $p->user) }}">{{ $p->user->name }}</a><div class="dim small">{{ $p->user->email }}</div>@else<span class="dim">deleted</span>@endif</td>
  <td>{{ $p->plan_name }}<div class="dim small">{{ $p->created_at->format('j M, g:ia') }}</div></td>
  <td>{{ $money($p->amount) }}</td>
  @unless(!empty($compact))
  <td>{{ ucfirst($p->method) }}<div class="dim small">{{ $p->reference }}</div></td>
  <td>{{ $p->sender_name ?: '—' }}@if($p->note)<div class="dim small">{{ $p->note }}</div>@endif @if($p->proof_path)<div><a class="small" target="_blank" href="{{ route('admin.payment.proof', $p) }}">View receipt</a></div>@endif</td>
  @endunless
  <td><span class="badge {{ ['paid'=>'gold','pending'=>'','rejected'=>'bad'][$p->status] ?? '' }}">{{ ucfirst($p->status) }}</span></td>
  <td class="r">@if($p->status === 'pending')
    <div class="row" style="justify-content:flex-end">
      <form method="post" action="{{ route('admin.payment.approve', $p) }}">@csrf<button class="btn gold sm">Approve</button></form>
      <form method="post" action="{{ route('admin.payment.reject', $p) }}">@csrf<button class="btn sm danger">Reject</button></form>
    </div>@endif</td>
</tr>
@empty<tr><td colspan="7" class="muted">Nothing here.</td></tr>@endforelse
</table></div>
