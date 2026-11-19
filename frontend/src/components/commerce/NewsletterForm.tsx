import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { subscribeNewsletter } from '@/api/endpoints';
import { errorMessageKey } from '@/api/errors';
import { isApiError } from '@/api/errors';
import { useMarket } from '@/context/MarketContext';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface NewsletterFormProps {
  source: string;
  variant?: 'default' | 'footer';
  submitLabel?: string;
  successMessage?: string;
  className?: string;
}

interface FormValues {
  email: string;
  consent: boolean;
}

/**
 * Newsletter form wired to POST /api/v1/newsletter/subscribe.
 * Explicit consent is required; the backend records opt-in metadata.
 */
export function NewsletterForm({
  source,
  variant = 'default',
  submitLabel,
  successMessage,
  className,
}: NewsletterFormProps) {
  const { t } = useTranslation();
  const { language } = useMarket();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(t('errors.VALIDATION_ERROR')),
        consent: z
          .boolean()
          .refine((value) => value === true, t('home.newsletterConsent')),
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
      await subscribeNewsletter({
        email: values.email,
        marketingConsent: true,
        source,
        language: language.toUpperCase(),
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
      <p className={cn('text-sm text-chocolate-700', className)} role="status">
        {successMessage ?? t('home.newsletterSuccess')}
      </p>
    );
  }

  const isFooter = variant === 'footer';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('w-full', className)}
      noValidate
    >
      <div className={cn('flex gap-2', isFooter ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row')}>
        <Input
          {...register('email')}
          type="email"
          autoComplete="email"
          label={t('home.newsletterEmailLabel')}
          hideLabel={isFooter}
          placeholder={t('home.newsletterEmailLabel')}
          error={errors.email?.message}
          className={isFooter ? 'bg-white' : undefined}
        />
        <Button
          type="submit"
          variant={isFooter ? 'secondary' : 'primary'}
          loading={isSubmitting}
          className={cn('shrink-0', isFooter && 'sm:mt-0')}
        >
          {submitLabel ?? t('home.newsletterSubmit')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <Checkbox
        {...register('consent')}
        className="mt-3"
        label={
          <>
            {t('home.newsletterConsent')}{' '}
            <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
              {t('cookie.policyLink')}
            </Link>
          </>
        }
        error={errors.consent?.message}
      />

      {status === 'error' && serverError ? (
        <p className="mt-2 text-[13px] font-medium text-chocolate-700" role="alert">
          {serverError}
        </p>
      ) : null}
    </form>
  );
}
