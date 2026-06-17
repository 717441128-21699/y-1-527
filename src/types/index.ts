export enum SimulationStatus {
  PENDING_VALIDATION = 'pending_validation',
  GRID_GENERATION = 'grid_generation',
  COLLAPSE_PHASE = 'collapse_phase',
  SHOCK_BOUNCE = 'shock_bounce',
  NUCLEOSYNTHESIS = 'nucleosynthesis',
  COMPLETED = 'completed',
  ABNORMAL_FALLBACK = 'abnormal_fallback',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export enum ApprovalStatus {
  NOT_SUBMITTED = 'not_submitted',
  POSTDOC_PENDING = 'postdoc_pending',
  POSTDOC_APPROVED = 'postdoc_approved',
  POSTDOC_REJECTED = 'postdoc_rejected',
  PROFESSOR_PENDING = 'professor_pending',
  PROFESSOR_APPROVED = 'professor_approved',
  PROFESSOR_REJECTED = 'professor_rejected'
}

export type WarningType = 'shock_stagnation' | 'neutrino_anomaly' | 'ni56_deviation' | 'convergence_issue';
export type WarningSeverity = 'critical' | 'warning' | 'info';
export type WarningStatus = 'pending' | 'reviewed' | 'resolved';

export interface ProgenitorParams {
  mass: number;
  metallicity: number;
  rotationVelocity: number;
  equationOfState: string;
  reactionNetwork: string;
}

export interface StageTimelineItem {
  id: string;
  stage: SimulationStatus;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface WarningData {
  shockRadius?: number;
  criticalThreshold?: number;
  stagnationTime?: number;
  neutrinoEnergy?: number;
  expectedRange?: [number, number];
  ni56Yield?: number;
  deviation?: number;
  convergenceRate?: number;
}

export interface Warning {
  id: string;
  taskId: string;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  timestamp: Date;
  data: WarningData;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  resolution: string | null;
  status: WarningStatus;
}

export interface MonitoringDataPoint {
  timestamp: number;
  shockRadius: number;
  shockVelocity: number;
  nu_e_luminosity: number;
  nu_ebar_luminosity: number;
  nu_x_luminosity: number;
  ni56_mass: number;
  ge68_mass: number;
  totalEnergy: number;
  entropy: number;
}

export interface NuclideAbundance {
  id: string;
  taskId: string;
  nuclide: string;
  massNumber: number;
  atomicNumber: number;
  massFraction: number;
  numberFraction: number;
  productionRate: number;
  timestamp: number;
}

export interface AdjustmentLog {
  id: string;
  taskId: string;
  warningId: string | null;
  type: 'equation_of_state' | 'reaction_rate' | 'grid_resolution' | 'other';
  parameter: string;
  oldValue: string;
  newValue: string;
  reason: string;
  adjustedBy: string;
  adjustedAt: Date;
  restartCount: number;
}

export interface ShockVerification {
  shockVelocityValid: boolean;
  radiusEvolutionValid: boolean;
  energyConservationValid: boolean;
  comments: string;
}

export interface NucleosynthesisAssessment {
  ni56YieldValid: boolean;
  abundanceDistributionValid: boolean;
  observationMatch: number;
  comments: string;
}

export interface ApprovalRecord {
  id: string;
  taskId: string;
  level: 'postdoc' | 'professor';
  approver: string;
  status: 'approved' | 'rejected';
  comments: string;
  approvedAt: Date;
  shockDynamicsVerification: ShockVerification;
  nucleosynthesisAssessment?: NucleosynthesisAssessment;
}

export interface SimulationTask {
  id: string;
  name: string;
  parameters: ProgenitorParams;
  status: SimulationStatus;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdBy: string;
  assignedTo: string[];
  currentStage: string;
  stageTimeline: StageTimelineItem[];
  warnings: Warning[];
  adjustments: AdjustmentLog[];
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalRecord[];
  ni56Yield?: number;
  ge68Yield?: number;
}

export interface ReportSection {
  type: 'shock_animation' | 'abundance_distribution' | 'light_curve' | 'neutrino_spectrum' | 'summary';
  title: string;
  data: any;
}

export interface SimulationReport {
  id: string;
  taskId: string;
  generatedAt: Date;
  generatedBy: string;
  sections: ReportSection[];
  status: 'generating' | 'completed' | 'failed';
  downloadUrl: string;
}

export interface ExportTask {
  id: string;
  taskId: string;
  exportType: 'hydrodynamics' | 'nucleosynthesis' | 'all';
  progenitorType: string;
  reactionNetworkVersion: string;
  timeWindow: { start: number; end: number };
  format: 'csv' | 'fits' | 'hdf5';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  downloadUrl: string;
}

export interface Recommendation {
  id: string;
  progenitorType: string;
  targetObservations: string[];
  recommendedEquationOfState: string;
  recommendedReactionRates: string;
  matchScore: number;
  confidence: number;
  supportingSimulations: string[];
  generatedAt: Date;
}

export interface DailyStatistics {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  shockRecoverySuccessRate: number;
  networkConvergenceCount: number;
  avgSimulationTime: number;
  warningsCount: number;
  criticalWarningsCount: number;
}

export interface PerformanceMetrics {
  accuracy: number;
  speed: number;
  stability: number;
  convergence: number;
  resourceUtilization: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'postdoc' | 'professor' | 'physicist' | 'admin';
  institution: string;
  avatar: string;
}

export interface ConfigItem {
  id: string;
  name: string;
  version: string;
  description: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface WarningThresholds {
  shockStagnationTime: number;
  neutrinoEnergyMin: number;
  neutrinoEnergyMax: number;
  ni56DeviationThreshold: number;
  convergenceRateThreshold: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
