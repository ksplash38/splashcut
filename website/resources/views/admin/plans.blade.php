@extends('admin.layout')
@section('title', 'Plans & prices')
@php $money = fn($v) => \App\Models\Setting::money($v); @endphp
@section('main')
<h1>Plans & prices</h1>
<p class="muted">These are the plans people see in the app and on your website. Changes show up immediately.</p>
@foreach($plans->concat([new \App\Models\Plan(['active' => true, 'months' => 1])]) as $p)
<form method="post" action="{{ route('admin.plan.save') }}" class="card" style="margin-bottom:14px">@csrf
  <input type="hidden" name="id" value="{{ $p->id }}">
  <div class="row" style="margin-bottom:12px"><h3 style="margin:0">{{ $p->id ? $p->name : 'Add a new plan' }}</h3>
    @if($p->id)<span class="dim small">{{ $money($p->perMonth()) }} per month</span>@endif</div>
  <div class="grid2">
    <div class="field"><label>Plan name</label><input name="name" value="{{ $p->name }}" placeholder="e.g. Monthly" required></div>
    <div class="field"><label>Length (months)</label><input type="number" min="1" max="60" name="months" value="{{ $p->months }}" required></div>
    <div class="field"><label>Price</label><input type="number" step="0.01" min="0" name="price" value="{{ $p->price }}" required></div>
    <div class="field"><label>Old price (optional, shown crossed out)</label><input type="number" step="0.01" min="0" name="old_price" value="{{ $p->old_price }}"></div>
    <div class="field"><label>Short description</label><input name="description" value="{{ $p->description }}" placeholder="e.g. Best for regular creators"></div>
    <div class="field"><label>Order (smaller shows first)</label><input type="number" name="sort" value="{{ $p->sort }}"></div>
  </div>
  <div class="row">
    <label class="row" style="margin:0"><input type="checkbox" name="is_popular" value="1" @checked($p->is_popular)> Mark as "Most popular"</label>
    <label class="row" style="margin:0"><input type="checkbox" name="active" value="1" @checked($p->active)> Show this plan</label>
    <button class="btn gold sm" style="margin-left:auto">{{ $p->id ? 'Save' : 'Add plan' }}</button>
  </div>
</form>
@if($p->id)<form method="post" action="{{ route('admin.plan.delete', $p) }}" onsubmit="return confirm('Delete this plan?')" style="margin:-8px 0 18px;text-align:right">@csrf<button class="btn sm danger">Delete {{ $p->name }}</button></form>@endif
@endforeach
@endsection
