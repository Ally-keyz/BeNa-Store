import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  label: string;
  defaultTab?: string;
  className?: string;
}

/** WAI-ARIA tabs with arrow-key navigation. */
export function Tabs({ items, label, defaultTab, className }: TabsProps) {
  const baseId = useId();
  const [active, setActive] = useState<string>(defaultTab ?? items[0]?.id ?? '');

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    const currentIndex = items.findIndex((item) => item.id === active);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    const next = items[nextIndex];
    if (!next) return;
    setActive(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-terra-100"
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={cn(
                'relative shrink-0 px-4 py-3 text-sm font-medium transition-colors',
                selected ? 'text-ink' : 'text-neutral-600 hover:text-ink',
              )}
            >
              {item.label}
              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-px h-0.5 bg-brand"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={`${baseId}-panel-${item.id}`}
            aria-labelledby={`${baseId}-tab-${item.id}`}
            hidden={!selected}
            tabIndex={0}
            className="pt-5 focus-visible:outline-none"
          >
            {selected ? item.content : null}
          </div>
        );
      })}
    </div>
  );
}
