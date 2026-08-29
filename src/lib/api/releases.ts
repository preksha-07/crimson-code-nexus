import type { ReleaseRisk } from '../../types/release';
import { apiClient } from './client';

/**
 * Fetch release risk for a specific release version.
 *
 * Risk calculation is owned by the backend/intelligence service.
 * The frontend only requests and displays the result.
 */
export const getReleaseRisk = (
  version: string
): Promise<ReleaseRisk | null> => {
  return apiClient.get<ReleaseRisk | null>(
    `/releases/${encodeURIComponent(version)}/risk`
  );
};

/**
 * Request the backend to recalculate release risk.
 *
 * The frontend does not perform any risk calculations.
 */
export const recalculateReleaseRisk = (
  version: string
): Promise<ReleaseRisk | null> => {
  return apiClient.post<ReleaseRisk | null>(
    `/releases/${encodeURIComponent(version)}/risk/recalculate`
  );
};
