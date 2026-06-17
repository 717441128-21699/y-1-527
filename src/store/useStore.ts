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
  PerformanceMetrics
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
  setCurrentUser: (user: User) => void;
  getTaskById: (id: string) => SimulationTask | undefined;
  addTask: (task: SimulationTask) => void;
  updateTask: (id: string, updates: Partial<SimulationTask>) => void;
  updateTaskStatus: (id: string, status: SimulationStatus) => void;
  addWarning: (warning: Warning) => void;
  updateWarning: (id: string, updates: Partial<Warning>) => void;
  addReport: (report: SimulationReport) => void;
  addExport: (exportTask: ExportTask) => void;
  getMonitoringData: (taskId: string) => MonitoringDataPoint[];
  addMonitoringData: (taskId: string, data: MonitoringDataPoint) => void;
  updateApprovalStatus: (taskId: string, status: ApprovalStatus) => void;
  setIsLoading: (loading: boolean) => void;
}

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
          return { ...item, status: 'completed' as const, endTime: new Date() };
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

  setIsLoading: (loading) => set({ isLoading: loading })
}));
