@php $st = $u->status(); @endphp
<span class="badge {{ ['active'=>'gold','trial'=>'ok','expired'=>'','blocked'=>'bad'][$st] }}">{{ ['active'=>'Pro','trial'=>'Trial','expired'=>'Expired','blocked'=>'Blocked'][$st] }}</span>
