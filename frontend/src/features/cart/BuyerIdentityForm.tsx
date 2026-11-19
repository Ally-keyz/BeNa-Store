import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { Cart } from '@/types';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export interface BuyerIdentityFormProps {
  cart: Cart;
}

/** Sends checkout contact/destination to the backend cart. Never handles payment. */
export function BuyerIdentityForm({ cart }: BuyerIdentityFormProps) {
  const { t } = useTranslation();
  const { countries, country } = useMarket();
  const { setBuyerIdentity, isUpdating } = useCart();
  const { toast } = useToast();

  const schema = z.object({
    email: z.string().trim().refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: t('contact.emailInvalid'),
    }),
    countryCode: z.string().min(2),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: cart.buyerIdentity.email ?? '',
      countryCode: cart.buyerIdentity.countryCode ?? country,
    },
  });

  useEffect(() => {
    reset({
      email: cart.buyerIdentity.email ?? '',
      countryCode: cart.buyerIdentity.countryCode ?? country,
    });
  }, [cart.buyerIdentity.countryCode, cart.buyerIdentity.email, cart.id, country, reset]);

  const onSubmit = async (values: Values) => {
    try {
      await setBuyerIdentity({
        email: values.email || undefined,
        countryCode: values.countryCode,
      });
      toast({ title: t('cart.detailsSaved'), variant: 'success' });
    } catch {
      toast({ title: t('cart.detailsError'), variant: 'error' });
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
      <Input
        label={t('cart.emailLabel')}
        type="email"
        autoComplete="email"
        placeholder={t('cart.emailPlaceholder')}
        error={errors.email?.message}
        {...register('email')}
      />
      <Select
        label={t('cart.countryLabel')}
        error={errors.countryCode?.message}
        options={
          countries.length
            ? countries.map((item) => ({ value: item.isoCode, label: item.name }))
            : [{ value: country, label: country }]
        }
        {...register('countryCode')}
      />
      <Button type="submit" variant="secondary" size="sm" loading={isUpdating}>
        {t('cart.saveDetails')}
      </Button>
    </form>
  );
}
