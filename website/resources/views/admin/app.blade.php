@extends('admin.layout')
@section('title', 'App download')
@section('main')
<h1>App download</h1>
<div class="split">
  <div class="card"><h3>Current app</h3>
    <dl class="kv">
      <dt>Version</dt><dd>{{ $s['apk_version'] ?: '—' }}</dd>
      <dt>Size</dt><dd>{{ $s['apk_size'] ? number_format($s['apk_size'] / 1048576, 1) . ' MB' : '—' }}</dd>
      <dt>Uploaded</dt><dd>{{ $s['apk_updated'] ? \Illuminate\Support\Carbon::parse($s['apk_updated'])->format('j M Y, g:ia') : '—' }}</dd>
      <dt>Downloads</dt><dd>{{ number_format((int) $s['downloads']) }}</dd>
      <dt>Download link</dt><dd><a href="{{ route('download') }}">{{ route('download') }}</a></dd>
    </dl>
  </div>
  <form method="post" action="{{ route('admin.app.upload') }}" enctype="multipart/form-data" class="card">@csrf
    <h3>Upload a new version</h3>
    <div class="field"><label>SplashCut.apk</label><input type="file" name="apk" accept=".apk" required></div>
    <div class="field"><label>Version name</label><input name="version" placeholder="e.g. 3.0" value="{{ old('version') }}"></div>
    <button class="btn gold">Upload</button>
    <p class="dim small" style="margin-top:14px">Your hosting allows uploads up to {{ $max }} (form limit {{ $post }}). If the upload fails because the file is too big, open cPanel → File Manager, go to <b>storage/app/private/apk</b> inside the SplashCut folder (create the <b>apk</b> folder if needed) and upload the file there named <b>SplashCut.apk</b>. The Download button picks it up automatically.</p>
  </form>
</div>
@endsection
