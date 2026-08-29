import type { Project } from '../../types/project';
import { apiClient } from './client';

/**
 * Fetch projects available to the authenticated user.
 *
 * Project data and authorization are managed by the backend.
 */
export const getProjects = (): Promise<Project[]> => {
  return apiClient.get<Project[]>('/projects');
};

/**
 * Fetch a single project by ID.
 *
 * The frontend does not assume any particular project ID.
 */
export const getProjectById = (
  id: string
): Promise<Project | null> => {
  return apiClient.get<Project | null>(
    `/projects/${encodeURIComponent(id)}`
  );
};
