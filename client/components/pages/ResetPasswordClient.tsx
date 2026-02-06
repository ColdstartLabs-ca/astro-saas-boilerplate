'use client';

import { Suspense } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@shared/utils/supabase/client';
import { ForgotPasswordSetNewPasswordForm } from '@client/components/modal/auth/ForgotPasswordSetNewPasswordForm';
import { Loader2 } from 'lucide-react';
import { getTranslations } from '@src/i18n/utils';

function ResetPasswordContent(): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const t = useMemo(() => getTranslations('auth.resetPassword'), []);

  useEffect(() => {
    const handleReset = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const supabase = createClient();

      // First check if we already have a session (auto-exchange might have happened)
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        setStatus('success');
        return;
      }

      if (!code) {
        setError(t('invalidCode'));
        setStatus('error');
        return;
      }

      // Attempt to exchange the code for a session
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (data.session) {
          setStatus('success');
          return;
        }

        if (error) {
          console.error('Code exchange failed:', error);

          // Double check if session was established despite error (race condition)
          const {
            data: { session: recheckSession },
          } = await supabase.auth.getSession();
          if (recheckSession) {
            setStatus('success');
            return;
          }

          setError(error.message);
          setStatus('error');
          return;
        }
      } catch (err) {
        console.error('Reset password error:', err);
        setError(t('unexpectedError'));
        setStatus('error');
      }
    };

    handleReset();
  }, [t]);

  const handlePasswordSet = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="max-w-md w-full bg-surface rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-muted-foreground">{t('verifying')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-error/10 text-error p-4 rounded-lg text-center">
            <p>{error || t('invalidOrExpired')}</p>
            <button
              onClick={() => (window.location.href = '/')}
              className="mt-4 text-sm font-semibold hover:underline"
            >
              {t('returnToHome')}
            </button>
          </div>
        )}

        {status === 'success' && <ForgotPasswordSetNewPasswordForm onClose={handlePasswordSet} />}
      </div>
    </div>
  );
}

function LoadingFallback(): JSX.Element {
  const t = useMemo(() => getTranslations('auth'), []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    </div>
  );
}

export function ResetPasswordClient(): JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

// Default export for Astro client:only directive
export default ResetPasswordClient;
