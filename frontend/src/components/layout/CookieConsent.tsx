import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useConsent } from '@/context/ConsentContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog } from '@/components/ui/Dialog';

/**
 * GDPR consent gate. Essential cookies (cart id, language, consent record)
 * are always on; analytics and marketing stay off until explicitly accepted.
 * No non-essential script exists in the app yet — future integrations must
 * check `useConsent().analytics / .marketing` before loading.
 */
export function CookieConsent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    hasDecided,
    consent,
    analytics,
    marketing,
    saveConsent,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
  } = useConsent();

  const [draftAnalytics, setDraftAnalytics] = useState(analytics);
  const [draftMarketing, setDraftMarketing] = useState(marketing);

  useEffect(() => {
    if (!isPreferencesOpen) return;
    setDraftAnalytics(consent?.categories.analytics ?? false);
    setDraftMarketing(consent?.categories.marketing ?? false);
  }, [isPreferencesOpen, consent]);

  const save = () => {
    saveConsent({ analytics: draftAnalytics, marketing: draftMarketing });
    toast({ title: t('cookie.saved'), variant: 'success' });
  };

  const rejectAll = () => {
    saveConsent({ analytics: false, marketing: false });
    toast({ title: t('cookie.saved'), variant: 'success' });
  };

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
    toast({ title: t('cookie.saved'), variant: 'success' });
  };

  return (
    <>
      {!hasDecided && !isPreferencesOpen ? (
        <section
          aria-label={t('cookie.title')}
          className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-chocolate-100 bg-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chocolate-50 text-chocolate-800">
                <Cookie className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">{t('cookie.title')}</h2>
                <p className="mt-1 text-[13px] leading-5 text-neutral-600">
                  {t('cookie.body')}{' '}
                  <Link
                    to="/legal/privacy"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    {t('cookie.policyLink')}
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" size="sm" onClick={openPreferences}>
                {t('cookie.preferences')}
              </Button>
              <Button variant="secondary" size="sm" onClick={rejectAll}>
                {t('cookie.rejectAll')}
              </Button>
              <Button size="sm" onClick={acceptAll}>
                {t('cookie.acceptAll')}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <Dialog
        open={isPreferencesOpen}
        onClose={closePreferences}
        title={t('cookie.title')}
        description={t('cookie.body')}
        closeLabel={t('cookie.close')}
        footer={
          <>
            <Button variant="secondary" onClick={rejectAll}>
              {t('cookie.rejectAll')}
            </Button>
            <Button onClick={save}>{t('cookie.savePreferences')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-chocolate-100 bg-chocolate-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">{t('cookie.essentialTitle')}</p>
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-600">
                {t('cookie.alwaysOn')}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-5 text-neutral-600">{t('cookie.essentialBody')}</p>
          </div>

          <Checkbox
            checked={draftAnalytics}
            onChange={(event) => setDraftAnalytics(event.target.checked)}
            label={t('cookie.analyticsTitle')}
            description={t('cookie.analyticsBody')}
          />
          <Checkbox
            checked={draftMarketing}
            onChange={(event) => setDraftMarketing(event.target.checked)}
            label={t('cookie.marketingTitle')}
            description={t('cookie.marketingBody')}
          />
        </div>
      </Dialog>
    </>
  );
}

export interface CookieSettingsButtonProps {
  className?: string;
}

/** Reopen consent choices from anywhere (e.g. footer/legal pages). */
export function CookieSettingsButton({ className }: CookieSettingsButtonProps) {
  const { t } = useTranslation();
  const { openPreferences } = useConsent();
  return (
    <button
      type="button"
      onClick={openPreferences}
      className={cn('rounded-sm underline underline-offset-2 hover:text-ink', className)}
    >
      {t('footer.cookieSettings')}
    </button>
  );
}
