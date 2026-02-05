'use client';

import { useToastStore } from '@client/store/toastStore';
import { useUserStore } from '@client/store/userStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactFormSchema, IContactFormInput } from '@shared/validation/support.schema';
import { CheckCircle, Send } from 'lucide-react';
import { useTranslations } from '@client/hooks/useTranslations';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../Modal';

interface ISupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: ISupportModalProps): React.JSX.Element {
  const t = useTranslations('dashboard.support');
  const { showToast } = useToastStore();
  const { user } = useUserStore();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<IContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      category: 'technical',
      subject: '',
      message: '',
    },
  });

  // Update form values if user data becomes available after mount
  useEffect(() => {
    if (user && isOpen) {
      if (user.name) setValue('name', user.name);
      if (user.email) setValue('email', user.email);
    }
  }, [user, isOpen, setValue]);

  const onSubmit = async (data: IContactFormInput) => {
    try {
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        reset();

        // Auto-close on success after 3 seconds
        setTimeout(() => {
          handleClose();
        }, 3000);

        showToast({
          message: result.message || t('messageSent'),
          type: 'success',
        });
      } else {
        showToast({
          message: result.message || 'Failed to submit support request.',
          type: 'error',
        });
      }
    } catch {
      showToast({
        message: 'Failed to submit support request. Please try again.',
        type: 'error',
      });
    }
  };

  const handleClose = () => {
    setSuccess(false);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('contactSupport')}
      showCloseButton={!success}
    >
      {success ? (
        <div className="text-center py-8">
          <CheckCircle size={64} className="text-success mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('messageSent')}</h3>
          <p className="text-muted-foreground">{t('responseTime')}</p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-6">{t('contactSupportDescription')}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                {t('name')} *
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                placeholder={t('namePlaceholder')}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                {t('email')} *
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                placeholder={t('emailPlaceholder')}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-foreground mb-1">
                {t('category')} *
              </label>
              <select
                {...register('category')}
                id="category"
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground"
              >
                <option value="technical">{t('categoryTechnical')}</option>
                <option value="billing">{t('categoryBilling')}</option>
                <option value="feature-request">{t('categoryFeature')}</option>
                <option value="other">{t('categoryOther')}</option>
              </select>
              {errors.category && (
                <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-1">
                {t('subject')} *
              </label>
              <input
                {...register('subject')}
                type="text"
                id="subject"
                placeholder={t('subjectPlaceholder')}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />
              {errors.subject && (
                <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">
                {t('message')} *
              </label>
              <textarea
                {...register('message')}
                id="message"
                rows={4}
                placeholder={t('messagePlaceholder')}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none text-foreground placeholder:text-muted-foreground"
              />
              {errors.message && (
                <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{t('sending')}</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{t('sendMessage')}</span>
                </>
              )}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
