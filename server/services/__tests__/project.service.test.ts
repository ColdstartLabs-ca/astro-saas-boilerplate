/**
 * Project Service Unit Tests
 * Tests for project CRUD operations with validation and authorization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectService } from '../project.service';
import type {
  IProject,
  ICreateProjectInput,
  IUpdateProjectInput,
} from '@shared/types/project.types';

// Mock Supabase admin client
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

const mockSupabaseAdmin = supabaseAdmin as unknown as {
  from: vi.Mock;
};

describe('ProjectService', () => {
  let projectService: ProjectService;
  const mockUserId = 'user-123';
  const mockProjectId = 'project-abc';

  const mockProject: IProject = {
    id: mockProjectId,
    user_id: mockUserId,
    name: 'Test Project',
    domain: 'https://example.com',
    industry: 'tech',
    cms_type: 'wordpress',
    content_preferences: {
      tone: 'professional',
      frequency: 'weekly',
      targetWordCount: 1000,
    },
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    projectService = new ProjectService();
    vi.clearAllMocks();
  });

  describe('listByUser', () => {
    it('should return only user projects', async () => {
      const mockData = [mockProject];
      const mockResponse = { data: mockData, error: null };

      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => mockResponse),
          })),
        })),
      });

      const result = await projectService.listByUser(mockUserId);

      expect(result).toEqual(mockData);
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    });
  });

  describe('create', () => {
    it('should create project on happy path', async () => {
      const input: ICreateProjectInput = {
        name: 'New Project',
        domain: 'https://example.com',
        industry: 'tech',
        cms_type: 'wordpress',
        content_preferences: {
          tone: 'professional',
          frequency: 'weekly',
          targetWordCount: 1000,
        },
      };

      // Mock insert
      const mockSingle = vi.fn(() => ({
        data: { ...mockProject, name: input.name },
        error: null,
      }));
      const mockSelect = vi.fn(() => ({ single: mockSingle }));
      const mockInsert = vi.fn(() => ({ select: mockSelect }));
      mockSupabaseAdmin.from.mockReturnValueOnce({ insert: mockInsert });

      const result = await projectService.create(mockUserId, input);

      expect(result).toEqual({ ...mockProject, name: input.name });
    });

    it('should throw validation error for missing name', async () => {
      const input = {
        name: '',
        domain: 'https://example.com',
      } as unknown as ICreateProjectInput;

      await expect(projectService.create(mockUserId, input)).rejects.toThrow();
    });

    it('should throw validation error for invalid URL', async () => {
      const input = {
        name: 'Test Project',
        domain: 'not-a-valid-url',
      } as unknown as ICreateProjectInput;

      await expect(projectService.create(mockUserId, input)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update project on happy path', async () => {
      const input: IUpdateProjectInput = {
        name: 'Updated Project Name',
      };

      const mockSingle = vi.fn(() => ({
        data: { ...mockProject, name: input.name },
        error: null,
      }));
      const mockSelect = vi.fn(() => ({ single: mockSingle }));
      const mockEq2 = vi.fn(() => ({ select: mockSelect }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockUpdate = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseAdmin.from.mockReturnValueOnce({ update: mockUpdate });

      const result = await projectService.update(mockProjectId, mockUserId, input);

      expect(result.name).toBe(input.name);
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw not found error for unowned project', async () => {
      const input: IUpdateProjectInput = {
        name: 'Updated Name',
      };

      const mockSingle = vi.fn(() => ({
        data: null,
        error: { code: 'PGRST116' },
      }));
      const mockSelect = vi.fn(() => ({ single: mockSingle }));
      const mockEq2 = vi.fn(() => ({ select: mockSelect }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockUpdate = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseAdmin.from.mockReturnValueOnce({ update: mockUpdate });

      await expect(projectService.update(mockProjectId, 'other-user-id', input)).rejects.toThrow(
        'Project not found'
      );
    });

    it('should throw not found error when project does not exist', async () => {
      const input: IUpdateProjectInput = {
        name: 'Updated Name',
      };

      const mockSingle = vi.fn(() => ({
        data: null,
        error: { code: 'PGRST116' },
      }));
      const mockSelect = vi.fn(() => ({ single: mockSingle }));
      const mockEq2 = vi.fn(() => ({ select: mockSelect }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockUpdate = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseAdmin.from.mockReturnValueOnce({ update: mockUpdate });

      await expect(projectService.update('non-existent-id', mockUserId, input)).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete project on happy path', async () => {
      const mockEq2 = vi.fn(() => ({ error: null }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockDelete = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseAdmin.from.mockReturnValueOnce({ delete: mockDelete });

      await expect(projectService.delete(mockProjectId, mockUserId)).resolves.not.toThrow();
    });

    it('should handle delete error gracefully', async () => {
      const mockEq2 = vi.fn(() => ({ error: { message: 'Database error' } }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockDelete = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseAdmin.from.mockReturnValueOnce({ delete: mockDelete });

      await expect(projectService.delete(mockProjectId, mockUserId)).rejects.toThrow(
        'Failed to delete project'
      );
    });

    it('should only delete user-owned projects via WHERE clause', async () => {
      const mockEq2 = vi.fn(() => ({ error: null }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockDelete = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseAdmin.from.mockReturnValueOnce({ delete: mockDelete });

      await projectService.delete(mockProjectId, mockUserId);

      // Verify both ID and user_id are used in WHERE clause
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq1).toHaveBeenCalledWith('id', mockProjectId);
      expect(mockEq2).toHaveBeenCalledWith('user_id', mockUserId);
    });
  });
});
