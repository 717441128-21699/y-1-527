import {
  SimulationTask,
  SimulationStatus,
  ApprovalStatus,
  Warning,
  MonitoringDataPoint,
  NuclideAbundance,
  AdjustmentLog,
  ApprovalRecord,
  SimulationReport,
  ExportTask,
  Recommendation,
  DailyStatistics,
  PerformanceMetrics,
  User,
  ConfigItem,
  WarningThresholds,
  StageTimelineItem
} from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const mockUsers: User[] = [
  {
    id: 'user-001',
    name: '张明博士后',
    email: 'zhangming@astrophysics.edu.cn',
    role: 'postdoc',
    institution: '中国科学院国家天文台',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang'
  },
  {
    id: 'user-002',
    name: '李华教授',
    email: 'lihua@astrophysics.edu.cn',
    role: 'professor',
    institution: '北京大学物理学院',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li'
  },
  {
    id: 'user-003',
    name: '王强研究员',
    email: 'wangqiang@astrophysics.edu.cn',
    role: 'physicist',
    institution: '清华大学物理系',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang'
  },
  {
    id: 'user-004',
    name: '系统管理员',
    email: 'admin@astrophysics.edu.cn',
    role: 'admin',
    institution: '超级计算中心',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  }
];

export const mockEquationsOfState: ConfigItem[] = [
  {
    id: 'eos-001',
    name: 'LS220',
    version: '2.0',
    description: 'Lattimer-Swesty 220 MeV 状态方程，适用于中子星研究',
    isDefault: true,
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'eos-002',
    name: 'SFHo',
    version: '1.3',
    description: 'Steiner-Fischer-Hempel 状态方程，考虑超子效应',
    isDefault: false,
    createdAt: new Date('2024-02-20')
  },
  {
    id: 'eos-003',
    name: 'DD2',
    version: '3.1',
    description: 'Density Dependent 2 状态方程，广泛用于核心塌缩模拟',
    isDefault: false,
    createdAt: new Date('2024-03-10')
  },
  {
    id: 'eos-004',
    name: 'TM1',
    version: '2.5',
    description: 'TM1 相对论平均场状态方程',
    isDefault: false,
    createdAt: new Date('2024-04-05')
  }
];

export const mockReactionNetworks: ConfigItem[] = [
  {
    id: 'net-001',
    name: 'alpha-network',
    version: '4.0',
    description: 'alpha 粒子网络，包含 20 种核素',
    isDefault: true,
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'net-002',
    name: 'full-network',
    version: '2.1',
    description: '完整核反应网络，包含 200+ 种核素',
    isDefault: false,
    createdAt: new Date('2024-03-15')
  },
  {
    id: 'net-003',
    name: 'r-process-network',
    version: '1.5',
    description: 'r-过程专用网络，重元素核合成',
    isDefault: false,
    createdAt: new Date('2024-05-01')
  }
];

export const mockWarningThresholds: WarningThresholds = {
  shockStagnationTime: 500,
  neutrinoEnergyMin: 1e51,
  neutrinoEnergyMax: 1e54,
  ni56DeviationThreshold: 20,
  convergenceRateThreshold: 0.95
};

const createStageTimeline = (status: SimulationStatus): StageTimelineItem[] => {
  const stages = [
    SimulationStatus.PENDING_VALIDATION,
    SimulationStatus.GRID_GENERATION,
    SimulationStatus.COLLAPSE_PHASE,
    SimulationStatus.SHOCK_BOUNCE,
    SimulationStatus.NUCLEOSYNTHESIS,
    SimulationStatus.COMPLETED
  ];
  
  const currentIndex = stages.indexOf(status);
  
  return stages.map((stage, index) => {
    const isCompleted = index < currentIndex;
    const isRunning = index === currentIndex;
    
    return {
      id: `stage-${generateId()}`,
      stage,
      startTime: new Date(Date.now() - (stages.length - index) * 3600000),
      endTime: isCompleted ? new Date(Date.now() - (stages.length - index - 1) * 3600000) : isRunning ? null : null,
      duration: isCompleted ? 3600 + Math.random() * 1800 : isRunning ? Date.now() - (Date.now() - (stages.length - index) * 3600000) : 0,
      status: isCompleted ? 'completed' : isRunning ? 'running' : 'pending'
    };
  });
};

export const mockTasks: SimulationTask[] = [
  {
    id: 'task-001',
    name: '15M☉ 零金属丰度星核塌缩模拟',
    parameters: {
      mass: 15.0,
      metallicity: 0.0,
      rotationVelocity: 0.0,
      equationOfState: 'LS220',
      reactionNetwork: 'alpha-network'
    },
    status: SimulationStatus.COLLAPSE_PHASE,
    progress: 45,
    priority: 'high',
    createdAt: new Date(Date.now() - 86400000),
    startedAt: new Date(Date.now() - 7200000),
    completedAt: null,
    createdBy: 'user-001',
    assignedTo: ['user-001', 'user-003'],
    currentStage: '塌缩阶段计算',
    stageTimeline: createStageTimeline(SimulationStatus.COLLAPSE_PHASE),
    warnings: [],
    adjustments: [],
    approvalStatus: ApprovalStatus.NOT_SUBMITTED,
    approvalHistory: [],
    ni56Yield: undefined,
    ge68Yield: undefined
  },
  {
    id: 'task-002',
    name: '20M☉ 太阳金属丰度超新星模拟',
    parameters: {
      mass: 20.0,
      metallicity: 0.02,
      rotationVelocity: 100.0,
      equationOfState: 'SFHo',
      reactionNetwork: 'full-network'
    },
    status: SimulationStatus.SHOCK_BOUNCE,
    progress: 68,
    priority: 'high',
    createdAt: new Date(Date.now() - 172800000),
    startedAt: new Date(Date.now() - 14400000),
    completedAt: null,
    createdBy: 'user-001',
    assignedTo: ['user-001', 'user-002'],
    currentStage: '反弹激波形成',
    stageTimeline: createStageTimeline(SimulationStatus.SHOCK_BOUNCE),
    warnings: [
      {
        id: 'warn-001',
        taskId: 'task-002',
        type: 'shock_stagnation',
        severity: 'warning',
        message: '激波停滞时间接近临界阈值',
        timestamp: new Date(Date.now() - 1800000),
        data: {
          shockRadius: 150,
          criticalThreshold: 200,
          stagnationTime: 450
        },
        reviewedBy: null,
        reviewedAt: null,
        resolution: null,
        status: 'pending'
      }
    ],
    adjustments: [],
    approvalStatus: ApprovalStatus.NOT_SUBMITTED,
    approvalHistory: [],
    ni56Yield: undefined,
    ge68Yield: undefined
  },
  {
    id: 'task-003',
    name: '25M☉ 快速旋转星核合成计算',
    parameters: {
      mass: 25.0,
      metallicity: -1.0,
      rotationVelocity: 300.0,
      equationOfState: 'DD2',
      reactionNetwork: 'alpha-network'
    },
    status: SimulationStatus.NUCLEOSYNTHESIS,
    progress: 85,
    priority: 'medium',
    createdAt: new Date(Date.now() - 259200000),
    startedAt: new Date(Date.now() - 21600000),
    completedAt: null,
    createdBy: 'user-003',
    assignedTo: ['user-003'],
    currentStage: '核合成计算',
    stageTimeline: createStageTimeline(SimulationStatus.NUCLEOSYNTHESIS),
    warnings: [],
    adjustments: [],
    approvalStatus: ApprovalStatus.NOT_SUBMITTED,
    approvalHistory: [],
    ni56Yield: undefined,
    ge68Yield: undefined
  },
  {
    id: 'task-004',
    name: '12M☉ 低金属丰度超新星模拟',
    parameters: {
      mass: 12.0,
      metallicity: -2.0,
      rotationVelocity: 50.0,
      equationOfState: 'LS220',
      reactionNetwork: 'full-network'
    },
    status: SimulationStatus.COMPLETED,
    progress: 100,
    priority: 'low',
    createdAt: new Date(Date.now() - 345600000),
    startedAt: new Date(Date.now() - 28800000),
    completedAt: new Date(Date.now() - 3600000),
    createdBy: 'user-001',
    assignedTo: ['user-001', 'user-002'],
    currentStage: '计算完成',
    stageTimeline: createStageTimeline(SimulationStatus.COMPLETED),
    warnings: [
      {
        id: 'warn-002',
        taskId: 'task-004',
        type: 'neutrino_anomaly',
        severity: 'critical',
        message: '中微之光度异常偏低',
        timestamp: new Date(Date.now() - 43200000),
        data: {
          neutrinoEnergy: 5e50,
          expectedRange: [1e51, 1e54]
        },
        reviewedBy: 'user-003',
        reviewedAt: new Date(Date.now() - 36000000),
        resolution: '调整中微子 opacity 参数，已重新计算',
        status: 'resolved'
      }
    ],
    adjustments: [
      {
        id: 'adj-001',
        taskId: 'task-004',
        warningId: 'warn-002',
        type: 'equation_of_state',
        parameter: 'neutrino_opacity',
        oldValue: '1.0',
        newValue: '1.2',
        reason: '中微之光度异常，需要增加不透明度',
        adjustedBy: 'user-003',
        adjustedAt: new Date(Date.now() - 36000000),
        restartCount: 1
      }
    ],
    approvalStatus: ApprovalStatus.POSTDOC_PENDING,
    approvalHistory: [],
    ni56Yield: 0.075,
    ge68Yield: 0.0023
  },
  {
    id: 'task-005',
    name: '30M☉ 大质量星核心塌缩',
    parameters: {
      mass: 30.0,
      metallicity: 0.01,
      rotationVelocity: 200.0,
      equationOfState: 'TM1',
      reactionNetwork: 'r-process-network'
    },
    status: SimulationStatus.COMPLETED,
    progress: 100,
    priority: 'high',
    createdAt: new Date(Date.now() - 432000000),
    startedAt: new Date(Date.now() - 36000000),
    completedAt: new Date(Date.now() - 7200000),
    createdBy: 'user-003',
    assignedTo: ['user-002', 'user-003'],
    currentStage: '计算完成',
    stageTimeline: createStageTimeline(SimulationStatus.COMPLETED),
    warnings: [],
    adjustments: [],
    approvalStatus: ApprovalStatus.PROFESSOR_APPROVED,
    approvalHistory: [
      {
        id: 'appr-001',
        taskId: 'task-005',
        level: 'postdoc',
        approver: 'user-001',
        status: 'approved',
        comments: '激波动力学演化正常，能量守恒误差在允许范围内',
        approvedAt: new Date(Date.now() - 14400000),
        shockDynamicsVerification: {
          shockVelocityValid: true,
          radiusEvolutionValid: true,
          energyConservationValid: true,
          comments: '激波速度峰值 3.5e9 cm/s，半径演化符合预期'
        }
      },
      {
        id: 'appr-002',
        taskId: 'task-005',
        level: 'professor',
        approver: 'user-002',
        status: 'approved',
        comments: '镍-56产额与观测数据匹配良好，丰度分布合理',
        approvedAt: new Date(Date.now() - 7200000),
        shockDynamicsVerification: {
          shockVelocityValid: true,
          radiusEvolutionValid: true,
          energyConservationValid: true,
          comments: '确认激波动力学结果可靠'
        },
        nucleosynthesisAssessment: {
          ni56YieldValid: true,
          abundanceDistributionValid: true,
          observationMatch: 92,
          comments: '与SN 1987A观测数据匹配度良好'
        }
      }
    ],
    ni56Yield: 0.082,
    ge68Yield: 0.0031
  },
  {
    id: 'task-006',
    name: '18M☉ 中等金属丰度模拟',
    parameters: {
      mass: 18.0,
      metallicity: -0.5,
      rotationVelocity: 150.0,
      equationOfState: 'LS220',
      reactionNetwork: 'alpha-network'
    },
    status: SimulationStatus.ABNORMAL_FALLBACK,
    progress: 55,
    priority: 'medium',
    createdAt: new Date(Date.now() - 518400000),
    startedAt: new Date(Date.now() - 43200000),
    completedAt: null,
    createdBy: 'user-001',
    assignedTo: ['user-001', 'user-003'],
    currentStage: '异常回退处理',
    stageTimeline: createStageTimeline(SimulationStatus.ABNORMAL_FALLBACK),
    warnings: [
      {
        id: 'warn-003',
        taskId: 'task-006',
        type: 'convergence_issue',
        severity: 'critical',
        message: '核网络收敛失败',
        timestamp: new Date(Date.now() - 36000000),
        data: {
          convergenceRate: 0.82
        },
        reviewedBy: null,
        reviewedAt: null,
        resolution: null,
        status: 'pending'
      }
    ],
    adjustments: [],
    approvalStatus: ApprovalStatus.NOT_SUBMITTED,
    approvalHistory: [],
    ni56Yield: undefined,
    ge68Yield: undefined
  },
  {
    id: 'task-007',
    name: '22M☉ 高速旋转超新星',
    parameters: {
      mass: 22.0,
      metallicity: 0.0,
      rotationVelocity: 400.0,
      equationOfState: 'SFHo',
      reactionNetwork: 'full-network'
    },
    status: SimulationStatus.COMPLETED,
    progress: 100,
    priority: 'high',
    createdAt: new Date(Date.now() - 604800000),
    startedAt: new Date(Date.now() - 540000000),
    completedAt: new Date(Date.now() - 172800000),
    createdBy: 'user-003',
    assignedTo: ['user-002', 'user-003'],
    currentStage: '计算完成',
    stageTimeline: createStageTimeline(SimulationStatus.COMPLETED),
    warnings: [],
    adjustments: [],
    approvalStatus: ApprovalStatus.POSTDOC_APPROVED,
    approvalHistory: [
      {
        id: 'appr-003',
        taskId: 'task-007',
        level: 'postdoc',
        approver: 'user-001',
        status: 'approved',
        comments: '激波动力学验证通过，快速旋转效应明显',
        approvedAt: new Date(Date.now() - 86400000),
        shockDynamicsVerification: {
          shockVelocityValid: true,
          radiusEvolutionValid: true,
          energyConservationValid: true,
          comments: '旋转导致的极向喷流现象明显'
        }
      }
    ],
    ni56Yield: 0.091,
    ge68Yield: 0.0028
  },
  {
    id: 'task-008',
    name: '10M☉ 小质量超新星模拟',
    parameters: {
      mass: 10.0,
      metallicity: -1.5,
      rotationVelocity: 0.0,
      equationOfState: 'DD2',
      reactionNetwork: 'alpha-network'
    },
    status: SimulationStatus.GRID_GENERATION,
    progress: 15,
    priority: 'low',
    createdAt: new Date(Date.now() - 7200000),
    startedAt: new Date(Date.now() - 3600000),
    completedAt: null,
    createdBy: 'user-001',
    assignedTo: ['user-001'],
    currentStage: '三维流体网格生成',
    stageTimeline: createStageTimeline(SimulationStatus.GRID_GENERATION),
    warnings: [],
    adjustments: [],
    approvalStatus: ApprovalStatus.NOT_SUBMITTED,
    approvalHistory: [],
    ni56Yield: undefined,
    ge68Yield: undefined
  }
];

export const generateMonitoringData = (taskId: string, count: number = 100): MonitoringDataPoint[] => {
  const data: MonitoringDataPoint[] = [];
  let shockRadius = 10;
  let ni56Mass = 0;
  let ge68Mass = 0;
  
  for (let i = 0; i < count; i++) {
    const timestamp = i * 10;
    const t = i / count;
    
    shockRadius = 10 + Math.pow(t, 0.3) * 200 + (Math.random() - 0.5) * 10;
    if (t > 0.3 && Math.random() > 0.7) shockRadius += Math.random() * 5;
    
    const nu_e = 2e52 * Math.exp(-t * 2) + (Math.random() - 0.5) * 1e51;
    const nu_ebar = 1.5e52 * Math.exp(-t * 1.8) + (Math.random() - 0.5) * 8e50;
    const nu_x = 3e52 * Math.exp(-t * 1.5) + (Math.random() - 0.5) * 1.2e51;
    
    if (t > 0.5) {
      ni56Mass += Math.random() * 0.001 * Math.exp(-Math.pow((t - 0.7) * 5, 2));
      ge68Mass += Math.random() * 0.00003 * Math.exp(-Math.pow((t - 0.6) * 6, 2));
    }
    
    data.push({
      timestamp,
      shockRadius,
      shockVelocity: 1e9 * Math.exp(-t * 1.5) + 1e8,
      nu_e_luminosity: Math.max(1e50, nu_e),
      nu_ebar_luminosity: Math.max(1e50, nu_ebar),
      nu_x_luminosity: Math.max(1e50, nu_x),
      ni56_mass: ni56Mass,
      ge68_mass: ge68Mass,
      totalEnergy: 1e51 * (1 + t * 0.5),
      entropy: 10 + t * 20 + (Math.random() - 0.5) * 2
    });
  }
  
  return data;
};

export const generateNuclideData = (taskId: string): NuclideAbundance[] => {
  const nuclides = [
    { name: 'H-1', A: 1, Z: 1 },
    { name: 'He-4', A: 4, Z: 2 },
    { name: 'C-12', A: 12, Z: 6 },
    { name: 'O-16', A: 16, Z: 8 },
    { name: 'Ne-20', A: 20, Z: 10 },
    { name: 'Mg-24', A: 24, Z: 12 },
    { name: 'Si-28', A: 28, Z: 14 },
    { name: 'S-32', A: 32, Z: 16 },
    { name: 'Ar-36', A: 36, Z: 18 },
    { name: 'Ca-40', A: 40, Z: 20 },
    { name: 'Ti-44', A: 44, Z: 22 },
    { name: 'Fe-56', A: 56, Z: 26 },
    { name: 'Ni-56', A: 56, Z: 28 },
    { name: 'Ni-58', A: 58, Z: 28 },
    { name: 'Ge-68', A: 68, Z: 32 },
    { name: 'Zn-65', A: 65, Z: 30 }
  ];
  
  return nuclides.map((nuc, index) => ({
    id: `nuclide-${generateId()}`,
    taskId,
    nuclide: nuc.name,
    massNumber: nuc.A,
    atomicNumber: nuc.Z,
    massFraction: Math.pow(10, -index * 0.8 - 2) * (0.5 + Math.random() * 0.5),
    numberFraction: Math.pow(10, -index * 0.8 - 2) * (0.5 + Math.random() * 0.5) / nuc.A,
    productionRate: Math.pow(10, -index * 0.5 - 10) * (0.8 + Math.random() * 0.4),
    timestamp: 1000
  }));
};

export const mockWarnings: Warning[] = [
  ...mockTasks.flatMap(t => t.warnings),
  {
    id: 'warn-004',
    taskId: 'task-001',
    type: 'ni56_deviation',
    severity: 'warning',
    message: '同一前身星镍-56产额连续偏差超过20%',
    timestamp: new Date(Date.now() - 900000),
    data: {
      ni56Yield: 0.095,
      deviation: 25.3
    },
    reviewedBy: null,
    reviewedAt: null,
    resolution: null,
    status: 'pending'
  }
];

export const mockReports: SimulationReport[] = [
  {
    id: 'report-001',
    taskId: 'task-005',
    generatedAt: new Date(Date.now() - 3600000),
    generatedBy: 'user-001',
    sections: [
      { type: 'summary', title: '模拟摘要', data: {} },
      { type: 'shock_animation', title: '激波传播动画', data: {} },
      { type: 'abundance_distribution', title: '元素丰度分布', data: {} },
      { type: 'light_curve', title: '光变曲线', data: {} },
      { type: 'neutrino_spectrum', title: '中微子信号频谱', data: {} }
    ],
    status: 'completed',
    downloadUrl: '/reports/sn-30m-report.pdf'
  },
  {
    id: 'report-002',
    taskId: 'task-004',
    generatedAt: new Date(Date.now() - 7200000),
    generatedBy: 'user-001',
    sections: [
      { type: 'summary', title: '模拟摘要', data: {} },
      { type: 'shock_animation', title: '激波传播动画', data: {} },
      { type: 'abundance_distribution', title: '元素丰度分布', data: {} }
    ],
    status: 'completed',
    downloadUrl: '/reports/sn-12m-report.pdf'
  }
];

export const mockExports: ExportTask[] = [
  {
    id: 'export-001',
    taskId: 'task-005',
    exportType: 'all',
    progenitorType: '25M☉',
    reactionNetworkVersion: 'r-process-network v1.5',
    timeWindow: { start: 0, end: 1000 },
    format: 'csv',
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000),
    downloadUrl: '/exports/sn-30m-all-data.csv'
  },
  {
    id: 'export-002',
    taskId: 'task-004',
    exportType: 'nucleosynthesis',
    progenitorType: '12M☉',
    reactionNetworkVersion: 'full-network v2.1',
    timeWindow: { start: 100, end: 500 },
    format: 'fits',
    status: 'processing',
    createdAt: new Date(Date.now() - 3600000),
    downloadUrl: ''
  }
];

export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-001',
    progenitorType: '15-20M☉',
    targetObservations: ['SN 1987A', 'SN 2011fe'],
    recommendedEquationOfState: 'LS220 v2.0',
    recommendedReactionRates: 'alpha-network v4.0',
    matchScore: 92,
    confidence: 0.87,
    supportingSimulations: ['task-004', 'task-005'],
    generatedAt: new Date(Date.now() - 172800000)
  },
  {
    id: 'rec-002',
    progenitorType: '25-30M☉',
    targetObservations: ['SN 1998bw', 'GRB 030329'],
    recommendedEquationOfState: 'SFHo v1.3',
    recommendedReactionRates: 'full-network v2.1',
    matchScore: 88,
    confidence: 0.82,
    supportingSimulations: ['task-005', 'task-007'],
    generatedAt: new Date(Date.now() - 259200000)
  },
  {
    id: 'rec-003',
    progenitorType: '10-15M☉',
    targetObservations: ['SN 2005cs'],
    recommendedEquationOfState: 'DD2 v3.1',
    recommendedReactionRates: 'alpha-network v4.0',
    matchScore: 85,
    confidence: 0.78,
    supportingSimulations: ['task-008'],
    generatedAt: new Date(Date.now() - 345600000)
  },
  {
    id: 'rec-004',
    progenitorType: '快速旋转 (>300km/s)',
    targetObservations: ['GRB 080916C'],
    recommendedEquationOfState: 'TM1 v2.5',
    recommendedReactionRates: 'r-process-network v1.5',
    matchScore: 79,
    confidence: 0.71,
    supportingSimulations: ['task-007'],
    generatedAt: new Date(Date.now() - 432000000)
  },
  {
    id: 'rec-005',
    progenitorType: '低金属丰度 ([Fe/H] < -1.0)',
    targetObservations: ['SN 2007bi'],
    recommendedEquationOfState: 'SFHo v1.3',
    recommendedReactionRates: 'full-network v2.1',
    matchScore: 83,
    confidence: 0.75,
    supportingSimulations: ['task-003', 'task-006'],
    generatedAt: new Date(Date.now() - 518400000)
  }
];

export const generateDailyStats = (days: number = 30): DailyStatistics[] => {
  const stats: DailyStatistics[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const base = 1 - i / days * 0.3;
    
    stats.push({
      date: date.toISOString().split('T')[0],
      totalTasks: Math.floor(3 + Math.random() * 5),
      completedTasks: Math.floor((2 + Math.random() * 4) * base),
      completionRate: 0.65 + Math.random() * 0.3 * base,
      shockRecoverySuccessRate: 0.7 + Math.random() * 0.25 * base,
      networkConvergenceCount: Math.floor(2 + Math.random() * 4 * base),
      avgSimulationTime: 180 + Math.random() * 120,
      warningsCount: Math.floor(1 + Math.random() * 4),
      criticalWarningsCount: Math.floor(Math.random() * 2)
    });
  }
  
  return stats;
};

export const mockPerformanceMetrics: PerformanceMetrics[] = [
  {
    accuracy: 92,
    speed: 78,
    stability: 85,
    convergence: 88,
    resourceUtilization: 72
  },
  {
    accuracy: 88,
    speed: 85,
    stability: 82,
    convergence: 90,
    resourceUtilization: 68
  },
  {
    accuracy: 95,
    speed: 72,
    stability: 88,
    convergence: 85,
    resourceUtilization: 75
  }
];

export const mockLightCurveData = () => {
  const bands = ['U', 'B', 'V', 'R', 'I'];
  const data: { time: number; magnitude: number; band: string }[] = [];
  
  bands.forEach(band => {
    const baseMag = 10 + bands.indexOf(band) * 0.5;
    for (let t = 0; t < 100; t += 1) {
      const phase = t / 100;
      const magnitude = baseMag - 2 * Math.exp(-Math.pow((phase - 0.1) * 10, 2)) 
        + 1.5 * Math.exp(-phase * 2) 
        + (Math.random() - 0.5) * 0.3;
      data.push({ time: t, magnitude, band });
    }
  });
  
  return data;
};

export const mockNeutrinoSpectrum = () => {
  const flavors = ['ν_e', 'ν̄_e', 'ν_x'];
  const data: { energy: number; flux: number; flavor: string }[] = [];
  
  flavors.forEach(flavor => {
    const meanE = flavor === 'ν_e' ? 10 : flavor === 'ν̄_e' ? 15 : 25;
    for (let e = 0; e <= 80; e += 1) {
      const flux = Math.exp(-e / meanE) * Math.pow(e / meanE, 2) * (1 + 0.1 * Math.random());
      data.push({ energy: e, flux, flavor });
    }
  });
  
  return data;
};
