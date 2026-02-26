import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useOnboardingStore } from '@client/store/onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => {
    act(() => {
      useOnboardingStore.getState().reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useOnboardingStore.getState();

      expect(state.projectId).toBeNull();
      expect(state.campaignId).toBeNull();
      expect(state.keywordCount).toBe(0);
      expect(state.hasGscConnection).toBe(false);
      expect(state.hasIntegration).toBe(false);
    });
  });

  describe('setProjectId', () => {
    it('should set project ID', () => {
      act(() => {
        useOnboardingStore.getState().setProjectId('project-123');
      });

      expect(useOnboardingStore.getState().projectId).toBe('project-123');
    });

    it('should allow clearing project ID', () => {
      act(() => {
        useOnboardingStore.getState().setProjectId('project-123');
      });
      act(() => {
        useOnboardingStore.getState().setProjectId(null);
      });

      expect(useOnboardingStore.getState().projectId).toBeNull();
    });
  });

  describe('setCampaignId', () => {
    it('should set campaign ID', () => {
      act(() => {
        useOnboardingStore.getState().setCampaignId('campaign-456');
      });

      expect(useOnboardingStore.getState().campaignId).toBe('campaign-456');
    });

    it('should allow clearing campaign ID', () => {
      act(() => {
        useOnboardingStore.getState().setCampaignId('campaign-456');
      });
      act(() => {
        useOnboardingStore.getState().setCampaignId(null);
      });

      expect(useOnboardingStore.getState().campaignId).toBeNull();
    });
  });

  describe('setKeywordCount', () => {
    it('should set keyword count', () => {
      act(() => {
        useOnboardingStore.getState().setKeywordCount(50);
      });

      expect(useOnboardingStore.getState().keywordCount).toBe(50);
    });

    it('should not allow negative keyword counts', () => {
      act(() => {
        useOnboardingStore.getState().setKeywordCount(-5);
      });

      expect(useOnboardingStore.getState().keywordCount).toBe(0);
    });
  });

  describe('setHasGscConnection', () => {
    it('should set GSC connection status to true', () => {
      act(() => {
        useOnboardingStore.getState().setHasGscConnection(true);
      });

      expect(useOnboardingStore.getState().hasGscConnection).toBe(true);
    });

    it('should set GSC connection status to false', () => {
      act(() => {
        useOnboardingStore.getState().setHasGscConnection(true);
      });
      act(() => {
        useOnboardingStore.getState().setHasGscConnection(false);
      });

      expect(useOnboardingStore.getState().hasGscConnection).toBe(false);
    });
  });

  describe('setHasIntegration', () => {
    it('should set integration status to true', () => {
      act(() => {
        useOnboardingStore.getState().setHasIntegration(true);
      });

      expect(useOnboardingStore.getState().hasIntegration).toBe(true);
    });

    it('should set integration status to false', () => {
      act(() => {
        useOnboardingStore.getState().setHasIntegration(true);
      });
      act(() => {
        useOnboardingStore.getState().setHasIntegration(false);
      });

      expect(useOnboardingStore.getState().hasIntegration).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      act(() => {
        const store = useOnboardingStore.getState();
        store.setProjectId('project-123');
        store.setCampaignId('campaign-456');
        store.setKeywordCount(50);
        store.setHasGscConnection(true);
        store.setHasIntegration(true);
      });

      act(() => {
        useOnboardingStore.getState().reset();
      });

      const state = useOnboardingStore.getState();
      expect(state.projectId).toBeNull();
      expect(state.campaignId).toBeNull();
      expect(state.keywordCount).toBe(0);
      expect(state.hasGscConnection).toBe(false);
      expect(state.hasIntegration).toBe(false);
    });
  });
});
