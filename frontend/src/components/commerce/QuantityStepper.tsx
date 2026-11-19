import { Minus, Plus } from 'lucide-react';
import { clampQuantity } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  max?: number;
  disabled?: boolean;
  className?: string;
}

/** Accessible quantity control bounded to the backend's 1–100 range. */
export function QuantityStepper({
  value,
  onChange,
  label,
  max = 100,
  disabled = false,
  className,
}: QuantityStepperProps) {
  const set = (next: number) => onChange(clampQuantity(next, max));

  return (
    <div
      className={cn(
        'inline-flex h-11 items-center rounded-full border border-terra-200 bg-white',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={disabled || value <= 1}
        aria-label={`${label} −`}
        className="inline-flex h-11 w-10 items-center justify-center rounded-l-full text-ink transition-colors hover:bg-terra-50 disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        aria-label={label}
        onChange={(event) => set(Number(event.target.value))}
        disabled={disabled}
        className="tabular h-11 w-12 border-0 bg-transparent text-center text-sm font-medium text-ink focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`${label} +`}
        className="inline-flex h-11 w-10 items-center justify-center rounded-r-full text-ink transition-colors hover:bg-terra-50 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
