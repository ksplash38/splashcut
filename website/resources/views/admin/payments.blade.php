@extends('admin.layout')
@section('title', 'Payments')
@section('main')
<h1>Payments</h1>
<div class="filters">
  @foreach(['pending' => "Waiting ($pendingCount)", 'paid' => 'Paid', 'rejected' => 'Rejected', 'all' => 'All'] as $k => $l)
    <a class="{{ $status === $k ? 'on' : '' }}" href="{{ route('admin.payments', ['status' => $k]) }}">{{ $l }}</a>
  @endforeach
</div>
<p class="muted small">Bank transfers wait here until you approve them. Check that the money arrived in your account from the name shown, then tap Approve. The user gets Pro immediately. Paystack payments are approved automatically.</p>
@include('admin.partials.paytable')
{{ $payments->links('admin.partials.pager') }}
@endsection
