import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Play, Pause, RotateCcw, Download, Settings, ArrowLeft,
  Flame, Atom, Wind, Database, Zap, Target,
  CheckCircle2, Circle, Loader2, AlertTriangle, XCircle, Activity, Clock,
  BarChart3, FileText, Radio
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '@/store/useStore';
import { SimulationStatus, MonitoringDataPoint } from '@/types';
import { cn } from '@/lib/utils';

const statusMap: Record<SimulationStatus, { label: string; cls: string }> = {
  [SimulationStatus.PENDING_VALIDATION]: { label: '待校验', cls: 'status-pending' },
  [SimulationStatus.GRID_GENERATION]: { label: '网格生成', cls: 'status-running' },
  [SimulationStatus.COLLAPSE_PHASE]: { label: '塌缩阶段', cls: 'status-running' },
  [SimulationStatus.SHOCK_BOUNCE]: { label: '反弹激波', cls: 'status-warning' },
  [SimulationStatus.NUCLEOSYNTHESIS]: { label: '核合成', cls: 'status-running' },
  [SimulationStatus.COMPLETED]: { label: '已完成', cls: 'status-completed' },
  [SimulationStatus.ABNORMAL_FALLBACK]: { label: '异常回退', cls: 'status-error' },
  [SimulationStatus.PAUSED]: { label: '已暂停', cls: 'status-pending' },
  [SimulationStatus.CANCELLED]: { label: '已取消', cls: 'status-error' }
};

const priorityMap = { high: ['高', 'text-supernova-400'], medium: ['中', 'text-germanium-400'], low: ['低', 'text-nickel-400'] };
const stageLabels: Record<string, string> = { [SimulationStatus.PENDING_VALIDATION]: '待校验', [SimulationStatus.GRID_GENERATION]: '网格生成', [SimulationStatus.COLLAPSE_PHASE]: '塌缩阶段', [SimulationStatus.SHOCK_BOUNCE]: '反弹激波', [SimulationStatus.NUCLEOSYNTHESIS]: '核合成', [SimulationStatus.COMPLETED]: '完成' };
const stageIcons = [SimulationStatus.PENDING_VALIDATION, SimulationStatus.GRID_GENERATION, SimulationStatus.COLLAPSE_PHASE, SimulationStatus.SHOCK_BOUNCE, SimulationStatus.NUCLEOSYNTHESIS, SimulationStatus.COMPLETED];
type TabKey = 'overview' | 'monitoring' | 'logs' | 'nucleosynthesis';
const tabConfig = [{ key: 'overview', label: '概览', icon: BarChart3 }, { key: 'monitoring', label: '实时监控', icon: Activity }, { key: 'logs', label: '模拟日志', icon: FileText }, { key: 'nucleosynthesis', label: '核合成结果', icon: Radio }];

const chartTheme = {
  backgroundColor: 'rgba(6, 15, 36, 0.6)',
  textStyle: { color: '#c0cee8' },
  title: { textStyle: { color: '#e6ecf5' } },
  legend: { textStyle: { color: '#97add9' } },
  axisLine: { lineStyle: { color: '#1e40af' } },
  splitLine: { lineStyle: { color: 'rgba(30, 64, 175, 0.3)' } },
  tooltip: { backgroundColor: 'rgba(6, 15, 36, 0.95)', borderColor: '#1e40af', textStyle: { color: '#e6ecf5' } }
};

const createLineOpt = (data: MonitoringDataPoint[], yKey: keyof MonitoringDataPoint, title: string, colors: string[]) => ({
  ...chartTheme,
  title: { text: title, left: 10, top: 10, textStyle: { fontSize: 14 } },
  grid: { left: 60, right: 20, top: 50, bottom: 40 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: data.map(d => d.timestamp), axisLabel: { color: '#97add9' } },
  yAxis: { type: 'value', axisLabel: { color: '#97add9' } },
  series: [{
    type: 'line', smooth: true, showSymbol: false,
    lineStyle: { width: 2, color: colors[0] },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[1] }, { offset: 1, color: 'transparent' }] } },
    data: data.map(d => d[yKey])
  }]
});

const createMultiLineOpt = (data: MonitoringDataPoint[], title: string, legend: string[], colors: string[], dataKey: (keyof MonitoringDataPoint)[]) => ({
  ...chartTheme,
  title: { text: title, left: 10, top: 10, textStyle: { fontSize: 14 } },
  grid: { left: 60, right: 20, top: 50, bottom: 40 },
  tooltip: { trigger: 'axis' },
  legend: { data: legend, top: 10, right: 10 },
  xAxis: { type: 'category', data: data.map(d => d.timestamp), axisLabel: { color: '#97add9' } },
  yAxis: { type: 'value', axisLabel: { color: '#97add9' } },
  series: legend.map((name, i) => ({ name, type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2, color: colors[i] }, data: data.map(d => d[dataKey[i]]) }))
});

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { getTaskById, getMonitoringData, nuclideData } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const task = id ? getTaskById(id) : undefined;
  const monitoringData = id ? getMonitoringData(id) : [];
  const nuclides = id ? nuclideData[id] || [] : [];

  if (!task) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="text-8xl font-mono font-bold text-space-700 mb-4">404</div>
      <h1 className="text-2xl font-display text-white mb-2">任务不存在</h1>
      <p className="text-space-400 mb-8">无法找到ID为 {id} 的模拟任务</p>
      <button onClick={() => window.history.back()} className="btn-primary flex items-center gap-2"><ArrowLeft className="w-4 h-4" />返回任务列表</button>
    </div>
  );

  const getStageIcon = (status: string, idx: number) => {
    const currentIdx = stageIcons.findIndex(s => s === task.status);
    if (idx < currentIdx) return <CheckCircle2 className="w-5 h-5 text-nickel-400" />;
    if (idx === currentIdx) return <Loader2 className="w-5 h-5 text-space-400 animate-spin" />;
    return <Circle className="w-5 h-5 text-space-600" />;
  };

  const fmtDur = (ms: number) => `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  const shockPeak = Math.max(...monitoringData.map(d => d.shockRadius), 0);
  const runDur = task.startedAt ? Date.now() - new Date(task.startedAt).getTime() : 0;
  const canPause = ![SimulationStatus.PENDING_VALIDATION, SimulationStatus.COMPLETED, SimulationStatus.CANCELLED, SimulationStatus.PAUSED, SimulationStatus.ABNORMAL_FALLBACK].includes(task.status);

  const params = [
    { icon: Flame, label: '前身星质量', value: `${task.parameters.mass} M☉`, color: 'text-supernova-400' },
    { icon: Atom, label: '金属丰度', value: `[Fe/H] = ${task.parameters.metallicity}`, color: 'text-neutrino-400' },
    { icon: Wind, label: '旋转速度', value: `${task.parameters.rotationVelocity} km/s`, color: 'text-nickel-400' },
    { icon: Database, label: '状态方程', value: task.parameters.equationOfState, color: 'text-germanium-400' },
    { icon: Zap, label: '核反应网络', value: task.parameters.reactionNetwork, color: 'text-space-400' }
  ];

  const stats = [
    { label: '运行时长', value: fmtDur(runDur), icon: Clock, color: 'from-space-500 to-neutrino-500' },
    { label: '计算进度', value: `${task.progress}%`, icon: Activity, color: 'from-neutrino-500 to-supernova-500' },
    { label: '激波峰值', value: `${shockPeak.toFixed(1)} km`, icon: Zap, color: 'from-supernova-500 to-nickel-500' },
    { label: '镍-56产额', value: task.ni56Yield ? `${(task.ni56Yield * 100).toFixed(2)}%` : '-', icon: Atom, color: 'from-nickel-500 to-germanium-500' },
    { label: '锗-68产额', value: task.ge68Yield ? `${(task.ge68Yield * 1000).toFixed(2)}‰` : '-', icon: Database, color: 'from-germanium-500 to-space-500' }
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={() => window.history.back()} className="p-2 rounded-lg bg-space-800 hover:bg-space-700 text-space-300 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-white">{task.name}</h1>
                <span className={cn('status-badge', statusMap[task.status].cls)}>{statusMap[task.status].label}</span>
                <span className={cn('text-sm font-medium', priorityMap[task.priority][1])}>优先级: {priorityMap[task.priority][0]}</span>
              </div>
              <p className="text-space-400 text-sm mt-1"><Clock className="w-4 h-4 inline mr-1" />创建于 {new Date(task.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {task.status === SimulationStatus.PAUSED && <button className="btn-primary flex items-center gap-2"><Play className="w-4 h-4" />继续</button>}
            {task.status === SimulationStatus.ABNORMAL_FALLBACK && <button className="btn-warning flex items-center gap-2"><RotateCcw className="w-4 h-4" />重启</button>}
            {canPause && <button className="btn-secondary flex items-center gap-2"><Pause className="w-4 h-4" />暂停</button>}
            <button className="btn-secondary flex items-center gap-2"><Download className="w-4 h-4" />导出</button>
            <button className="btn-secondary flex items-center gap-2"><Settings className="w-4 h-4" />配置</button>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-space-900/50 rounded-lg w-fit">
          {tabConfig.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as TabKey)} className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all', activeTab === tab.key ? 'bg-space-700 text-white shadow-glow-blue' : 'text-space-400 hover:text-white hover:bg-space-800')}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Settings className="w-5 h-5 text-space-400" />参数配置</h2>
              <div className="space-y-3">
                {params.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-space-900/50">
                    <item.icon className={cn('w-5 h-5', item.color)} />
                    <div className="flex-1"><p className="text-space-400 text-sm">{item.label}</p><p className="text-white font-mono">{item.value}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 card p-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Target className="w-5 h-5 text-space-400" />状态流转</h2>
              <div className="relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-space-700" />
                <div className="flex justify-between relative">
                  {stageIcons.map((stage, idx) => {
                    const timelineItem = task.stageTimeline.find(t => t.stage === stage);
                    return (
                      <div key={stage} className="flex flex-col items-center z-10 px-2">
                        <div className="w-10 h-10 rounded-full bg-space-900 border-2 border-space-700 flex items-center justify-center">{getStageIcon(stage, idx)}</div>
                        <p className="text-white text-sm mt-2 text-center whitespace-nowrap">{stageLabels[stage]}</p>
                        {timelineItem && <p className="text-space-500 text-xs mt-1 font-mono">{timelineItem.status === 'completed' && timelineItem.endTime ? new Date(timelineItem.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : timelineItem.status === 'running' ? '进行中' : '等待中'}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.map((item, idx) => (
                <div key={idx} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg bg-gradient-to-br opacity-90', item.color)}><item.icon className="w-4 h-4 text-white" /></div>
                    <div><p className="text-space-400 text-xs">{item.label}</p><p className="text-xl font-mono font-bold text-white">{item.value}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && monitoringData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-4"><ReactECharts option={createLineOpt(monitoringData, 'shockRadius', '激波半径演化', ['#f97316', 'rgba(249, 115, 22, 0.3)'])} style={{ height: 350 }} /></div>
            <div className="card p-4"><ReactECharts option={createMultiLineOpt(monitoringData, '中微子光度', ['ν_e', 'ν̄_e', 'ν_x'], ['#7c3aed', '#f97316', '#10b981'], ['nu_e_luminosity', 'nu_ebar_luminosity', 'nu_x_luminosity'])} style={{ height: 350 }} /></div>
            <div className="card p-4 lg:col-span-2"><ReactECharts option={createMultiLineOpt(monitoringData, '核素产额', ['Ni-56', 'Ge-68'], ['#10b981', '#eab308'], ['ni56_mass', 'ge68_mass'])} style={{ height: 350 }} /></div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            {['计算日志', '错误信息', '调整记录'].map((section, sIdx) => (
              <div key={sIdx} className="card p-5">
                <h3 className="text-lg font-semibold text-white mb-4">{section}</h3>
                {sIdx === 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                    {monitoringData.slice(-10).map((d, i) => (
                      <div key={i} className="font-mono text-sm p-2 bg-space-900/50 rounded"><span className="text-space-500">[{d.timestamp}ms]</span><span className="text-space-300 ml-2">半径={d.shockRadius.toFixed(1)}km, 速度={(d.shockVelocity/1e9).toFixed(2)}e9 cm/s</span></div>
                    ))}
                  </div>
                )}
                {sIdx === 1 && (task.warnings.length === 0 ? <div className="text-space-400 text-center py-8">暂无错误信息</div> : (
                  <div className="space-y-2">
                    {task.warnings.map(w => (
                      <div key={w.id} className={cn('p-4 rounded-lg', w.severity === 'critical' ? 'severity-critical' : 'severity-warning')}>
                        <div className="flex items-start gap-3">
                          {w.severity === 'critical' ? <XCircle className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-supernova-400" />}
                          <div>
                            <p className="text-white font-medium">{w.message}</p>
                            <p className="text-space-400 text-sm mt-1">{new Date(w.timestamp).toLocaleString('zh-CN')}</p>
                            {w.resolution && <p className="text-nickel-400 text-sm mt-2">处理: {w.resolution}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {sIdx === 2 && (task.adjustments.length === 0 ? <div className="text-space-400 text-center py-8">暂无调整记录</div> : (
                  <div className="space-y-2">
                    {task.adjustments.map(a => (
                      <div key={a.id} className="p-4 rounded-lg bg-space-900/50 border border-space-700/50">
                        <div className="flex items-start gap-3">
                          <Settings className="w-5 h-5 text-space-400" />
                          <div>
                            <p className="text-white font-medium">{a.parameter}: {a.oldValue} → {a.newValue}</p>
                            <p className="text-space-400 text-sm mt-1">{a.reason}</p>
                            <p className="text-space-500 text-xs mt-1">{new Date(a.adjustedAt).toLocaleString('zh-CN')} · 重启次数: {a.restartCount}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'nucleosynthesis' && nuclides.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-white mb-4">元素丰度分布</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-space-700"><th className="text-left py-2 px-3 text-space-400 font-medium">核素</th><th className="text-right py-2 px-3 text-space-400 font-medium">质量数</th><th className="text-right py-2 px-3 text-space-400 font-medium">质量丰度</th><th className="text-right py-2 px-3 text-space-400 font-medium">数丰度</th></tr></thead>
                  <tbody>
                    {nuclides.map(n => (
                      <tr key={n.id} className="border-b border-space-800 hover:bg-space-900/50">
                        <td className="py-2 px-3 text-white font-mono">{n.nuclide}</td>
                        <td className="py-2 px-3 text-right text-space-300 font-mono">{n.massNumber}</td>
                        <td className="py-2 px-3 text-right text-space-300 font-mono">{n.massFraction.toExponential(2)}</td>
                        <td className="py-2 px-3 text-right text-space-300 font-mono">{n.numberFraction.toExponential(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card p-4">
              <ReactECharts option={{ ...chartTheme, title: { text: '元素丰度分布', left: 10, top: 10, textStyle: { fontSize: 14 } }, grid: { left: 60, right: 20, top: 50, bottom: 40 }, tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: nuclides.map(n => n.nuclide), axisLabel: { color: '#97add9', rotate: 45 } }, yAxis: { type: 'log', axisLabel: { color: '#97add9' } }, series: [{ type: 'bar', data: nuclides.map(n => n.massFraction), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#7c3aed' }, { offset: 1, color: '#f97316' }] } } }] }} style={{ height: 400 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
