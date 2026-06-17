import {
  SimulationStatus,
  MonitoringDataPoint,
  Warning,
  WarningType,
  WarningSeverity,
  WarningData,
  ProgenitorParams,
  WarningThresholds
} from '@/types';
import { useStore } from '@/store/useStore';

interface SimulationCallbacks {
  onProgress?: (taskId: string, progress: number, status: SimulationStatus) => void;
  onWarning?: (taskId: string, warning: Warning) => void;
  onComplete?: (taskId: string, finalData: MonitoringDataPoint) => void;
}

interface SimulationState {
  status: SimulationStatus;
  progress: number;
  elapsedTime: number;
  shockRadius: number;
  shockVelocity: number;
  ni56Mass: number;
  ge68Mass: number;
  neutrinoLuminosities: {
    nu_e: number;
    nu_ebar: number;
    nu_x: number;
  };
  totalEnergy: number;
  entropy: number;
  stagnationStartTime: number | null;
  anomalyCount: number;
}

const STAGE_ORDER: SimulationStatus[] = [
  SimulationStatus.PENDING_VALIDATION,
  SimulationStatus.GRID_GENERATION,
  SimulationStatus.COLLAPSE_PHASE,
  SimulationStatus.SHOCK_BOUNCE,
  SimulationStatus.NUCLEOSYNTHESIS,
  SimulationStatus.COMPLETED
];

const STAGE_DURATIONS: Record<SimulationStatus, number> = {
  [SimulationStatus.PENDING_VALIDATION]: 15,
  [SimulationStatus.GRID_GENERATION]: 25,
  [SimulationStatus.COLLAPSE_PHASE]: 30,
  [SimulationStatus.SHOCK_BOUNCE]: 20,
  [SimulationStatus.NUCLEOSYNTHESIS]: 10,
  [SimulationStatus.COMPLETED]: 0,
  [SimulationStatus.ABNORMAL_FALLBACK]: 0,
  [SimulationStatus.PAUSED]: 0,
  [SimulationStatus.CANCELLED]: 0
};

const STAGE_PROGRESS_RANGES: Record<SimulationStatus, [number, number]> = {
  [SimulationStatus.PENDING_VALIDATION]: [0, 15],
  [SimulationStatus.GRID_GENERATION]: [15, 40],
  [SimulationStatus.COLLAPSE_PHASE]: [40, 70],
  [SimulationStatus.SHOCK_BOUNCE]: [70, 90],
  [SimulationStatus.NUCLEOSYNTHESIS]: [90, 100],
  [SimulationStatus.COMPLETED]: [100, 100],
  [SimulationStatus.ABNORMAL_FALLBACK]: [0, 100],
  [SimulationStatus.PAUSED]: [0, 100],
  [SimulationStatus.CANCELLED]: [0, 100]
};

const generateId = () => Math.random().toString(36).substring(2, 11);

export class SimulationEngine {
  private taskId: string;
  private intervalId: number | null = null;
  private tickInterval: number = 100;
  private state: SimulationState;
  private callbacks: SimulationCallbacks;
  private isPaused: boolean = false;
  private progenitorParams: ProgenitorParams | null = null;
  private thresholds: WarningThresholds;
  private lastWarningTime: number = 0;
  private warningCooldown: number = 2000;

  constructor(taskId: string, callbacks: SimulationCallbacks = {}) {
    this.taskId = taskId;
    this.callbacks = callbacks;
    this.thresholds = useStore.getState().warningThresholds;
    this.state = this.initializeState();
  }

  private initializeState(): SimulationState {
    return {
      status: SimulationStatus.PENDING_VALIDATION,
      progress: 0,
      elapsedTime: 0,
      shockRadius: 10,
      shockVelocity: 0,
      ni56Mass: 0,
      ge68Mass: 0,
      neutrinoLuminosities: {
        nu_e: 2e52,
        nu_ebar: 1.5e52,
        nu_x: 3e52
      },
      totalEnergy: 1e51,
      entropy: 10,
      stagnationStartTime: null,
      anomalyCount: 0
    };
  }

  public startSimulation(taskId?: string): void {
    if (taskId) {
      this.taskId = taskId;
    }

    const task = useStore.getState().getTaskById(this.taskId);
    if (!task) {
      throw new Error(`Task ${this.taskId} not found`);
    }

    this.progenitorParams = task.parameters;
    this.state = this.initializeState();
    this.isPaused = false;

    useStore.getState().updateTask(this.taskId, {
      status: SimulationStatus.PENDING_VALIDATION,
      progress: 0,
      startedAt: new Date()
    });

    this.intervalId = window.setInterval(() => this.tick(), this.tickInterval);
  }

  private tick(): void {
    if (this.isPaused) return;

    this.state.elapsedTime += this.tickInterval / 1000;
    this.updateProgress();
    this.updateStatus();
    this.generateMonitoringData();
    this.checkAnomalies();
    this.updateStore();

    if (this.state.status === SimulationStatus.COMPLETED || 
        this.state.status === SimulationStatus.ABNORMAL_FALLBACK) {
      this.stopSimulation();
    }
  }

  private updateProgress(): void {
    const currentStageIndex = STAGE_ORDER.indexOf(this.state.status);
    if (currentStageIndex === -1 || currentStageIndex >= STAGE_ORDER.length - 1) return;

    const stageDuration = STAGE_DURATIONS[this.state.status];
    const [startProgress, endProgress] = STAGE_PROGRESS_RANGES[this.state.status];
    
    const stageStartTime = this.getStageStartTime();
    const timeInStage = this.state.elapsedTime - stageStartTime;
    const stageProgress = Math.min(timeInStage / stageDuration, 1);

    this.state.progress = startProgress + (endProgress - startProgress) * stageProgress;
  }

  private getStageStartTime(): number {
    let startTime = 0;
    for (const stage of STAGE_ORDER) {
      if (stage === this.state.status) break;
      startTime += STAGE_DURATIONS[stage];
    }
    return startTime;
  }

  private updateStatus(): void {
    const currentStageIndex = STAGE_ORDER.indexOf(this.state.status);
    if (currentStageIndex === -1 || currentStageIndex >= STAGE_ORDER.length - 1) return;

    const stageDuration = STAGE_DURATIONS[this.state.status];
    const stageStartTime = this.getStageStartTime();
    const timeInStage = this.state.elapsedTime - stageStartTime;

    if (timeInStage >= stageDuration) {
      const nextStatus = STAGE_ORDER[currentStageIndex + 1];
      this.state.status = nextStatus;
      
      useStore.getState().updateTaskStatus(this.taskId, nextStatus);

      if (this.callbacks.onProgress) {
        this.callbacks.onProgress(this.taskId, this.state.progress, nextStatus);
      }

      if (nextStatus === SimulationStatus.COMPLETED) {
        const finalData = this.getCurrentMonitoringData();
        useStore.getState().updateTask(this.taskId, {
          completedAt: new Date(),
          ni56Yield: this.state.ni56Mass,
          ge68Yield: this.state.ge68Mass
        });

        if (this.callbacks.onComplete) {
          this.callbacks.onComplete(this.taskId, finalData);
        }
      }
    }
  }

  public generateMonitoringData(): MonitoringDataPoint {
    const t = this.state.progress / 100;
    const progenitorMass = this.progenitorParams?.mass || 15;
    const massScaling = progenitorMass / 15;

    const shockGrowth = Math.pow(Math.max(0, t - 0.1), 0.4) * 200 * massScaling;
    const randomNoise = (Math.random() - 0.5) * 10;
    this.state.shockRadius = Math.max(10, 10 + shockGrowth + randomNoise);

    if (t > 0.3 && Math.random() > 0.7) {
      this.state.shockRadius += Math.random() * 5;
    }

    const velocityDecay = Math.exp(-Math.max(0, t - 0.2) * 1.5);
    const baseVelocity = 3.5e9 * velocityDecay + 1e8;
    this.state.shockVelocity = baseVelocity * (0.9 + Math.random() * 0.2);

    const nuDecay = Math.exp(-t * 2);
    this.state.neutrinoLuminosities.nu_e = Math.max(1e50, 2e52 * nuDecay + (Math.random() - 0.5) * 1e51);
    this.state.neutrinoLuminosities.nu_ebar = Math.max(1e50, 1.5e52 * Math.exp(-t * 1.8) + (Math.random() - 0.5) * 8e50);
    this.state.neutrinoLuminosities.nu_x = Math.max(1e50, 3e52 * Math.exp(-t * 1.5) + (Math.random() - 0.5) * 1.2e51);

    if (t > 0.5) {
      const ni56ProductionRate = Math.exp(-Math.pow((t - 0.7) * 5, 2)) * 0.001 * massScaling;
      this.state.ni56Mass += Math.max(0, ni56ProductionRate * (0.8 + Math.random() * 0.4) * this.tickInterval / 1000);
      
      const ge68ProductionRate = Math.exp(-Math.pow((t - 0.6) * 6, 2)) * 0.00003 * massScaling;
      this.state.ge68Mass += Math.max(0, ge68ProductionRate * (0.8 + Math.random() * 0.4) * this.tickInterval / 1000);
    }

    this.state.totalEnergy = 1e51 * (1 + t * 0.5) * (0.98 + Math.random() * 0.04);
    this.state.entropy = 10 + t * 20 + (Math.random() - 0.5) * 2;

    return this.getCurrentMonitoringData();
  }

  private getCurrentMonitoringData(): MonitoringDataPoint {
    return {
      timestamp: this.state.elapsedTime,
      shockRadius: this.state.shockRadius,
      shockVelocity: this.state.shockVelocity,
      nu_e_luminosity: this.state.neutrinoLuminosities.nu_e,
      nu_ebar_luminosity: this.state.neutrinoLuminosities.nu_ebar,
      nu_x_luminosity: this.state.neutrinoLuminosities.nu_x,
      ni56_mass: this.state.ni56Mass,
      ge68_mass: this.state.ge68Mass,
      totalEnergy: this.state.totalEnergy,
      entropy: this.state.entropy
    };
  }

  public checkAnomalies(): Warning[] {
    const warnings: Warning[] = [];
    const now = Date.now();

    if (now - this.lastWarningTime < this.warningCooldown) {
      return warnings;
    }

    const shockStagnation = this.checkShockStagnation();
    if (shockStagnation) {
      warnings.push(shockStagnation);
    }

    const neutrinoAnomaly = this.checkNeutrinoAnomaly();
    if (neutrinoAnomaly) {
      warnings.push(neutrinoAnomaly);
    }

    const ni56Deviation = this.checkNi56Deviation();
    if (ni56Deviation) {
      warnings.push(ni56Deviation);
    }

    const convergenceIssue = this.checkConvergence();
    if (convergenceIssue) {
      warnings.push(convergenceIssue);
    }

    if (warnings.length > 0) {
      this.lastWarningTime = now;
      this.state.anomalyCount += warnings.length;

      warnings.forEach(warning => {
        useStore.getState().addWarning(warning);
        
        if (this.callbacks.onWarning) {
          this.callbacks.onWarning(this.taskId, warning);
        }
      });

      if (this.state.anomalyCount >= 5) {
        this.triggerAbnormalFallback();
      }
    }

    return warnings;
  }

  private checkShockStagnation(): Warning | null {
    const t = this.state.progress / 100;
    if (t < 0.3 || t > 0.8) return null;

    if (this.state.shockVelocity < 5e8) {
      if (this.state.stagnationStartTime === null) {
        this.state.stagnationStartTime = this.state.elapsedTime;
        return null;
      }

      const stagnationTime = this.state.elapsedTime - this.state.stagnationStartTime;
      if (stagnationTime > this.thresholds.shockStagnationTime / 100) {
        const warningData: WarningData = {
          shockRadius: this.state.shockRadius,
          criticalThreshold: 200,
          stagnationTime: stagnationTime * 1000
        };

        return this.createWarning(
          'shock_stagnation',
          stagnationTime > this.thresholds.shockStagnationTime / 50 ? 'critical' : 'warning',
          `激波停滞时间 ${(stagnationTime * 1000).toFixed(0)}ms，${stagnationTime > this.thresholds.shockStagnationTime / 50 ? '已超过' : '接近'}临界阈值`,
          warningData
        );
      }
    } else {
      this.state.stagnationStartTime = null;
    }

    return null;
  }

  private checkNeutrinoAnomaly(): Warning | null {
    const t = this.state.progress / 100;
    if (t < 0.2 || t > 0.9) return null;

    const totalNeutrinoEnergy = 
      this.state.neutrinoLuminosities.nu_e +
      this.state.neutrinoLuminosities.nu_ebar +
      this.state.neutrinoLuminosities.nu_x;

    if (totalNeutrinoEnergy < this.thresholds.neutrinoEnergyMin ||
        totalNeutrinoEnergy > this.thresholds.neutrinoEnergyMax) {
      const warningData: WarningData = {
        neutrinoEnergy: totalNeutrinoEnergy,
        expectedRange: [this.thresholds.neutrinoEnergyMin, this.thresholds.neutrinoEnergyMax]
      };

      const isCritical = totalNeutrinoEnergy < this.thresholds.neutrinoEnergyMin * 0.5 ||
                         totalNeutrinoEnergy > this.thresholds.neutrinoEnergyMax * 2;

      return this.createWarning(
        'neutrino_anomaly',
        isCritical ? 'critical' : 'warning',
        `中微子总能量 ${totalNeutrinoEnergy.toExponential(2)} erg/s 超出预期范围`,
        warningData
      );
    }

    return null;
  }

  private checkNi56Deviation(): Warning | null {
    const t = this.state.progress / 100;
    if (t < 0.7 || this.state.ni56Mass < 0.01) return null;

    const progenitorMass = this.progenitorParams?.mass || 15;
    const expectedNi56 = 0.07 * (progenitorMass / 20);
    const deviation = Math.abs(this.state.ni56Mass - expectedNi56) / expectedNi56 * 100;

    if (deviation > this.thresholds.ni56DeviationThreshold) {
      const warningData: WarningData = {
        ni56Yield: this.state.ni56Mass,
        deviation
      };

      return this.createWarning(
        'ni56_deviation',
        deviation > this.thresholds.ni56DeviationThreshold * 1.5 ? 'critical' : 'warning',
        `镍-56产额 ${this.state.ni56Mass.toFixed(4)} M☉ 与预期值偏差 ${deviation.toFixed(1)}%`,
        warningData
      );
    }

    return null;
  }

  private checkConvergence(): Warning | null {
    const t = this.state.progress / 100;
    if (t < 0.8) return null;

    const randomFactor = Math.random();
    if (randomFactor > this.thresholds.convergenceRateThreshold) {
      const warningData: WarningData = {
        convergenceRate: randomFactor
      };

      return this.createWarning(
        'convergence_issue',
        randomFactor < 0.85 ? 'critical' : 'warning',
        `核合成网络收敛率 ${randomFactor.toFixed(2)} 低于阈值`,
        warningData
      );
    }

    return null;
  }

  private createWarning(
    type: WarningType,
    severity: WarningSeverity,
    message: string,
    data: WarningData
  ): Warning {
    return {
      id: `warn-${generateId()}`,
      taskId: this.taskId,
      type,
      severity,
      message,
      timestamp: new Date(),
      data,
      reviewedBy: null,
      reviewedAt: null,
      resolution: null,
      status: 'pending'
    };
  }

  private triggerAbnormalFallback(): void {
    this.state.status = SimulationStatus.ABNORMAL_FALLBACK;
    useStore.getState().updateTaskStatus(this.taskId, SimulationStatus.ABNORMAL_FALLBACK);
  }

  private updateStore(): void {
    const dataPoint = this.getCurrentMonitoringData();
    useStore.getState().addMonitoringData(this.taskId, dataPoint);
    useStore.getState().updateTask(this.taskId, {
      progress: Math.min(100, Math.round(this.state.progress)),
      currentStage: this.getCurrentStageName()
    });
  }

  private getCurrentStageName(): string {
    const stageNames: Record<SimulationStatus, string> = {
      [SimulationStatus.PENDING_VALIDATION]: '参数验证',
      [SimulationStatus.GRID_GENERATION]: '三维流体网格生成',
      [SimulationStatus.COLLAPSE_PHASE]: '引力塌缩阶段计算',
      [SimulationStatus.SHOCK_BOUNCE]: '反弹激波形成与传播',
      [SimulationStatus.NUCLEOSYNTHESIS]: '核合成计算',
      [SimulationStatus.COMPLETED]: '计算完成',
      [SimulationStatus.ABNORMAL_FALLBACK]: '异常回退处理',
      [SimulationStatus.PAUSED]: '已暂停',
      [SimulationStatus.CANCELLED]: '已取消'
    };
    return stageNames[this.state.status];
  }

  private stopSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public pause(): void {
    this.isPaused = true;
    useStore.getState().updateTaskStatus(this.taskId, SimulationStatus.PAUSED);
  }

  public resume(): void {
    this.isPaused = false;
    useStore.getState().updateTaskStatus(this.taskId, this.state.status);
  }

  public restart(): void {
    this.stopSimulation();
    this.startSimulation();
  }

  public getState(): SimulationState {
    return { ...this.state };
  }

  public isRunning(): boolean {
    return this.intervalId !== null && !this.isPaused;
  }

  public setCallbacks(callbacks: Partial<SimulationCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public destroy(): void {
    this.stopSimulation();
    this.callbacks = {};
  }
}

export default SimulationEngine;
