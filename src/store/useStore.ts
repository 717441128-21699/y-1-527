import { create } from 'zustand';
import {
  SimulationTask,
  User,
  Warning,
  MonitoringDataPoint,
  SimulationReport,
  ExportTask,
  Recommendation,
  DailyStatistics,
  ConfigItem,
  WarningThresholds,
  SimulationStatus,
  ApprovalStatus,
  PerformanceMetrics,
  AdjustmentLog,
  ApprovalRecord,
  ShockVerification,
  NucleosynthesisAssessment
} from '@/types';
import {
  mockTasks,
  mockUsers,
  mockWarnings,
  mockReports,
  mockExports,
  mockRecommendations,
  mockEquationsOfState,
  mockReactionNetworks,
  mockWarningThresholds,
  mockPerformanceMetrics,
  generateDailyStats,
  generateMonitoringData,
  generateNuclideData
} from '@/data/mockData';
import { SimulationEngine } from '@/services/simulationEngine';

interface AppState {
  currentUser: User | null;
  tasks: SimulationTask[];
  warnings: Warning[];
  reports: SimulationReport[];
  exports: ExportTask[];
  recommendations: Recommendation[];
  dailyStats: DailyStatistics[];
  equationsOfState: ConfigItem[];
  reactionNetworks: ConfigItem[];
  warningThresholds: WarningThresholds;
  monitoringData: Record<string, MonitoringDataPoint[]>;
  nuclideData: Record<string, ReturnType<typeof generateNuclideData>>;
  performanceMetrics: PerformanceMetrics[];
  isLoading: boolean;
  activeEngines: Record<string, SimulationEngine>;
  multimessengerPushed: Record<string, boolean>;
  
  setCurrentUser: (user: User) => void;
  getTaskById: (id: string) => SimulationTask | undefined;
  addTask: (task: SimulationTask) => void;
  updateTask: (id: string, updates: Partial<SimulationTask>) => void;
  updateTaskStatus: (id: string, status: SimulationStatus) => void;
  addWarning: (warning: Warning) => void;
  updateWarning: (id: string, updates: Partial<Warning>) => void;
  addReport: (report: SimulationReport) => void;
  addExport: (exportTask: ExportTask) => void;
  updateExport: (id: string, updates: Partial<ExportTask>) => void;
  getMonitoringData: (taskId: string) => MonitoringDataPoint[];
  addMonitoringData: (taskId: string, data: MonitoringDataPoint) => void;
  updateApprovalStatus: (taskId: string, status: ApprovalStatus) => void;
  setIsLoading: (loading: boolean) => void;
  
  startSimulation: (taskId: string) => void;
  pauseSimulation: (taskId: string) => void;
  resumeSimulation: (taskId: string) => void;
  restartSimulation: (taskId: string) => void;
  stopSimulation: (taskId: string) => void;
  
  addAdjustment: (taskId: string, adjustment: AdjustmentLog) => void;
  reRunSimulationWithAdjustments: (taskId: string, warningId: string, adjustments: {
    type: 'equation_of_state' | 'reaction_rate' | 'grid_resolution';
    parameter: string;
    oldValue: string;
    newValue: string;
    reason: string;
  }) => void;
  
  submitForApproval: (taskId: string) => void;
  approvePostdoc: (taskId: string, verification: ShockVerification, comments: string) => void;
  rejectPostdoc: (taskId: string, comments: string) => void;
  approveProfessor: (taskId: string, assessment: NucleosynthesisAssessment, comments: string) => void;
  rejectProfessor: (taskId: string, comments: string) => void;
  addApprovalRecord: (taskId: string, record: ApprovalRecord) => void;
  
  pushToMultimessenger: (taskId: string) => void;
  
  checkNi56Deviation: (progenitorMass: number) => { hasDeviation: boolean; lastThree: number[] };
}

const genId = () => Math.random().toString(36).substring(2, 11);

export const useStore = create<AppState>((set, get) => ({
  currentUser: mockUsers[0],
  tasks: mockTasks,
  warnings: mockWarnings,
  reports: mockReports,
  exports: mockExports,
  recommendations: mockRecommendations,
  dailyStats: generateDailyStats(30),
  equationsOfState: mockEquationsOfState,
  reactionNetworks: mockReactionNetworks,
  warningThresholds: mockWarningThresholds,
  monitoringData: {
    'task-001': generateMonitoringData('task-001', 45),
    'task-002': generateMonitoringData('task-002', 68),
    'task-003': generateMonitoringData('task-003', 85),
    'task-004': generateMonitoringData('task-004', 100),
    'task-005': generateMonitoringData('task-005', 100),
    'task-007': generateMonitoringData('task-007', 100)
  },
  nuclideData: {
    'task-004': generateNuclideData('task-004'),
    'task-005': generateNuclideData('task-005'),
    'task-007': generateNuclideData('task-007')
  },
  performanceMetrics: mockPerformanceMetrics,
  isLoading: false,
  activeEngines: {},
  multimessengerPushed: {},

  setCurrentUser: (user) => set({ currentUser: user }),

  getTaskById: (id) => get().tasks.find(t => t.id === id),

  addTask: (task) => set((state) => ({
    tasks: [task, ...state.tasks],
    monitoringData: {
      ...state.monitoringData,
      [task.id]: []
    }
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  updateTaskStatus: (id, status) => set((state) => ({
    tasks: state.tasks.map(t => {
      if (t.id !== id) return t;
      
      const newTimeline = t.stageTimeline.map(item => {
        if (item.stage === status) {
          return { ...item, status: 'running' as const, startTime: new Date() };
        }
        if (item.status === 'running') {
          const endTime = new Date();
          const duration = endTime.getTime() - new Date(item.startTime).getTime();
          return { ...item, status: 'completed' as const, endTime, duration };
        }
        return item;
      });
      
      return { ...t, status, stageTimeline: newTimeline };
    })
  })),

  addWarning: (warning) => set((state) => ({
    warnings: [warning, ...state.warnings],
    tasks: state.tasks.map(t => 
      t.id === warning.taskId 
        ? { ...t, warnings: [...t.warnings, warning] }
        : t
    )
  })),

  updateWarning: (id, updates) => set((state) => {
    const warning = state.warnings.find(w => w.id === id);
    if (!warning) return state;
    
    return {
      warnings: state.warnings.map(w => w.id === id ? { ...w, ...updates } : w),
      tasks: state.tasks.map(t => 
        t.id === warning.taskId
          ? { ...t, warnings: t.warnings.map(w => w.id === id ? { ...w, ...updates } : w) }
          : t
      )
    };
  }),

  addReport: (report) => set((state) => ({
    reports: [report, ...state.reports]
  })),

  addExport: (exportTask) => set((state) => ({
    exports: [exportTask, ...state.exports]
  })),

  updateExport: (id, updates) => set((state) => ({
    exports: state.exports.map(e => e.id === id ? { ...e, ...updates } : e)
  })),

  getMonitoringData: (taskId) => get().monitoringData[taskId] || [],

  addMonitoringData: (taskId, data) => set((state) => ({
    monitoringData: {
      ...state.monitoringData,
      [taskId]: [...(state.monitoringData[taskId] || []), data]
    }
  })),

  updateApprovalStatus: (taskId, status) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, approvalStatus: status } : t)
  })),

  setIsLoading: (loading) => set({ isLoading: loading }),

  startSimulation: (taskId) => {
    const state = get();
    if (state.activeEngines[taskId]) {
      state.activeEngines[taskId].resume();
      return;
    }

    const engine = new SimulationEngine(taskId);
    set({ activeEngines: { ...get().activeEngines, [taskId]: engine } });
    engine.startSimulation(taskId);
  },

  pauseSimulation: (taskId) => {
    const engine = get().activeEngines[taskId];
    if (engine) {
      engine.pause();
    }
  },

  resumeSimulation: (taskId) => {
    const engine = get().activeEngines[taskId];
    if (engine) {
      engine.resume();
    }
  },

  restartSimulation: (taskId) => {
    const engine = get().activeEngines[taskId];
    if (engine) {
      engine.restart();
    } else {
      const newEngine = new SimulationEngine(taskId);
      set({ activeEngines: { ...get().activeEngines, [taskId]: newEngine } });
      newEngine.startSimulation(taskId);
    }
  },

  stopSimulation: (taskId) => {
    const engine = get().activeEngines[taskId];
    if (engine) {
      engine.destroy();
      const newEngines = { ...get().activeEngines };
      delete newEngines[taskId];
      set({ activeEngines: newEngines });
    }
  },

  addAdjustment: (taskId, adjustment) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, adjustments: [...t.adjustments, adjustment] }
        : t
    )
  })),

  reRunSimulationWithAdjustments: (taskId, warningId, adjustments) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    const currentUser = state.currentUser;
    
    if (!task || !currentUser) return;

    const adjustmentLog: AdjustmentLog = {
      id: `adj-${genId()}`,
      taskId,
      warningId,
      type: adjustments.type,
      parameter: adjustments.parameter,
      oldValue: adjustments.oldValue,
      newValue: adjustments.newValue,
      reason: adjustments.reason,
      adjustedBy: currentUser.id,
      adjustedAt: new Date(),
      restartCount: task.adjustments.length + 1
    };

    let newParams = { ...task.parameters };
    if (adjustments.type === 'equation_of_state') {
      newParams.equationOfState = adjustments.newValue;
    }

    get().addAdjustment(taskId, adjustmentLog);
    get().updateTask(taskId, {
      parameters: newParams,
      status: SimulationStatus.PENDING_VALIDATION,
      progress: 0
    });

    get().updateWarning(warningId, {
      status: 'resolved',
      resolution: adjustments.reason,
      reviewedBy: currentUser.id,
      reviewedAt: new Date()
    });

    get().restartSimulation(taskId);
  },

  submitForApproval: (taskId) => {
    get().updateApprovalStatus(taskId, ApprovalStatus.POSTDOC_PENDING);
  },

  approvePostdoc: (taskId, verification, comments) => {
    const state = get();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    const record: ApprovalRecord = {
      id: `appr-${genId()}`,
      taskId,
      level: 'postdoc',
      approver: currentUser.id,
      status: 'approved',
      comments,
      approvedAt: new Date(),
      shockDynamicsVerification: verification
    };

    get().addApprovalRecord(taskId, record);
    get().updateApprovalStatus(taskId, ApprovalStatus.PROFESSOR_PENDING);
  },

  rejectPostdoc: (taskId, comments) => {
    const state = get();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    const record: ApprovalRecord = {
      id: `appr-${genId()}`,
      taskId,
      level: 'postdoc',
      approver: currentUser.id,
      status: 'rejected',
      comments,
      approvedAt: new Date(),
      shockDynamicsVerification: {
        shockVelocityValid: false,
        radiusEvolutionValid: false,
        energyConservationValid: false,
        comments
      }
    };

    get().addApprovalRecord(taskId, record);
    get().updateApprovalStatus(taskId, ApprovalStatus.POSTDOC_REJECTED);
  },

  approveProfessor: (taskId, assessment, comments) => {
    const state = get();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    const record: ApprovalRecord = {
      id: `appr-${genId()}`,
      taskId,
      level: 'professor',
      approver: currentUser.id,
      status: 'approved',
      comments,
      approvedAt: new Date(),
      shockDynamicsVerification: {
        shockVelocityValid: true,
        radiusEvolutionValid: true,
        energyConservationValid: true,
        comments: '已通过博士后审核'
      },
      nucleosynthesisAssessment: assessment
    };

    get().addApprovalRecord(taskId, record);
    get().updateApprovalStatus(taskId, ApprovalStatus.PROFESSOR_APPROVED);
    get().pushToMultimessenger(taskId);
  },

  rejectProfessor: (taskId, comments) => {
    const state = get();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    const record: ApprovalRecord = {
      id: `appr-${genId()}`,
      taskId,
      level: 'professor',
      approver: currentUser.id,
      status: 'rejected',
      comments,
      approvedAt: new Date(),
      shockDynamicsVerification: {
        shockVelocityValid: false,
        radiusEvolutionValid: false,
        energyConservationValid: false,
        comments: '教授审核驳回'
      },
      nucleosynthesisAssessment: {
        ni56YieldValid: false,
        abundanceDistributionValid: false,
        observationMatch: 0,
        comments
      }
    };

    get().addApprovalRecord(taskId, record);
    get().updateApprovalStatus(taskId, ApprovalStatus.PROFESSOR_REJECTED);
  },

  addApprovalRecord: (taskId, record) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, approvalHistory: [...t.approvalHistory, record] }
        : t
    )
  })),

  pushToMultimessenger: (taskId) => {
    set((state) => ({
      multimessengerPushed: {
        ...state.multimessengerPushed,
        [taskId]: true
      }
    }));
  },

  checkNi56Deviation: (progenitorMass) => {
    const state = get();
    const completedTasks = state.tasks.filter(t => 
      t.status === SimulationStatus.COMPLETED &&
      t.parameters.mass === progenitorMass &&
      t.ni56Yield !== undefined
    ).slice(0, 3);

    const ni56Yields = completedTasks.map(t => t.ni56Yield!);
    
    if (ni56Yields.length < 3) {
      return { hasDeviation: false, lastThree: ni56Yields };
    }

    const avg = ni56Yields.reduce((a, b) => a + b, 0) / ni56Yields.length;
    const maxDeviation = Math.max(...ni56Yields.map(y => Math.abs(y - avg) / avg * 100));
    
    return {
      hasDeviation: maxDeviation > 20,
      lastThree: ni56Yields
    };
  }
}));
