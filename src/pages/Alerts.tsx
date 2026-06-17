import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, XCircle, Info, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertOctagon, Atom, Zap, Target,
  RotateCcw, Eye, EyeOff, CheckSquare, Square
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Warning, WarningSeverity, WarningType, WarningStatus } from '@/types';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: { icon: XCircle, border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400', label: '严重' },
  warning: { icon: AlertTriangle, border: 'border-supernova-500', bg: 'bg-supernova-500/10', text: 'text-supernova-400', label: '警告' },
  info: { icon: Info, border: 'border-space-500', bg: 'bg-space-500/10', text: 'text-space-400', label: '信息' }
};

const typeConfig: Record<WarningType, { icon: any; label: string }> = {
  shock_stagnation: { icon: Zap, label: '激波停滞' },
  neutrino_anomaly: { icon: Atom, label: '中微子异常' },
  ni56_deviation: { icon: Target, label: '镍-56偏差' },
  convergence_issue: { icon: AlertOctagon, label: '收敛问题' }
};

const statusConfig: Record<WarningStatus, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-space-700 text-space-300' },
  reviewed: { label: '已复核', className: 'bg-neutrino-600/20 text-neutrino-400 border border-neutrino-500/50' },
  resolved: { label: '已解决', className: 'bg-nickel-600/20 text-nickel-400 border border-nickel-500/50' }
};

export default function Alerts() {
  const { warnings, tasks, updateWarning, currentUser, reRunSimulationWithAdjustments } = useStore();
  const [severityFilter, setSeverityFilter] = useState<'all' | WarningSeverity>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | WarningType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | WarningStatus>('all');
  const [timeRange, setTimeRange] = useState<[string, string]>(['', '']);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolution, setResolution] = useState<string>('');
  const [handlingMethod, setHandlingMethod] = useState<string>('');
  const [eosParam, setEosParam] = useState<string>('');
  const [reactionParam, setReactionParam] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'equation_of_state' | 'reaction_rate' | ''>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const filtered = useMemo(() => warnings.filter(w => 
    (severityFilter === 'all' || w.severity === severityFilter) &&
    (typeFilter === 'all' || w.type === typeFilter) &&
    (statusFilter === 'all' || w.status === statusFilter) &&
    (!timeRange[0] || new Date(w.timestamp) >= new Date(timeRange[0])) &&
    (!timeRange[1] || new Date(w.timestamp) <= new Date(timeRange[1]))
  ), [warnings, severityFilter, typeFilter, statusFilter, timeRange]);

  const grouped = useMemo(() => {
    const g: Record<WarningSeverity, Warning[]> = { critical: [], warning: [], info: [] };
    filtered.forEach(w => g[w.severity].push(w));
    return g;
  }, [filtered]);

  const stats = useMemo(() => ({
    critical: warnings.filter(w => w.severity === 'critical').length,
    warning: warnings.filter(w => w.severity === 'warning').length,
    info: warnings.filter(w => w.severity === 'info').length
  }), [warnings]);

  const allSelected = filtered.length > 0 && filtered.every(w => selectedIds.includes(w.id));
  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : filtered.map(w => w.id));
  const getTaskName = (id: string) => tasks.find(t => t.id === id)?.name || id;

  const handleMarkReviewed = (id: string) => {
    updateWarning(id, { status: 'reviewed', reviewedBy: currentUser?.id || null, reviewedAt: new Date(), resolution });
    setExpandedId(null); setResolution('');
  };

  const handleBatchReview = () => {
    selectedIds.forEach(id => updateWarning(id, { status: 'reviewed', reviewedBy: currentUser?.id || null, reviewedAt: new Date() }));
    setSelectedIds([]);
  };

  const handleBatchIgnore = () => {
    selectedIds.forEach(id => updateWarning(id, { status: 'resolved', resolution: '已忽略' }));
    setSelectedIds([]);
  };

  const handleAdjustAndRerun = (warningId: string) => {
    const warning = warnings.find(w => w.id === warningId);
    if (!warning || !adjustmentType || !adjustmentReason) return;

    const task = tasks.find(t => t.id === warning.taskId);
    if (!task) return;

    let parameter = '';
    let oldValue = '';
    let newValue = '';

    if (adjustmentType === 'equation_of_state') {
      if (!eosParam) return;
      parameter = 'equationOfState';
      oldValue = task.parameters.equationOfState;
      newValue = eosParam;
    } else if (adjustmentType === 'reaction_rate') {
      if (!reactionParam) return;
      parameter = 'reactionNetwork';
      oldValue = task.parameters.reactionNetwork;
      newValue = reactionParam;
    }

    reRunSimulationWithAdjustments(warning.taskId, warningId, {
      type: adjustmentType,
      parameter,
      oldValue,
      newValue,
      reason: adjustmentReason
    });

    setExpandedId(null);
    setAdjustmentType('');
    setAdjustmentReason('');
    setEosParam('');
    setReactionParam('');
  };

  const handleIgnore = (id: string) => {
    updateWarning(id, { status: 'resolved', resolution: '已忽略' });
    setExpandedId(null);
  };

  const renderWarningCard = (w: Warning) => {
    const cfg = severityConfig[w.severity];
    const TypeIcon = typeConfig[w.type].icon;
    const isExpanded = expandedId === w.id;
    const isSelected = selectedIds.includes(w.id);
    const task = tasks.find(t => t.id === w.taskId);
    const warningAdjustments = task?.adjustments.filter(a => a.warningId === w.id) || [];
    const DataItem = ({ label, value, unit = '', isWarning = false }: any) => value !== undefined && (
      <div className="p-3 bg-space-900/50 rounded-lg">
        <p className="text-space-400 text-xs">{label}</p>
        <p className={cn('font-mono', isWarning ? 'text-supernova-400' : 'text-white')}>{value}{unit}</p>
      </div>
    );

    return (
      <motion.div key={w.id} layout className={cn('rounded-xl border-2', cfg.border, cfg.bg, 'mb-3 overflow-hidden')}>
        <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : w.id)}>
          <div className="flex items-start gap-3">
            <div onClick={e => { e.stopPropagation(); toggleSelect(w.id); }} className="mt-1">
              {isSelected ? <CheckSquare className="w-5 h-5 text-space-400" /> : <Square className="w-5 h-5 text-space-600 hover:text-space-400" />}
            </div>
            <div className="p-2 rounded-lg bg-space-900/50"><TypeIcon className={cn('w-5 h-5', cfg.text)} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-white">{typeConfig[w.type].label}</h4>
                <span className={cn('status-badge', statusConfig[w.status].className)}>{statusConfig[w.status].label}</span>
              </div>
              <p className="text-space-300 text-sm mt-1">{w.message}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-space-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(w.timestamp).toLocaleString('zh-CN')}</span>
                <span className="truncate">任务: {getTaskName(w.taskId)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <cfg.icon className={cn('w-5 h-5', cfg.text)} />
              {isExpanded ? <ChevronUp className="w-5 h-5 text-space-400" /> : <ChevronDown className="w-5 h-5 text-space-400" />}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="border-t border-space-700/50">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DataItem label="激波半径" value={w.data.shockRadius} unit=" km" />
                  <DataItem label="临界阈值" value={w.data.criticalThreshold} unit=" km" />
                  <DataItem label="停滞时间" value={w.data.stagnationTime} unit=" ms" />
                  <DataItem label="中微子能量" value={w.data.neutrinoEnergy} unit=" MeV" />
                  <DataItem label="Ni-56产额" value={w.data.ni56Yield} unit=" M☉" />
                  <DataItem label="偏差率" value={w.data.deviation} unit="%" isWarning />
                  <DataItem label="收敛速率" value={w.data.convergenceRate} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-space-300">处理方式</label>
                    <select value={handlingMethod} onChange={e => setHandlingMethod(e.target.value)} className="input-field">
                      <option value="">请选择</option>
                      <option value="adjust_params">调整参数重新模拟</option>
                      <option value="accept">接受偏差继续计算</option>
                      <option value="escalate">上报上级审核</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-space-300">复核备注</label>
                    <input type="text" value={resolution} onChange={e => setResolution(e.target.value)} className="input-field" placeholder="请输入备注..." />
                  </div>
                </div>
                <div className="border border-space-700 rounded-lg p-4 space-y-4 bg-space-900/30">
                  <h5 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-supernova-400" />
                    预警复核与参数调整
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-space-300">调整类型</label>
                      <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value as any)} className="input-field">
                        <option value="">请选择调整类型</option>
                        <option value="equation_of_state">状态方程调整</option>
                        <option value="reaction_rate">核反应网络调整</option>
                      </select>
                    </div>
                    {adjustmentType === 'equation_of_state' && (
                      <div className="space-y-2">
                        <label className="text-sm text-space-300">状态方程参数</label>
                        <select value={eosParam} onChange={e => setEosParam(e.target.value)} className="input-field">
                          <option value="">请选择</option>
                          <option value="LS220">LS220</option>
                          <option value="SFHo">SFHo</option>
                          <option value="DD2">DD2</option>
                          <option value="TM1">TM1</option>
                        </select>
                        {task && (
                          <p className="text-xs text-space-500">当前值: {task.parameters.equationOfState}</p>
                        )}
                      </div>
                    )}
                    {adjustmentType === 'reaction_rate' && (
                      <div className="space-y-2">
                        <label className="text-sm text-space-300">核反应网络</label>
                        <select value={reactionParam} onChange={e => setReactionParam(e.target.value)} className="input-field">
                          <option value="">请选择</option>
                          <option value="alpha-network">alpha-network</option>
                          <option value="full-network">full-network</option>
                          <option value="r-process-network">r-process</option>
                        </select>
                        {task && (
                          <p className="text-xs text-space-500">当前值: {task.parameters.reactionNetwork}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-space-300">调整原因</label>
                    <textarea
                      value={adjustmentReason}
                      onChange={e => setAdjustmentReason(e.target.value)}
                      className="input-field min-h-[80px] resize-y"
                      placeholder="请输入调整原因说明..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleAdjustAndRerun(w.id)}
                      disabled={!adjustmentType || !adjustmentReason || (adjustmentType === 'equation_of_state' && !eosParam) || (adjustmentType === 'reaction_rate' && !reactionParam)}
                      className="btn-warning flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" />
                      确认调整并重算
                    </button>
                    <button onClick={() => handleMarkReviewed(w.id)} className="btn-primary flex items-center gap-2"><Eye className="w-4 h-4" />标记已复核</button>
                    <button onClick={() => handleIgnore(w.id)} className="btn-secondary flex items-center gap-2"><EyeOff className="w-4 h-4" />忽略</button>
                  </div>
                </div>
                {warningAdjustments.length > 0 && (
                  <div className="border border-space-700 rounded-lg p-4 space-y-3 bg-space-900/30">
                    <h5 className="font-semibold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-nickel-400" />
                      调整记录 ({warningAdjustments.length})
                    </h5>
                    <div className="space-y-3">
                      {warningAdjustments.map(adj => (
                        <div key={adj.id} className="p-3 bg-space-800/50 rounded-lg border border-space-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-space-200">
                              {adj.type === 'equation_of_state' ? '状态方程' : adj.type === 'reaction_rate' ? '核反应网络' : '网格分辨率'}
                            </span>
                            <span className="text-xs text-space-500">
                              第 {adj.restartCount} 次重算
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p className="text-space-400">
                              参数: <span className="text-space-300">{adj.parameter}</span>
                            </p>
                            <p className="text-space-400">
                              <span className="text-red-400">{adj.oldValue}</span>
                              <span className="mx-2">→</span>
                              <span className="text-nickel-400">{adj.newValue}</span>
                            </p>
                            <p className="text-space-400">
                              原因: <span className="text-space-300">{adj.reason}</span>
                            </p>
                            <p className="text-xs text-space-500 mt-2">
                              调整人: {adj.adjustedBy} · {new Date(adj.adjustedAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-space-gradient p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-space-50 glow-text">预警中心</h1>
          <p className="text-space-300 text-sm mt-1">监控和处理超新星模拟中的异常预警</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(['critical', 'warning', 'info'] as WarningSeverity[]).map(sev => {
            const SevIcon = severityConfig[sev].icon;
            return (
              <div key={sev} className={cn('card p-4 border-l-4', severityConfig[sev].border)}>
                <div className="flex items-center gap-3">
                  <SevIcon className={cn('w-8 h-8', severityConfig[sev].text)} />
                  <div>
                    <p className="text-space-400 text-sm">{severityConfig[sev].label}预警</p>
                    <p className="text-2xl font-bold text-white">{stats[sev]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as any)} className="input-field w-auto">
              <option value="all">全部严重程度</option>
              <option value="critical">严重</option>
              <option value="warning">警告</option>
              <option value="info">信息</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="input-field w-auto">
              <option value="all">全部预警类型</option>
              <option value="shock_stagnation">激波停滞</option>
              <option value="neutrino_anomaly">中微子异常</option>
              <option value="ni56_deviation">镍-56偏差</option>
              <option value="convergence_issue">收敛问题</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="input-field w-auto">
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="reviewed">已复核</option>
              <option value="resolved">已解决</option>
            </select>
            <input type="date" value={timeRange[0]} onChange={e => setTimeRange([e.target.value, timeRange[1]])} className="input-field w-auto" />
            <span className="text-space-400">至</span>
            <input type="date" value={timeRange[1]} onChange={e => setTimeRange([timeRange[0], e.target.value])} className="input-field w-auto" />
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-space-300 hover:text-white">
            {allSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            <span className="text-sm">{allSelected ? '取消全选' : '全选'}</span>
          </button>
          {selectedIds.length > 0 && (
            <>
              <span className="text-space-400 text-sm">已选择 {selectedIds.length} 项</span>
              <button onClick={handleBatchReview} className="btn-primary text-sm py-1.5 px-3"><Eye className="w-4 h-4 inline mr-1" />批量标记已复核</button>
              <button onClick={handleBatchIgnore} className="btn-secondary text-sm py-1.5 px-3"><EyeOff className="w-4 h-4 inline mr-1" />批量忽略</button>
            </>
          )}
        </div>
        <div className="space-y-6">
          {(['critical', 'warning', 'info'] as WarningSeverity[]).map(sev => {
            const SevIcon = severityConfig[sev].icon;
            return grouped[sev].length > 0 && (
              <div key={sev}>
                <h3 className={cn('text-lg font-semibold mb-3 flex items-center gap-2', severityConfig[sev].text)}>
                  <SevIcon className="w-5 h-5" />
                  {severityConfig[sev].label} ({grouped[sev].length})
                </h3>
                <div>{grouped[sev].map(renderWarningCard)}</div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-space-400">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-nickel-500 opacity-50" />
            <p className="text-lg">暂无符合条件的预警</p>
            <p className="text-sm mt-2">所有系统运行正常</p>
          </div>
        )}
      </div>
    </div>
  );
}
