export type RiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface ReleaseFactor {
  id: string;
  label: string;
  riskWeight: number;
  description: string;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

export interface ReleaseRisk {
  version: string;
  riskLevel: RiskLevel;
  score: number;
  description: string;
  factorContributions: ReleaseFactor[];
  blockedDependenciesCount: number;
  unverifiedFixesCount: number;
  securityIssuesCount: number;
  criticalIssuesCount: number;
  regressionSignalsCount: number;
}
