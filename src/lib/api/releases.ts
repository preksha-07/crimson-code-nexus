import type { ReleaseRisk } from '../../types/release';
import { apiClient } from './client';

export interface Release {
  id: string;
  projectId: string;
  version: string;
  name: string;
  status: string;
  targetDate?: string | null;
}

/**
 * Fetch releases visible to the current user.
 */
export const getReleases = (): Promise<Release[]> => {
  return apiClient.get<Release[]>('/releases');
};

/**
 * Fetch release risk for a specific release ID or version string.
 *
 * Risk calculation is owned by the backend/intelligence service.
 * If a version string (e.g. 'v2.4.0') is supplied, resolves the release ID first.
 */
export const getReleaseRisk = async (
  releaseIdOrVersion: string
): Promise<ReleaseRisk | null> => {
  let releaseId = releaseIdOrVersion;

  if (!releaseIdOrVersion.startsWith('rel_')) {
    try {
      const releases = await getReleases();
      const cleanVer = releaseIdOrVersion.replace(/^v/, '');
      const match = releases.find(
        (r) => r.version === cleanVer || r.version === releaseIdOrVersion || r.id === releaseIdOrVersion
      );
      if (match) {
        releaseId = match.id;
      }
    } catch {
      // Fall back to original parameter if release lookup fails
    }
  }

  return apiClient.get<ReleaseRisk | null>(
    `/releases/${encodeURIComponent(releaseId)}/risk`
  );
};

/**
 * Request the backend to recalculate release risk.
 */
export const recalculateReleaseRisk = async (
  releaseIdOrVersion: string
): Promise<ReleaseRisk | null> => {
  let releaseId = releaseIdOrVersion;

  if (!releaseIdOrVersion.startsWith('rel_')) {
    try {
      const releases = await getReleases();
      const cleanVer = releaseIdOrVersion.replace(/^v/, '');
      const match = releases.find(
        (r) => r.version === cleanVer || r.version === releaseIdOrVersion || r.id === releaseIdOrVersion
      );
      if (match) {
        releaseId = match.id;
      }
    } catch {
      // Fallback
    }
  }

  return apiClient.post<ReleaseRisk | null>(
    `/releases/${encodeURIComponent(releaseId)}/risk/recalculate`
  );
};
