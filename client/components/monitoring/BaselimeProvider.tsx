'use client';

import { BaselimeRum } from '@baselime/react-rum';
import { type ReactNode } from 'react';
import { clientEnv } from '@shared/config/env';

interface IBaselimeProviderProps {
  children: ReactNode;
}

export function BaselimeProvider({ children }: IBaselimeProviderProps): ReactNode {
  const apiKey = clientEnv.BASELIME_KEY;

  // Skip Baselime in development or if no API key
  if (!apiKey || clientEnv.ENV === 'development') {
    return <>{children}</>;
  }

  return (
    <BaselimeRum apiKey={apiKey} enableWebVitals service={clientEnv.WEB_SERVICE_NAME}>
      {children}
    </BaselimeRum>
  );
}
