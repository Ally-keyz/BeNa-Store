import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export function ContactForm() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const schema = z.object({
    name: z.string().trim().min(1, t('contact.nameRequired')),
    email: z
      .string()
      .trim()
      .min(1, t('contact.emailRequired'))
      .email(t('contact.emailInvalid')),
    topic: z.enum(['order', 'product', 'wholesale', 'other']),
    message: z.string().trim().min(10, t('contact.messageRequired')),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', topic: 'order', message: '' },
  });

  const topicLabels: Record<Values['topic'], string> = {
    order: t('contact.topicOrder'),
    product: t('contact.topicProduct'),
    wholesale: t('contact.topicWholesale'),
    other: t('contact.topicOther'),
  };

  const onSubmit = (values: Values) => {
    const subject = `${t('contact.subjectPrefix')} — ${topicLabels[values.topic]}`;
    const body = [
      `${t('contact.nameLabel')}: ${values.name}`,
      `${t('contact.emailLabel')}: ${values.email}`,
      `${t('contact.topicLabel')}: ${topicLabels[values.topic]}`,
      '',
      values.message,
    ].join('\n');
    const href = `mailto:${BRAND.ordersEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
    window.location.href = href;
  };

  return (
    <div className="rounded-card border border-terra-100 bg-white p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{t('contact.formTitle')}</h2>
      <p className="mt-2 text-[13px] leading-6 text-neutral-600">{t('contact.mailtoNote')}</p>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label={t('contact.nameLabel')}
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label={t('contact.emailLabel')}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <Select
          label={t('contact.topicLabel')}
          error={errors.topic?.message}
          options={Object.entries(topicLabels).map(([value, label]) => ({ value, label }))}
          {...register('topic')}
        />

        <Textarea
          label={t('contact.messageLabel')}
          error={errors.message?.message}
          {...register('message')}
        />

        <Button type="submit">{t('contact.submit')}</Button>

        {submitted ? (
          <div role="status" className="rounded-card bg-terra-50 p-4 text-[13px] leading-6 text-terra-900">
            <p className="font-medium">{t('contact.preparedTitle')}</p>
            <p className="mt-1">{t('contact.preparedBody')}</p>
          </div>
        ) : null}
      </form>
    </div>
  );
}
