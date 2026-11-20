import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Check, FileText } from 'lucide-react';
import { submitWithdrawal } from '@/api/endpoints';
import { errorMessageKey, isApiError } from '@/api/errors';
import { useMarket } from '@/context/MarketContext';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/cn';

interface FormValues {
  orderNumber: string;
  email: string;
  fullName: string;
  countryCode: string;
  orderedOn: string;
  itemDescription: string;
  reason: string;
  declaration: boolean;
}

/** Electronic withdrawal intake (audit #1). Legal copy must be approved by the owner. */
export function WithdrawalForm({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { country, language } = useMarket();
  const [reference, setReference] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        orderNumber: z.string().trim().min(1, t('remediation.withdrawalOrder')).max(80),
        email: z.string().trim().email(t('errors.VALIDATION_ERROR')).max(254),
        fullName: z.string().trim().min(2, t('remediation.withdrawalName')).max(160),
        countryCode: z.string().trim().length(2).toUpperCase(),
        orderedOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, t('remediation.withdrawalOrderedOn')),
        itemDescription: z.string().trim().max(500),
        reason: z.string().trim().max(1000),
        declaration: z.boolean().refine((value) => value === true, t('remediation.withdrawalDeclaration')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderNumber: '',
      email: '',
      fullName: '',
      countryCode: country,
      orderedOn: '',
      itemDescription: '',
      reason: '',
      declaration: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const result = await submitWithdrawal({
        orderNumber: values.orderNumber,
        email: values.email,
        fullName: values.fullName,
        countryCode: values.countryCode,
        orderedOn: values.orderedOn,
        itemDescription: values.itemDescription || undefined,
        reason: values.reason || undefined,
        declaration: true,
        language: language.toUpperCase(),
      });
      setReference(result.data.reference);
      setSimulated(result.data.simulated);
    } catch (error) {
      setServerError(t(errorMessageKey(isApiError(error) ? error.code : undefined)));
    }
  };

  if (reference) {
    return (
      <div role="status" className={cn('rounded-card border border-brand/25 bg-terra-50 p-5', className)}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
            <Check className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-ink">{t('remediation.withdrawalSuccessTitle')}</p>
            <p className="mt-1 text-[13px] leading-6 text-neutral-600">
              {t('remediation.withdrawalSuccessBody')}
            </p>
            <p className="mt-3 text-sm font-semibold text-ink">
              {t('remediation.withdrawalReference')}: {reference}
            </p>
            {simulated ? (
              <p className="mt-2 text-[12px] text-neutral-600">{t('remediation.withdrawalSimulated')}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={cn('space-y-4', className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('remediation.withdrawalOrder')}
          autoComplete="off"
          error={errors.orderNumber?.message}
          {...register('orderNumber')}
        />
        <Input
          label={t('remediation.withdrawalEmail')}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('remediation.withdrawalName')}
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label={t('remediation.withdrawalCountry')}
          maxLength={2}
          error={errors.countryCode?.message}
          {...register('countryCode')}
        />
        <Input
          label={t('remediation.withdrawalOrderedOn')}
          type="date"
          error={errors.orderedOn?.message}
          {...register('orderedOn')}
        />
      </div>

      <Input
        label={t('remediation.withdrawalItem')}
        error={errors.itemDescription?.message}
        {...register('itemDescription')}
      />
      <Textarea
        label={t('remediation.withdrawalReason')}
        rows={3}
        error={errors.reason?.message}
        {...register('reason')}
      />
      <Checkbox
        label={t('remediation.withdrawalDeclaration')}
        error={errors.declaration?.message}
        {...register('declaration')}
      />

      {serverError ? (
        <p role="alert" className="text-[13px] font-medium text-terra-700">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
        <FileText className="h-4 w-4" aria-hidden="true" />
        {t('remediation.withdrawalSubmit')}
      </Button>
    </form>
  );
}
