'use client';

import { useToastStore } from '@client/store/toastStore';
import { useUserStore } from '@client/store/userStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactFormSchema, type IContactFormInput } from '@shared/validation/support.schema';
import { CheckCircle, Send, HeadphonesIcon, Sparkles } from 'lucide-react';
import { useTranslations } from '@client/hooks/useTranslations';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../Modal';

interface ISupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons: Record<string, string> = {
  technical: '🔧',
  billing: '💳',
  'feature-request': '💡',
  other: '💬',
};

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
    watch,
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

  const selectedCategory = watch('category');

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
      title={success ? '' : t('contactSupport')}
      showCloseButton={!success}
      size="lg"
    >
      {success ? (
        <div className="text-center py-12 px-4">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
            <div className="relative bg-success/10 rounded-full p-6">
              <CheckCircle size={64} className="text-success" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">{t('messageSent')}</h3>
          <p className="text-muted-foreground text-lg">{t('responseTime')}</p>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles size={16} className="text-accent" />
            <span>Thank you for reaching out!</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Visual Header */}
          <div className="relative -mx-6 -mt-4 mb-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-secondary/10 to-accent/10" />
            <div className="relative px-6 py-4 flex items-center gap-4">
              <div className="bg-accent/20 rounded-xl p-3">
                <HeadphonesIcon size={24} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('contactSupportSubtitle')}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t('responseTime')}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Name & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  {t('name')} <span className="text-destructive">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  placeholder={t('namePlaceholder')}
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1">
                    <span>•</span> {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  {t('email')} <span className="text-destructive">*</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  placeholder={t('emailPlaceholder')}
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1">
                    <span>•</span> {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                {t('category')} <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  {...register('category')}
                  id="category"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent text-foreground appearance-none cursor-pointer transition-all duration-200"
                >
                  <option value="technical">{t('categoryTechnical')}</option>
                  <option value="billing">{t('categoryBilling')}</option>
                  <option value="feature-request">{t('categoryFeature')}</option>
                  <option value="other">{t('categoryOther')}</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lg">
                  {categoryIcons[selectedCategory] || '💬'}
                </div>
              </div>
              {errors.category && (
                <p className="text-sm text-destructive mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.category.message}
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                {t('subject')} <span className="text-destructive">*</span>
              </label>
              <input
                {...register('subject')}
                type="text"
                id="subject"
                placeholder={t('subjectPlaceholder')}
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
              />
              {errors.subject && (
                <p className="text-sm text-destructive mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.subject.message}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                {t('message')} <span className="text-destructive">*</span>
              </label>
              <textarea
                {...register('message')}
                id="message"
                rows={5}
                placeholder={t('messagePlaceholder')}
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent resize-none text-foreground placeholder:text-muted-foreground/60 transition-all duration-200"
              />
              {errors.message && (
                <p className="text-sm text-destructive mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.message.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shine-effect shadow-lg shadow-accent/20 hover:shadow-accent/40"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
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
                  <Send size={18} />
                  <span>{t('sendMessage')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
}
