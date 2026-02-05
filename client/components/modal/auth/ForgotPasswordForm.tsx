import { InputField } from '@client/components/form/InputField';
import { useTranslations } from '@client/hooks/useTranslations';
import React from 'react';
import { useForm } from 'react-hook-form';

interface IForgotPasswordForm {
  email: string;
}

interface IProps {
  onSubmit: (data: IForgotPasswordForm) => void;
}

export const ForgotPasswordForm: React.FC<IProps> = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IForgotPasswordForm>();
  const t = useTranslations('auth.forgotPassword');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-5">
      <p className="text-center text-muted-foreground text-sm mb-1">{t('enterEmail')}</p>
      <InputField
        {...register('email', {
          required: t('emailRequired'),
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: t('invalidEmail'),
          },
        })}
        type="email"
        placeholder={t('emailAddress')}
        className="w-full"
        error={errors.email?.message}
      />
      <button
        type="submit"
        className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.98] mt-2 glow-blue"
      >
        {t('sendResetLink')}
      </button>
    </form>
  );
};
