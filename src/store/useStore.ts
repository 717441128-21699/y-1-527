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
  NucleosynthesisAssessment,
  SimulationVersion,
  TimelineEvent,
  NuclideAbundance
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
  nuclideData: Record<string, NuclideAbundance[]>;
  performanceMetrics: PerformanceMetrics[];
  isLoading: boolean;
  activeEngines: Record<string, SimulationEngine>;
  multimessengerPushed: Record<string, boolean>;
  simulationVersions: Record<string, SimulationVersion[]>;
  timelineEvents: Record<string, TimelineEvent[]>;
  currentVersion: Record<string, number>;
  
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
  getMonitoringData: (taskId: string, version?: number) => MonitoringDataPoint[];
  addMonitoringData: (taskId: string, data: MonitoringDataPoint) => void;
  updateVersionData: (taskId: string, version: number, updates: Partial<SimulationVersion>) => void;
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
  getVersions: (taskId: string) => SimulationVersion[];
  getCurrentVersion: (taskId: string) => number;
  setCurrentVersion: (taskId: string, version: number) => void;
  
  submitForApproval: (taskId: string) => void;
  approvePostdoc: (taskId: string, verification: ShockVerification, comments: string) => void;
  rejectPostdoc: (taskId: string, comments: string) => void;
  approveProfessor: (taskId: string, assessment: NucleosynthesisAssessment, comments: string) => void;
  rejectProfessor: (taskId: string, comments: string) => void;
  addApprovalRecord: (taskId: string, record: ApprovalRecord) => void;
  
  pushToMultimessenger: (taskId: string) => void;
  
  checkNi56Deviation: (progenitorMass: number) => { hasDeviation: boolean; lastThree: number[] };
  
  addTimelineEvent: (taskId: string, event: Omit<TimelineEvent, 'id' | 'taskId' | 'timestamp'> & { timestamp?: Date }) => void;
  getTimelineEvents: (taskId: string) => TimelineEvent[];
}

const genId = () => Math.random().toString(36).substring(2, 11);

const initVersionsForTask = (task: SimulationTask, monitoringData: MonitoringDataPoint[], nuclideData: NuclideAbundance[]): SimulationVersion[] => {
  return [{
    version: 0,
    label: '原始模拟',
    parameters: { ...task.parameters },
    startedAt: task.startedAt || task.createdAt,
    completedAt: task.completedAt,
    status: task.status,
    monitoringData: [...monitoringData],
    nuclideData: [...nuclideData],
    ni56Yield: task.ni56Yield,
    ge68Yield: task.ge68Yield
  }];
};

const initTimelineForTask = (task: SimulationTask): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  
  events.push({
    id: `evt-${genId()}`,
    taskId: task.id,
    type: 'task_created',
    timestamp: new Date(task.createdAt),
    title: '任务创建',
    description: `任务"${task.name}"已创建，前身星质量 ${task.parameters.mass} M☉`
  });
  
  if (task.status !== SimulationStatus.PENDING_VALIDATION) {
    events.push({
      id: `evt-${genId()}`,
      taskId: task.id,
      type: 'stage_change',
      timestamp: new Date(task.createdAt.getTime() + 60000),
      title: '进入网格生成阶段',
      description: '开始构建三维流体网格，初始化中微子输运与核网络'
    });
  }
  
  if (task.warnings.length > 0) {
    task.warnings.forEach(w => {
      events.push({
        id: `evt-${genId()}`,
        taskId: task.id,
        type: 'warning_triggered',
        timestamp: new Date(w.timestamp),
        title: `触发${w.severity === 'critical' ? '严重' : ''}预警`,
        description: w.message,
        data: { warningId: w.id }
      });
    });
  }
  
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const useStore = create<AppState>((set, get) => {
  const initialVersions: Record<string, SimulationVersion[]> = {};
  const initialTimeline: Record<string, TimelineEvent[]> = {};
  const initialNuclideData: Record<string, NuclideAbundance[]> = {};
  const initialMonitoring: Record<string, MonitoringDataPoint[]> = {
    'task-001': generateMonitoringData('task-001', 45),
    'task-002': generateMonitoringData('task-002', 68),
    'task-003': generateMonitoringData('task-003', 85),
    'task-004': generateMonitoringData('task-004', 100),
    'task-005': generateMonitoringData('task-005', 100),
    'task-007': generateMonitoringData('task-007', 100)
  };

  mockTasks.forEach(task => {
    const mData = initialMonitoring[task.id] || [];
    const nData = initialNuclideData[task.id] || [];
    initialVersions[task.id] = initVersionsForTask(task, mData, nData);
    initialTimeline[task.id] = initTimelineForTask(task);
    initialNuclideData[task.id] = generateNuclideData(task.id);
  });

  return {
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
    monitoringData: initialMonitoring,
    nuclideData: initialNuclideData,
    performanceMetrics: mockPerformanceMetrics,
    isLoading: false,
    activeEngines: {},
    multimessengerPushed: {},
    simulationVersions: initialVersions,
    timelineEvents: initialTimeline,
    currentVersion: {},

    setCurrentUser: (user) => set({ currentUser: user }),

    getTaskById: (id) => get().tasks.find(t => t.id === id),

    addTask: (task) => {
      const version: SimulationVersion = {
        version: 0,
        label: '原始模拟',
        parameters: { ...task.parameters },
        startedAt: task.startedAt || task.createdAt,
        completedAt: null,
        status: task.status,
        monitoringData: [],
        nuclideData: [],
        ni56Yield: undefined,
        ge68Yield: undefined
      };

      const timeline: TimelineEvent[] = [{
        id: `evt-${genId()}`,
        taskId: task.id,
        type: 'task_created',
        timestamp: new Date(task.createdAt),
        title: '任务创建',
        description: `任务"${task.name}"已创建，前身星质量 ${task.parameters.mass} M☉，金属丰度 [Fe/H] = ${task.parameters.metallicity}`
      }];

      set((state) => ({
        tasks: [task, ...state.tasks],
        monitoringData: {
          ...state.monitoringData,
          [task.id]: []
        },
        simulationVersions: {
          ...state.simulationVersions,
          [task.id]: [version]
        },
        timelineEvents: {
          ...state.timelineEvents,
          [task.id]: timeline
        },
        currentVersion: {
          ...state.currentVersion,
          [task.id]: 0
        }
      }));
    },

    updateTask: (id, updates) => set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    })),

    updateTaskStatus: (id, status) => {
      const stageNames: Record<SimulationStatus, string> = {
        [SimulationStatus.PENDING_VALIDATION]: '待校验',
        [SimulationStatus.GRID_GENERATION]: '网格生成',
        [SimulationStatus.COLLAPSE_PHASE]: '引力塌缩阶段',
        [SimulationStatus.SHOCK_BOUNCE]: '反弹激波形成',
        [SimulationStatus.NUCLEOSYNTHESIS]: '核合成计算',
        [SimulationStatus.COMPLETED]: '计算完成',
        [SimulationStatus.ABNORMAL_FALLBACK]: '异常回退处理',
        [SimulationStatus.PAUSED]: '已暂停',
        [SimulationStatus.CANCELLED]: '已取消'
      };

      get().addTimelineEvent(id, {
        type: 'stage_change',
        title: `进入${stageNames[status]}阶段`,
        description: `模拟状态更新为：${stageNames[status]}`
      });

      set((state) => ({
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
      }));
    },

    addWarning: (warning) => {
      get().addTimelineEvent(warning.taskId, {
        type: 'warning_triggered',
        title: `${warning.severity === 'critical' ? '严重' : warning.severity === 'warning' ? '警告' : '提示'}预警`,
        description: warning.message,
        timestamp: new Date(warning.timestamp),
        data: { warningId: warning.id }
      });

      set((state) => ({
        warnings: [warning, ...state.warnings],
        tasks: state.tasks.map(t => 
          t.id === warning.taskId 
            ? { ...t, warnings: [...t.warnings, warning] }
            : t
        )
      }));
    },

    updateWarning: (id, updates) => {
      const state = get();
      const warning = state.warnings.find(w => w.id === id);
      
      if (warning && updates.status === 'resolved') {
        state.addTimelineEvent(warning.taskId, {
          type: 'warning_resolved',
          title: '预警已处理',
          description: updates.resolution || '预警已复核处理',
          data: { warningId: id }
        });
      }
      
      set((state) => {
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
      });
    },

    addReport: (report) => set((state) => ({
      reports: [report, ...state.reports]
    })),

    addExport: (exportTask) => set((state) => ({
      exports: [exportTask, ...state.exports]
    })),

    updateExport: (id, updates) => set((state) => ({
      exports: state.exports.map(e => e.id === id ? { ...e, ...updates } : e)
    })),

    getMonitoringData: (taskId, version) => {
      const state = get();
      if (version !== undefined) {
        const versions = state.simulationVersions[taskId];
        if (versions && versions[version]) {
          return versions[version].monitoringData;
        }
      }
      return state.monitoringData[taskId] || [];
    },

    addMonitoringData: (taskId, data) => {
      const state = get();
      const currentVer = state.currentVersion[taskId] ?? 0;
      const versions = state.simulationVersions[taskId] || [];
      
      set((state) => {
        const newVersions = [...(state.simulationVersions[taskId] || [])];
        if (newVersions[currentVer]) {
          newVersions[currentVer] = {
            ...newVersions[currentVer],
            monitoringData: [...newVersions[currentVer].monitoringData, data],
            status: state.tasks.find(t => t.id === taskId)?.status || SimulationStatus.PENDING_VALIDATION
          };
        }
        
        return {
          monitoringData: {
            ...state.monitoringData,
            [taskId]: [...(state.monitoringData[taskId] || []), data]
          },
          simulationVersions: {
            ...state.simulationVersions,
            [taskId]: newVersions
          }
        };
      });
    },

    updateVersionData: (taskId, version, updates: Partial<SimulationVersion>) => {
      set((state) => {
        const versions = [...(state.simulationVersions[taskId] || [])];
        if (versions[version]) {
          versions[version] = { ...versions[version], ...updates };
        }
        return {
          simulationVersions: {
            ...state.simulationVersions,
            [taskId]: versions
          }
        };
      });
    },

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

      const currentMonitoring = state.monitoringData[taskId] || [];
      const currentNuclides = state.nuclideData[taskId] || [];
      const currentVersions = state.simulationVersions[taskId] || [];
      const newVersionNum = currentVersions.length;

      const currentVersionData: SimulationVersion = {
        version: newVersionNum - 1,
        label: currentVersions.length === 1 ? '原始模拟' : `第${newVersionNum - 1}次重算`,
        parameters: { ...task.parameters },
        startedAt: task.startedAt || task.createdAt,
        completedAt: task.completedAt,
        status: task.status,
        monitoringData: [...currentMonitoring],
        nuclideData: [...currentNuclides],
        ni56Yield: task.ni56Yield,
        ge68Yield: task.ge68Yield
      };

      const newVersions = [...currentVersions];
      if (newVersions.length > 0) {
        newVersions[newVersions.length - 1] = currentVersionData;
      }

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
        restartCount: newVersionNum
      };

      let newParams = { ...task.parameters };
      if (adjustments.type === 'equation_of_state') {
        newParams.equationOfState = adjustments.newValue;
      } else if (adjustments.type === 'reaction_rate') {
        newParams.reactionNetwork = adjustments.newValue;
      }

      get().addAdjustment(taskId, adjustmentLog);
      
      get().addTimelineEvent(taskId, {
        type: 'adjustment_made',
        title: '参数调整',
        description: `${adjustments.parameter}: ${adjustments.oldValue} → ${adjustments.newValue}，原因：${adjustments.reason}`
      });

      get().addTimelineEvent(taskId, {
        type: 'simulation_restarted',
        title: `第${newVersionNum}次重算启动`,
        description: `基于${adjustments.parameter.includes('状态方程') ? '状态方程' : '核反应网络'}调整重新启动模拟`
      });

      get().updateTask(taskId, {
        parameters: newParams,
        status: SimulationStatus.PENDING_VALIDATION,
        progress: 0,
        startedAt: new Date(),
        completedAt: null
      });

      get().updateWarning(warningId, {
        status: 'resolved',
        resolution: adjustments.reason,
        reviewedBy: currentUser.id,
        reviewedAt: new Date()
      });

      const newVersion: SimulationVersion = {
        version: newVersionNum,
        label: `第${newVersionNum}次重算`,
        parameters: { ...newParams },
        startedAt: new Date(),
        completedAt: null,
        status: SimulationStatus.PENDING_VALIDATION,
        monitoringData: [],
        nuclideData: [],
        ni56Yield: undefined,
        ge68Yield: undefined
      };

      set((state) => ({
        simulationVersions: {
          ...state.simulationVersions,
          [taskId]: [...newVersions, newVersion]
        },
        currentVersion: {
          ...state.currentVersion,
          [taskId]: newVersionNum
        },
        monitoringData: {
          ...state.monitoringData,
          [taskId]: []
        }
      }));

      get().restartSimulation(taskId);
    },

    getVersions: (taskId) => {
      return get().simulationVersions[taskId] || [];
    },

    getCurrentVersion: (taskId) => {
      return get().currentVersion[taskId] ?? 0;
    },

    setCurrentVersion: (taskId, version) => {
      set((state) => ({
        currentVersion: {
          ...state.currentVersion,
          [taskId]: version
        }
      }));
    },

    submitForApproval: (taskId) => {
      get().updateApprovalStatus(taskId, ApprovalStatus.POSTDOC_PENDING);
      get().addTimelineEvent(taskId, {
        type: 'approval_submitted',
        title: '提交审批',
        description: '模拟结果已提交，等待博士后验证激波动力学'
      });
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
      get().addTimelineEvent(taskId, {
        type: 'approval_postdoc',
        title: '博士后审核通过',
        description: `激波动力学验证通过，评论：${comments || '无'}`,
        data: { approver: currentUser.name }
      });
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
      get().addTimelineEvent(taskId, {
        type: 'approval_postdoc',
        title: '博士后审核驳回',
        description: comments || '需要修改'
      });
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
      get().addTimelineEvent(taskId, {
        type: 'approval_professor',
        title: '教授审核通过',
        description: `核合成评估通过，观测匹配度：${assessment.observationMatch}%`,
        data: { approver: currentUser.name }
      });
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
      get().addTimelineEvent(taskId, {
        type: 'approval_professor',
        title: '教授审核驳回',
        description: comments || '需要修改'
      });
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
      get().addTimelineEvent(taskId, {
        type: 'multimessenger_pushed',
        title: '已推送到多信使观测提案系统',
        description: `提案编号: MMS-${taskId.toUpperCase().replace(/-/g, '')}`
      });
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
    },

    addTimelineEvent: (taskId, event) => {
      const newEvent: TimelineEvent = {
        id: `evt-${genId()}`,
        taskId,
        timestamp: event.timestamp || new Date(),
        ...event
      };

      set((state) => ({
        timelineEvents: {
          ...state.timelineEvents,
          [taskId]: [...(state.timelineEvents[taskId] || []), newEvent]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        }
      }));
    },

    getTimelineEvents: (taskId) => {
      return get().timelineEvents[taskId] || [];
    }
  };
});
