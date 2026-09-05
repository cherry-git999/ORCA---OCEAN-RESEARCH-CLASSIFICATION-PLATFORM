import { ReviewStatus, TargetClass } from './detection';

export interface FilterParams {
  minConfidence: number; // 0.25 to 1.0 (default 0.50)
  minBoxWidth: number;   // pixels
  maxBoxWidth: number;   // pixels
  minBoxHeight: number;  // pixels
  maxBoxHeight: number;  // pixels
  targetClass: 'All' | TargetClass;
  reviewStatus: 'All' | ReviewStatus;
  confidenceCategory: 'All' | 'HIGH' | 'MEDIUM' | 'LOW';
  searchQuery: string;
  isRawView: boolean; // false = filtered candidates, true = all raw candidates
}
