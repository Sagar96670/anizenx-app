import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
  id?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 18,
  className = '',
  id = 'anime-pagination',
}) => {
  if (totalPages <= 1) return null;

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include page 1
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always include last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : currentPage * itemsPerPage;

  return (
    <div
      id={id}
      className={`w-full py-4 sm:py-6 flex flex-col items-center justify-center gap-3 border-t border-neutral-850/80 bg-neutral-950/40 rounded-2xl ${className}`}
    >
      {/* Pagination Controls Bar */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-full px-2">
        {/* Jump to First Page (if multiple pages) */}
        {totalPages > 4 && (
          <button
            id="pagination-first-btn"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex items-center justify-center min-w-[40px] h-10 p-2 rounded-xl border border-neutral-800 bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:text-neutral-400 transition-all cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Previous Button */}
        <button
          id="pagination-prev-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center gap-1 sm:gap-1.5 min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900/90 text-xs sm:text-sm font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:text-neutral-400 transition-all cursor-pointer shadow-sm"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
          {pages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1.5 py-1 text-xs font-bold text-neutral-500 select-none flex items-center justify-center min-w-[24px]"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                id={`pagination-page-${pageNum}-btn`}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-rose-600 text-white border border-rose-500 shadow-lg shadow-rose-600/30 scale-105 z-10'
                    : 'bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
                title={`Go to Page ${pageNum}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          id="pagination-next-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center gap-1 sm:gap-1.5 min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900/90 text-xs sm:text-sm font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:text-neutral-400 transition-all cursor-pointer shadow-sm"
          title="Next Page"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Jump to Last Page (if multiple pages) */}
        {totalPages > 4 && (
          <button
            id="pagination-last-btn"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:flex items-center justify-center min-w-[40px] h-10 p-2 rounded-xl border border-neutral-800 bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:text-neutral-400 transition-all cursor-pointer"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Page Info Summary Subtitle */}
      {totalItems && (
        <p className="text-[11px] sm:text-xs text-neutral-400 font-medium text-center px-4">
          Showing <span className="text-white font-semibold">{startItem}–{endItem}</span> of{' '}
          <span className="text-white font-semibold">{totalItems}</span> Anime (Page{' '}
          <span className="text-rose-400 font-bold">{currentPage}</span> of{' '}
          <span className="text-white font-semibold">{totalPages}</span>)
        </p>
      )}
    </div>
  );
};
