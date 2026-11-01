@if ($paginator->hasPages())
<ul class="pagination">
  @if(!$paginator->onFirstPage())<li><a href="{{ $paginator->previousPageUrl() }}">‹ Prev</a></li>@endif
  <li class="active"><span>Page {{ $paginator->currentPage() }} of {{ $paginator->lastPage() }}</span></li>
  @if($paginator->hasMorePages())<li><a href="{{ $paginator->nextPageUrl() }}">Next ›</a></li>@endif
</ul>
@endif
