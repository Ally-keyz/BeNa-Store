import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Allow more than one panel open at a time. */
  allowMultiple?: boolean;
  className?: string;
}

/**
 * Accessible disclosure list. Panels stay in the DOM (hidden when closed) so
 * product information remains crawlable and screen-reader addressable.
 */
export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<string[]>(
    items.filter((item) => item.defaultOpen).map((item) => item.id),
  );

  const toggle = (id: string) => {
    setOpenIds((previous) => {
      if (previous.includes(id)) return previous.filter((value) => value !== id);
      return allowMultiple ? [...previous, id] : [id];
    });
  };

  return (
    <div className={cn('divide-y divide-terra-100 border-y border-terra-100', className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const buttonId = `${baseId}-button-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex min-h-11 w-full items-center justify-between gap-3 py-4 text-left text-[15px] font-medium text-ink transition-colors hover:text-terra-700"
              >
                <span className="min-w-0 break-words hyphens-auto">{item.title}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200 ease-out',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="min-w-0 break-words pb-5 pr-4 text-sm leading-6 text-neutral-700 hyphens-auto [&_a]:break-all"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
