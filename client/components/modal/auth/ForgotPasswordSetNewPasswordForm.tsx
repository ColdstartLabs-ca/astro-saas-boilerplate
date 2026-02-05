import { InputField } from '@client/components/form/InputField';
import { useUserStore } from '@client/store/userStore';
import { useToastStore } from '@client/store/toastStore';
import { getTranslations } from '../../../../src/i18n/utils';
import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';

interface ISetNewPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

interface IProps {
  onClose: () => void;
}

export const ForgotPasswordSetNewPasswordForm: React.FC<IProps> = ({ onClose }) => {
  const t = useMemo(() => getTranslations('auth.setNewPassword'), []);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ISetNewPasswordForm>();
  const { updatePassword } = useUserStore();
  const { showToast } = useToastStore();

  const onSubmitHandler = async (data: ISetNewPasswordForm) => {
    try {
      if (data.newPassword !== data.confirmPassword) {
        showToast({ message: t('passwordsDoNotMatch'), type: 'error' });
        return;
      }
      await updatePassword(data.newPassword);
      showToast({ message: t('passwordUpdatedSuccess'), type: 'success' });
      onClose();
    } catch (error) {
      console.error('Error setting new password:', error);
      showToast({
        message: error instanceof Error ? error.message : t('failedToUpdate'),
        type: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="flex flex-col space-y-5">
      <p className="text-center text-muted-foreground text-sm mb-1">{t('enterNewPassword')}</p>
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
        {t('setNewPasswordButton')}
      </button>
    </form>
  );
};
