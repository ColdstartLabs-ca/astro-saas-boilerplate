'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { createClient } from '@shared/utils/supabase/client';
import { useModalStore } from '@client/store/modalStore';
import { Loader2 } from 'lucide-react';
import { getTranslations } from '@src/i18n/utils';

function ResetPasswordContent(): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const { openAuthModal } = useModalStore();
  const t = useMemo(() => getTranslations('auth.resetPassword'), []);

  useEffect(() => {
    const handleReset = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const supabase = createClient();

      // Helper: check session and open modal if valid
      const tryOpenModal = async (): Promise<boolean> => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setStatus('ready');
          openAuthModal('setNewPassword');
          return true;
        }
        return false;
      };

      // Already authenticated (e.g. Supabase auto-exchanged the code)
      if (await tryOpenModal()) return;

      if (!code) {
        setError(t('invalidCode'));
        setStatus('error');
        return;
      }

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Code exchange failed:', exchangeError);
          // Code may have been auto-consumed — do a final session check
          if (await tryOpenModal()) return;
          setError(exchangeError.message);
          setStatus('error');
          return;
        }

        // Exchange succeeded — session should exist now
        if (!(await tryOpenModal())) {
          setError(t('invalidOrExpired'));
          setStatus('error');
        }
      } catch (err) {
        console.error('Reset password error:', err);
        setError(t('unexpectedError'));
        setStatus('error');
      }
    };

    handleReset();
  }, [t, openAuthModal]);

  if (status === 'error') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-error/10 text-error p-6 rounded-xl">
            <p className="font-medium">{error || t('invalidOrExpired')}</p>
            <button
              onClick={() => (window.location.href = '/')}
              className="mt-4 text-sm font-semibold hover:underline"
            >
              {t('returnToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-7 h-7 text-accent animate-spin" />
        <p className="text-sm">{t('verifying')}</p>
      </div>
    </div>
  );
}

export function ResetPasswordClient(): JSX.Element {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

export default ResetPasswordClient;
