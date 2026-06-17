import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Rocket, PlayCircle, CheckCircle2, AlertTriangle, Plus,
  ArrowUpRight, ArrowDownRight, Flame, Atom, Wind, Clock,
  AlertCircle, Info, XCircle
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SimulationStatus, SimulationTask, Warning, ApprovalStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusMap: Record<SimulationStatus, { label: string; cls: string }> = {
  [SimulationStatus.PENDING_VALIDATION]: { label: '待验证', cls: 'status-pending' },
  [SimulationStatus.GRID_GENERATION]: { label: '网格生成', cls: 'status-running' },
  [SimulationStatus.COLLAPSE_PHASE]: { label: '塌缩阶段', cls: 'status-running' },
  [SimulationStatus.SHOCK_BOUNCE]: { label: '激波反弹', cls: 'status-warning' },
  [SimulationStatus.NUCLEOSYNTHESIS]: { label: '核合成', cls: 'status-running' },
  [SimulationStatus.COMPLETED]: { label: '已完成', cls: 'status-completed' },
  [SimulationStatus.ABNORMAL_FALLBACK]: { label: '异常回退', cls: 'status-error' },
  [SimulationStatus.PAUSED]: { label: '已暂停', cls: 'status-pending' },
  [SimulationStatus.CANCELLED]: { label: '已取消', cls: 'status-error' }
};

const priorityMap = { high: ['高', 'text-supernova-400'], medium: ['中', 'text-germanium-400'], low: ['低', 'text-nickel-400'] };
const severityIcon = { critical: <XCircle className="w-4 h-4 text-red-400" />, warning: <AlertTriangle className="w-4 h-4 text-supernova-400" />, info: <Info className="w-4 h-4 text-space-400" /> };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Dashboard() {
  const { tasks, warnings, addTask } = useStore();
  const [mass, setMass] = useState('15');
  const [metallicity, setMetallicity] = useState('0');
  const [rotation, setRotation] = useState('0');

  const totalTasks = tasks.length;
  const todayNew = tasks.filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString()).length;
  const runningCount = tasks.filter(t => ![SimulationStatus.COMPLETED, SimulationStatus.CANCELLED, SimulationStatus.PAUSED].includes(t.status)).length;
  const runningPercent = totalTasks > 0 ? Math.round((runningCount / totalTasks) * 100) : 0;
  const completionRate = totalTasks > 0 ? Math.round((tasks.filter(t => t.status === SimulationStatus.COMPLETED).length / totalTasks) * 100) : 0;
  const pendingWarnings = warnings.filter(w => w.status === 'pending');
  const criticalCount = pendingWarnings.filter(w => w.severity === 'critical').length;
  const recentTasks = [...tasks].slice(0, 5);

  const handleCreateTask = () => {
    const newTask: SimulationTask = {
      id: `task-${Date.now()}`,
      name: `${mass}M☉ 超新星模拟`,
      parameters: { mass: parseFloat(mass), metallicity: parseFloat(metallicity), rotationVelocity: parseFloat(rotation), equationOfState: 'LS220', reactionNetwork: 'alpha-network' },
      status: SimulationStatus.PENDING_VALIDATION,
      progress: 0,
      priority: 'medium',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      createdBy: 'user-001',
      assignedTo: ['user-001'],
      currentStage: '待验证',
      stageTimeline: [],
      warnings: [],
      adjustments: [],
      approvalStatus: ApprovalStatus.NOT_SUBMITTED,
      approvalHistory: []
    };
    addTask(newTask);
    setMass('15');
    setMetallicity('0');
    setRotation('0');
  };

  const statCards = [
    { title: '任务总数', value: totalTasks, sub: `+${todayNew} 今日`, icon: Rocket, color: 'from-space-500 to-neutrino-500', glow: 'shadow-glow-blue' },
    { title: '运行中任务', value: runningCount, sub: `${runningPercent}% 占比`, icon: PlayCircle, color: 'from-neutrino-500 to-supernova-500', glow: 'shadow-glow-purple' },
    { title: '完成率', value: `${completionRate}%`, sub: completionRate >= 70 ? '↑ 较昨日 +5%' : '↓ 较昨日 -3%', icon: CheckCircle2, color: 'from-nickel-500 to-space-500', glow: 'shadow-glow-green', trend: completionRate >= 70 ? 'up' : 'down' },
    { title: '待处理预警', value: pendingWarnings.length, sub: `${criticalCount} 个严重`, icon: AlertTriangle, color: 'from-supernova-500 to-red-500', glow: 'shadow-glow-orange' }
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6">
        <motion.div variants={item} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-space-50 glow-text">超新星模拟控制中心</h1>
          <p className="text-space-300 mt-2">实时监控模拟任务，探索宇宙奥秘</p>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => (
            <motion.div key={idx} whileHover={{ y: -4 }} className={cn('card-glow p-5 relative overflow-hidden', card.glow)}>
              <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', card.color)} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-space-300 text-sm">{card.title}</p>
                  <p className="text-3xl font-mono font-bold text-white mt-2">{card.value}</p>
                  <div className="flex items-center mt-1 text-sm">
                    {card.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-nickel-400" />}
                    {card.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-supernova-400" />}
                    <span className={cn(card.trend === 'up' ? 'text-nickel-400' : card.trend === 'down' ? 'text-supernova-400' : 'text-space-400')}>{card.sub}</span>
                  </div>
                </div>
                <div className={cn('p-3 rounded-xl bg-gradient-to-br opacity-90', card.color)}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={item} className="card p-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Plus className="w-5 h-5 text-space-400" />快速创建任务</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-space-300 text-sm mb-2"><Flame className="w-4 h-4 text-supernova-400" />前身星质量 (M☉)</label>
                <input type="number" value={mass} onChange={(e) => setMass(e.target.value)} className="input-field font-mono" step="0.1" min="1" max="100" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-space-300 text-sm mb-2"><Atom className="w-4 h-4 text-neutrino-400" />金属丰度 ([Fe/H])</label>
                <input type="number" value={metallicity} onChange={(e) => setMetallicity(e.target.value)} className="input-field font-mono" step="0.1" min="-5" max="2" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-space-300 text-sm mb-2"><Wind className="w-4 h-4 text-nickel-400" />旋转速度 (km/s)</label>
                <input type="number" value={rotation} onChange={(e) => setRotation(e.target.value)} className="input-field font-mono" step="10" min="0" max="1000" />
              </div>
              <button onClick={handleCreateTask} className="w-full btn-primary flex items-center justify-center gap-2"><Rocket className="w-4 h-4" />启动模拟</button>
            </div>
          </motion.div>

          <motion.div variants={item} className="lg:col-span-2 card p-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-space-400" />最近任务</h2>
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <motion.div key={task.id} whileHover={{ x: 4 }} className="p-3 rounded-lg bg-space-900/50 border border-space-700/30 hover:border-space-600/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium truncate flex-1 mr-3">{task.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn('status-badge', statusMap[task.status].cls)}>{statusMap[task.status].label}</span>
                      <span className={cn('text-xs font-medium', priorityMap[task.priority][1])}>{priorityMap[task.priority][0]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 progress-bar"><div className="progress-fill" style={{ width: `${task.progress}%` }} /></div>
                    <span className="text-space-400 font-mono text-sm w-12 text-right">{task.progress}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={item} className="card p-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-supernova-400" />预警提醒
            {pendingWarnings.length > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">{pendingWarnings.length}</span>}
          </h2>
          {pendingWarnings.length === 0 ? (
            <div className="text-center py-8 text-space-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-nickel-500 opacity-50" />
              <p>暂无待处理预警</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingWarnings.map((warning: Warning) => (
                <div key={warning.id} className={cn('p-4 rounded-lg severity-' + warning.severity)}>
                  <div className="flex items-start gap-3">
                    {severityIcon[warning.severity]}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{warning.message}</p>
                      <p className="text-space-400 text-sm mt-1">任务: {tasks.find(t => t.id === warning.taskId)?.name}</p>
                      <p className="text-space-500 text-xs mt-1">{new Date(warning.timestamp).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
