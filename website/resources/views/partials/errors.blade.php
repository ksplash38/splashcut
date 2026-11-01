@if(session('notice'))<div class="notice">{{ session('notice') }}</div>@endif
@if($errors->any())<div class="errors"><ul>@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul></div>@endif
