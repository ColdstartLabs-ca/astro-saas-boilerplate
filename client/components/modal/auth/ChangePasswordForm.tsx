import { InputField } from '@client/components/form/InputField';
import { useToastStore } from '@client/store/toastStore';
import { useTranslations } from '@client/hooks/useTranslations';
import React from 'react';
import { useForm } from 'react-hook-form';

interface IChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordForm: React.FC<{ onSubmit: (data: IChangePasswordForm) => void }> = ({
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<IChangePasswordForm>();
  const { showToast } = useToastStore();
  const t = useTranslations('auth.changePassword');

  const onSubmitHandler = async (data: IChangePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      showToast({ message: t('passwordsDoNotMatch'), type: 'error' });
      return;
    }
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="flex flex-col space-y-5">
      <p className="text-center text-muted-foreground text-sm mb-1">{t('updatePassword')}</p>
      <InputField
        {...register('currentPassword', {
          required: t('currentPasswordRequired'),
        })}
        type="password"
        placeholder={t('currentPassword')}
        className="w-full"
        error={errors.currentPassword?.message}
      />
      <InputField
        {...register('newPassword', {
          required: t('newPasswordRequired'),
          minLength: {
            value: 6,
            message: t('passwordMinLength'),
          },
        })}
        type="password"
        placeholder={t('newPassword')}
        className="w-full"
        error={errors.newPassword?.message}
      />
      <InputField
        {...register('confirmPassword', {
          required: t('confirmPasswordRequired'),
          validate: value => value === watch('newPassword') || t('passwordsDoNotMatch'),
        })}
        type="password"
        placeholder={t('confirmNewPassword')}
        className="w-full"
        error={errors.confirmPassword?.message}
      />
      <button
        type="submit"
        className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.98] mt-2 glow-blue"
      >
        {t('changePasswordButton')}
      </button>
    </form>
  );
};
