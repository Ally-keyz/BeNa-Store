import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { subscribeToRestock } from '@/api/endpoints';
import { errorMessageKey, isApiError } from '@/api/errors';
import { useMarket } from '@/context/MarketContext';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface RestockFormProps {
  productHandle: string;
  submitLabel?: string;
  successMessage?: string;
  className?: string;
}

interface FormValues {
  email: string;
  consent: boolean;
}

/** Product-specific back-in-stock signup wired to POST /api/v1/restock/subscribe. */
export function RestockForm({
  productHandle,
  submitLabel,
  successMessage,
  className,
}: RestockFormProps) {
  const { t } = useTranslation();
  const { country, language } = useMarket();
  const emailId = useId();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(t('errors.VALIDATION_ERROR')),
        consent: z.boolean().refine((value) => value === true, t('productCard.notifyConsent')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', consent: false },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await subscribeToRestock({
        email: values.email,
        productHandle,
        country,
        language: language.toUpperCase(),
        consent: true,
      });
      setStatus('success');
      reset({ email: '', consent: false });
    } catch (error) {
      setStatus('error');
      setServerError(t(errorMessageKey(isApiError(error) ? error.code : undefined)));
    }
  };

  if (status === 'success') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4',
          className,
        )}
        role="status"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[14px] font-medium leading-6 text-ink">
          {successMessage ?? t('productCard.notifySuccess')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('w-full', className)} noValidate>
      <div className="rounded-2xl border border-neutral-200 bg-surface p-2 shadow-sm transition-shadow focus-within:shadow-md">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-xl bg-neutral-50 px-4">
            <Mail className="h-[18px] w-[18px] shrink-0 text-neutral-500" aria-hidden="true" />
            <label htmlFor={emailId} className="sr-only">
              {t('productCard.notifyEmailLabel')}
            </label>
            <input
              {...register('email')}
              id={emailId}
              type="email"
              autoComplete="email"
              placeholder={t('productCard.notifyEmailLabel')}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-neutral-500"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            loading={isSubmitting}
            className="h-12 shrink-0 whitespace-nowrap rounded-xl border-neutral-300 px-5 text-[13px] text-ink hover:border-ink hover:bg-neutral-50 sm:px-7 sm:text-sm"
          >
            {submitLabel ?? t('productCard.notifySubmit')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {errors.email?.message ? (
        <p id={`${emailId}-error`} className="mt-2 text-[13px] font-medium text-terra-700">
          {errors.email.message}
        </p>
      ) : null}

      <Checkbox
        {...register('consent')}
        className="mt-4"
        label={
          <>
            {t('productCard.notifyConsent')}{' '}
            <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
              {t('cookie.policyLink')}
            </Link>
          </>
        }
        error={errors.consent?.message}
      />

      {status === 'error' && serverError ? (
        <p className="mt-2 text-[13px] font-medium text-terra-700" role="alert">
          {serverError}
        </p>
      ) : null}
    </form>
  );
}
