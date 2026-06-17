import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, SortAsc, Play, Pause, RotateCcw, Eye, ChevronLeft, ChevronRight, Flame, Atom, Wind, Database, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SimulationStatus, SimulationTask } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: SimulationStatus.PENDING_VALIDATION, label: '待校验' },
  { value: SimulationStatus.GRID_GENERATION, label: '网格生成' },
  { value: SimulationStatus.COLLAPSE_PHASE, label: '塌缩阶段' },
  { value: SimulationStatus.SHOCK_BOUNCE, label: '反弹激波' },
  { value: SimulationStatus.NUCLEOSYNTHESIS, label: '核合成' },
  { value: SimulationStatus.COMPLETED, label: '已完成' },
  { value: SimulationStatus.ABNORMAL_FALLBACK, label: '异常' },
];

const priorityOptions = [
  { value: 'all', label: '全部' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'progress', label: '进度' },
  { value: 'priority', label: '优先级' },
];

const statusMap: Record<SimulationStatus, { label: string; cls: string }> = {
  [SimulationStatus.PENDING_VALIDATION]: { label: '待校验', cls: 'status-pending' },
  [SimulationStatus.GRID_GENERATION]: { label: '网格生成', cls: 'status-running' },
  [SimulationStatus.COLLAPSE_PHASE]: { label: '塌缩阶段', cls: 'status-running' },
  [SimulationStatus.SHOCK_BOUNCE]: { label: '反弹激波', cls: 'status-warning' },
  [SimulationStatus.NUCLEOSYNTHESIS]: { label: '核合成', cls: 'status-running' },
  [SimulationStatus.COMPLETED]: { label: '已完成', cls: 'status-completed' },
  [SimulationStatus.ABNORMAL_FALLBACK]: { label: '异常', cls: 'status-error' },
  [SimulationStatus.PAUSED]: { label: '已暂停', cls: 'status-pending' },
  [SimulationStatus.CANCELLED]: { label: '已取消', cls: 'status-error' },
};

const priorityMap: Record<string, [string, string]> = {
  high: ['高', 'bg-red-500/20 text-red-400 border-red-500/50'],
  medium: ['中', 'bg-supernova-500/20 text-supernova-400 border-supernova-500/50'],
  low: ['低', 'bg-space-500/20 text-space-300 border-space-500/50'],
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function TaskList() {
  const { tasks, updateTaskStatus } = useStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    if (searchQuery) result = result.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    result.sort((a, b) => {
      if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      return 0;
    });
    return result;
  }, [tasks, statusFilter, priorityFilter, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTogglePause = (task: SimulationTask) => {
    if (task.status === SimulationStatus.PAUSED) {
      updateTaskStatus(task.id, SimulationStatus.COLLAPSE_PHASE);
    } else if (task.status !== SimulationStatus.COMPLETED && task.status !== SimulationStatus.CANCELLED) {
      updateTaskStatus(task.id, SimulationStatus.PAUSED);
    }
  };

  const handleRestart = (taskId: string) => {
    updateTaskStatus(taskId, SimulationStatus.GRID_GENERATION);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item}>
            <h1 className="text-3xl font-display font-bold text-space-50 glow-text">任务管理中心</h1>
            <p className="text-space-300 mt-2">管理和监控所有超新星模拟任务</p>
          </motion.div>

          <motion.div variants={item} className="card p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-space-400" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-sm py-1.5 w-32">
                  {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input-field text-sm py-1.5 w-24">
                {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <SortAsc className="w-4 h-4 text-space-400" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field text-sm py-1.5 w-32">
                  {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="w-4 h-4 text-space-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索任务名称..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-9 text-sm py-1.5"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="text-space-300 text-sm">
            共 {filteredTasks.length} 个任务
          </motion.div>

          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedTasks.map((task, idx) => (
              <motion.div
                key={task.id}
                variants={item}
                whileHover={{ y: -4, scale: 1.01 }}
                className="card p-5 group hover:shadow-glow-blue hover:border-space-400/50 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate group-hover:text-space-100 transition-colors">{task.name}</h3>
                    <p className="text-space-400 text-xs font-mono mt-1">{task.id}</p>
                  </div>
                  <span className={cn('status-badge ml-2 flex-shrink-0', statusMap[task.status].cls)}>
                    {statusMap[task.status].label}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', priorityMap[task.priority][1])}>
                    {priorityMap[task.priority][0]}优先级
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-space-300">
                    <Flame className="w-4 h-4 text-supernova-400" />
                    <span>质量: <span className="font-mono text-white">{task.parameters.mass}M☉</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-space-300">
                    <Atom className="w-4 h-4 text-neutrino-400" />
                    <span>金属丰度: <span className="font-mono text-white">{task.parameters.metallicity}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-space-300">
                    <Wind className="w-4 h-4 text-nickel-400" />
                    <span>旋转: <span className="font-mono text-white">{task.parameters.rotationVelocity}km/s</span></span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-germanium-500/15 text-germanium-400 border border-germanium-500/30">
                    <Database className="w-3 h-3" />
                    {task.parameters.equationOfState}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-neutrino-500/15 text-neutrino-400 border border-neutrino-500/30">
                    <Zap className="w-3 h-3" />
                    {task.parameters.reactionNetwork}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-space-300">进度</span>
                    <span className="font-mono text-white">{task.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>

                <div className="text-xs text-space-400 mb-4">
                  创建于 {format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1">
                    <Eye className="w-3.5 h-3.5" />详情
                  </button>
                  <button
                    onClick={() => handleTogglePause(task)}
                    disabled={task.status === SimulationStatus.COMPLETED || task.status === SimulationStatus.CANCELLED}
                    className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {task.status === SimulationStatus.PAUSED ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {task.status === SimulationStatus.PAUSED ? '继续' : '暂停'}
                  </button>
                  <button
                    onClick={() => handleRestart(task.id)}
                    className="btn-warning text-xs py-1.5 px-3 flex items-center justify-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {totalPages > 1 && (
            <motion.div variants={item} className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                    currentPage === page
                      ? 'bg-space-600 text-white shadow-glow-blue'
                      : 'bg-space-800/60 text-space-300 hover:bg-space-700 border border-space-700/50'
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
