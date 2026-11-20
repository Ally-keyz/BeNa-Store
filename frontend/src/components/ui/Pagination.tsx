import { Button } from './Button';

export interface PaginationProps {
  hasNextPage: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  label: string;
  loadingLabel: string;
  className?: string;
}

/**
 * Cursor-pagination control. The backend returns `meta.pagination.endCursor`,
 * so the UI appends results via "Load more" rather than page numbers.
 */
export function Pagination({
  hasNextPage,
  loading = false,
  onLoadMore,
  label,
  loadingLabel,
  className,
}: PaginationProps) {
  if (!hasNextPage) return null;
  return (
    <div className={className ?? 'mt-10 flex flex-wrap justify-center gap-2'}>
      <Button
        variant="secondary"
        className="max-w-full break-words"
        onClick={onLoadMore}
        loading={loading}
        aria-live="polite"
      >
        {loading ? loadingLabel : label}
      </Button>
    </div>
  );
}
