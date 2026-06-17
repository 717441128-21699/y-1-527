import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import {
  TrendingUp, TrendingDown, Zap, Target, Cpu, Clock,
  AlertTriangle, Download, Pause, Play, BarChart3, LineChart,
  Activity, Bell, CheckCircle2
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Statistics() {
  const { dailyStats, performanceMetrics, equationsOfState, reactionNetworks } = useStore();
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>(['LS220', 'SFHo', 'DD2']);
  const [isPaused, setIsPaused] = useState(false);

  const filteredStats = useMemo(() => dailyStats.slice(-timeRange), [dailyStats, timeRange]);

  const latest = filteredStats[filteredStats.length - 1];
  const previous = filteredStats[filteredStats.length - 2];
  const avgCompletionRate = Math.round(filteredStats.reduce((sum, s) => sum + s.completionRate, 0) / filteredStats.length * 100);
  const avgShockRate = Math.round(filteredStats.reduce((sum, s) => sum + s.shockRecoverySuccessRate, 0) / filteredStats.length * 100);
  const totalConvergence = filteredStats.reduce((sum, s) => sum + s.networkConvergenceCount, 0);
  const avgSimTime = Math.round(filteredStats.reduce((sum, s) => sum + s.avgSimulationTime, 0) / filteredStats.length);
  const completionTrend = latest && previous ? latest.completionRate - previous.completionRate : 0;

  const statCards = [
    { title: '模拟完成率', value: `${avgCompletionRate}%`, sub: completionTrend >= 0 ? `↑ 较前日 +${Math.abs(completionTrend).toFixed(1)}%` : `↓ 较前日 -${Math.abs(completionTrend).toFixed(1)}%`, icon: Target, color: 'from-space-500 to-neutrino-500', glow: 'shadow-glow-blue', trend: completionTrend >= 0 ? 'up' : 'down' },
    { title: '激波恢复成功率', value: `${avgShockRate}%`, sub: '近30天平均', icon: Zap, color: 'from-supernova-500 to-germanium-500', glow: 'shadow-glow-orange' },
    { title: '核网络收敛次数', value: totalConvergence.toLocaleString(), sub: '累计收敛成功', icon: Cpu, color: 'from-neutrino-500 to-nickel-500', glow: 'shadow-glow-purple' },
    { title: '平均模拟时长', value: `${avgSimTime} min`, sub: '单次模拟均值', icon: Clock, color: 'from-nickel-500 to-space-500', glow: 'shadow-glow-green' }
  ];

  const lineOption = useMemo(() => ({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6, 15, 36, 0.95)', borderColor: '#1e40af', textStyle: { color: '#e6ecf5' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: filteredStats.map(s => s.date.slice(5)), axisLine: { lineStyle: { color: '#1e40af' } }, axisLabel: { color: '#6d8cca' } },
    yAxis: { type: 'value', min: 50, max: 100, axisLine: { lineStyle: { color: '#1e40af' } }, axisLabel: { color: '#6d8cca', formatter: '{value}%' }, splitLine: { lineStyle: { color: 'rgba(30, 64, 175, 0.2)' } } },
    series: [{ name: '完成率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: filteredStats.map(s => Math.round(s.completionRate * 100)), areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(47, 89, 181, 0.6)' }, { offset: 1, color: 'rgba(47, 89, 181, 0.05)' }] } }, lineStyle: { color: '#2f59b5', width: 3 }, itemStyle: { color: '#2f59b5', borderColor: '#fff', borderWidth: 2 } }]
  }), [filteredStats]);

  const barOption = useMemo(() => ({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6, 15, 36, 0.95)', borderColor: '#1e40af', textStyle: { color: '#e6ecf5' } },
    legend: { data: ['完成任务', '新增预警'], textStyle: { color: '#c0cee8' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: filteredStats.map(s => s.date.slice(5)), axisLine: { lineStyle: { color: '#1e40af' } }, axisLabel: { color: '#6d8cca' } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#1e40af' } }, axisLabel: { color: '#6d8cca' }, splitLine: { lineStyle: { color: 'rgba(30, 64, 175, 0.2)' } } },
    series: [
      { name: '完成任务', type: 'bar', data: filteredStats.map(s => s.completedTasks), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
      { name: '新增预警', type: 'bar', data: filteredStats.map(s => s.warningsCount), itemStyle: { color: '#f97316', borderRadius: [4, 4, 0, 0] } }
    ]
  }), [filteredStats]);

  const radarOption = useMemo(() => {
    const configNames = [...equationsOfState, ...reactionNetworks].filter(c => selectedConfigs.includes(c.name));
    const colors = ['#2f59b5', '#f97316', '#10b981', '#7c3aed', '#eab308'];
    return {
      tooltip: { backgroundColor: 'rgba(6, 15, 36, 0.95)', borderColor: '#1e40af', textStyle: { color: '#e6ecf5' } },
      legend: { data: configNames.map(c => c.name), textStyle: { color: '#c0cee8' }, bottom: 0 },
      radar: { indicator: [
        { name: '精度', max: 100 }, { name: '速度', max: 100 }, { name: '稳定性', max: 100 },
        { name: '收敛性', max: 100 }, { name: '资源利用率', max: 100 }
      ], axisName: { color: '#c0cee8' }, splitLine: { lineStyle: { color: 'rgba(30, 64, 175, 0.3)' } }, splitArea: { areaStyle: { color: ['rgba(6, 15, 36, 0.5)', 'rgba(15, 31, 101, 0.3)'] } }, axisLine: { lineStyle: { color: '#1e40af' } } },
      series: [{ type: 'radar', data: configNames.map((c, i) => ({
        name: c.name,
        value: performanceMetrics[i % performanceMetrics.length] ? [performanceMetrics[i % performanceMetrics.length].accuracy, performanceMetrics[i % performanceMetrics.length].speed, performanceMetrics[i % performanceMetrics.length].stability, performanceMetrics[i % performanceMetrics.length].convergence, performanceMetrics[i % performanceMetrics.length].resourceUtilization] : [85, 75, 80, 82, 70],
        lineStyle: { color: colors[i % colors.length], width: 2 },
        areaStyle: { color: colors[i % colors.length], opacity: 0.2 },
        itemStyle: { color: colors[i % colors.length] }
      })) }]
    };
  }, [selectedConfigs, performanceMetrics, equationsOfState, reactionNetworks]);

  const ni56Data = [
    { run: '第1次', yield: 0.078, deviation: 0 },
    { run: '第2次', yield: 0.082, deviation: 5.1 },
    { run: '第3次', yield: 0.095, deviation: 21.8 }
  ];
  const maxDeviation = Math.max(...ni56Data.map(d => d.deviation));
  const hasCriticalDeviation = maxDeviation > 20;

  const handleExport = () => {
    const headers = ['日期', '总任务', '完成任务', '完成率(%)', '激波恢复率(%)', '收敛次数', '平均时长(min)', '预警数'];
    const rows = filteredStats.map(s => [s.date, s.totalTasks, s.completedTasks, Math.round(s.completionRate * 100), Math.round(s.shockRecoverySuccessRate * 100), s.networkConvergenceCount, Math.round(s.avgSimulationTime), s.warningsCount]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics-report-${timeRange}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleConfig = (name: string) => {
    setSelectedConfigs(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-space-50 glow-text">统计看板</h1>
            <p className="text-space-300 mt-1">超新星模拟平台数据分析中心</p>
          </div>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2 self-start">
            <Download className="w-4 h-4" />导出CSV报告
          </button>
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
                    {card.trend === 'up' && <TrendingUp className="w-4 h-4 text-nickel-400" />}
                    {card.trend === 'down' && <TrendingDown className="w-4 h-4 text-supernova-400" />}
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

        <motion.div variants={item} className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><LineChart className="w-5 h-5 text-space-400" />每日统计趋势</h2>
            <div className="flex gap-2">
              {([7, 30, 90] as const).map(d => (
                <button key={d} onClick={() => setTimeRange(d)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', timeRange === d ? 'bg-space-600 text-white shadow-glow-blue' : 'bg-space-800 text-space-300 hover:bg-space-700')}>{d}天</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-space-300 text-sm mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" />模拟完成率趋势</p>
              <ReactECharts option={lineOption} style={{ height: '280px' }} theme="dark" />
            </div>
            <div>
              <p className="text-space-300 text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4" />每日任务与预警</p>
              <ReactECharts option={barOption} style={{ height: '280px' }} theme="dark" />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={item} className="card p-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-neutrino-400" />性能雷达对比</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {[...equationsOfState, ...reactionNetworks].slice(0, 5).map(config => (
                <button key={config.id} onClick={() => toggleConfig(config.name)} className={cn('px-3 py-1 rounded-full text-xs font-medium transition-all border', selectedConfigs.includes(config.name) ? 'bg-space-600 text-white border-space-400' : 'bg-space-800 text-space-400 border-space-700 hover:border-space-500')}>{config.name}</button>
              ))}
            </div>
            <ReactECharts option={radarOption} style={{ height: '320px' }} theme="dark" />
          </motion.div>

          <motion.div variants={item} className={cn('card p-5', hasCriticalDeviation && 'border-red-500/50 shadow-glow-orange')}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className={cn('w-5 h-5', hasCriticalDeviation ? 'text-red-400' : 'text-germanium-400')} />
                镍-56偏差检测
                {hasCriticalDeviation && <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1"><Bell className="w-3 h-3" />偏差超限</span>}
              </h2>
              <button onClick={() => setIsPaused(!isPaused)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all', isPaused ? 'bg-nickel-600/20 text-nickel-400 border border-nickel-500/50 hover:bg-nickel-600/30' : 'bg-supernova-600/20 text-supernova-400 border border-supernova-500/50 hover:bg-supernova-600/30')}>
                {isPaused ? <><Play className="w-4 h-4" />恢复任务</> : <><Pause className="w-4 h-4" />暂停新任务</>}
              </button>
            </div>
            <p className="text-space-300 text-sm mb-3">前身星: 15M☉ Z=0.0 | 状态方程: LS220</p>
            <div className="space-y-3">
              {ni56Data.map((data, idx) => (
                <div key={idx} className={cn('p-3 rounded-lg border transition-all', data.deviation > 20 ? 'bg-red-500/10 border-red-500/50' : 'bg-space-900/50 border-space-700/30')}>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{data.run}模拟</span>
                    <span className="font-mono text-space-200">Y(Ni-56) = {data.yield.toFixed(3)} M☉</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-space-400 text-sm">与首次偏差</span>
                    <span className={cn('font-mono text-sm font-medium', data.deviation > 20 ? 'text-red-400' : data.deviation > 10 ? 'text-supernova-400' : 'text-nickel-400')}>
                      {data.deviation > 20 && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {data.deviation > 0 ? '+' : ''}{data.deviation.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {hasCriticalDeviation && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />连续三次模拟镍-56产额偏差超过20%阈值，已自动暂停新任务提交。请检查状态方程参数或核反应网络设置。</p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
