import { useState, useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, Pause, Maximize2, Download, ChevronDown, XCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { MonitoringDataPoint, Warning } from '@/types';
import { cn } from '@/lib/utils';

type TabType = 'shock' | 'neutrino' | 'nuclide';

const tabColors = {
  shock: { main: '#2f59b5', light: '#4e72bf', series: ['#2f59b5', '#4e72bf', '#6d8cca', '#97add9', '#1e40af'] },
  neutrino: { nu_e: '#7c3aed', nu_ebar: '#2f59b5', nu_x: '#10b981' },
  nuclide: { ni56: '#10b981', ge68: '#eab308' }
};

const severityOrder = { critical: 0, warning: 1, info: 2 };
const severityIcon = { critical: <XCircle className="w-4 h-4 text-red-400" />, warning: <AlertTriangle className="w-4 h-4 text-supernova-400" />, info: <Info className="w-4 h-4 text-space-400" /> };
const taskColors = ['#2f59b5', '#7c3aed', '#10b981', '#eab308', '#f97316', '#ec4899'];

export default function Monitoring() {
  const { tasks, warnings, monitoringData } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('shock');
  const [selectedTasks, setSelectedTasks] = useState<string[]>(['task-001', 'task-002']);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 1000]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    if (!isRefreshing) return;
    const interval = setInterval(() => {
      useStore.setState({});
    }, 5000);
    return () => clearInterval(interval);
  }, [isRefreshing]);

  const filteredData = useMemo(() => {
    const result: Record<string, MonitoringDataPoint[]> = {};
    selectedTasks.forEach(taskId => {
      const data = monitoringData[taskId] || [];
      result[taskId] = data.filter(d => d.timestamp >= timeRange[0] && d.timestamp <= timeRange[1]);
    });
    return result;
  }, [selectedTasks, timeRange, monitoringData]);

  const sortedWarnings = useMemo(() => 
    warnings.filter(w => w.status === 'pending').sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    [warnings]
  );

  const getShockOption = () => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6, 15, 36, 0.95)', borderColor: '#2f59b5', textStyle: { color: '#fff' } },
    legend: { textStyle: { color: '#c0cee8' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: { type: 'category', name: '时间 (ms)', nameTextStyle: { color: '#97add9' }, axisLine: { lineStyle: { color: '#2f59b5' } }, axisLabel: { color: '#6d8cca' }, data: filteredData[selectedTasks[0]]?.map(d => d.timestamp) || [] },
    yAxis: { type: 'value', name: '激波半径 (km)', nameTextStyle: { color: '#97add9' }, axisLine: { lineStyle: { color: '#2f59b5' } }, axisLabel: { color: '#6d8cca' }, splitLine: { lineStyle: { color: 'rgba(47, 89, 181, 0.2)' } } },
    series: [
      {
        name: '停滞预警区',
        type: 'line',
        data: filteredData[selectedTasks[0]]?.map(() => 200) || [],
        lineStyle: { color: 'rgba(239, 68, 68, 0.5)', type: 'dashed' },
        areaStyle: { color: 'rgba(239, 68, 68, 0.15)' },
        showSymbol: false,
        z: 1
      },
      ...selectedTasks.map((taskId, idx) => ({
        name: tasks.find(t => t.id === taskId)?.name || taskId,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: taskColors[idx % taskColors.length] },
        itemStyle: { color: taskColors[idx % taskColors.length] },
        data: filteredData[taskId]?.map(d => d.shockRadius) || []
      }))
    ]
  });

  const getNeutrinoOption = () => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6, 15, 36, 0.95)', borderColor: '#7c3aed', textStyle: { color: '#fff' } },
    legend: { textStyle: { color: '#c0cee8' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: { type: 'category', name: '时间 (ms)', nameTextStyle: { color: '#97add9' }, axisLine: { lineStyle: { color: '#7c3aed' } }, axisLabel: { color: '#6d8cca' }, data: filteredData[selectedTasks[0]]?.map(d => d.timestamp) || [] },
    yAxis: { type: 'log', name: '光度 (erg/s)', nameTextStyle: { color: '#97add9' }, axisLine: { lineStyle: { color: '#7c3aed' } }, axisLabel: { color: '#6d8cca' }, splitLine: { lineStyle: { color: 'rgba(124, 58, 237, 0.2)' } } },
    series: selectedTasks.flatMap((taskId, idx) => {
      const base = idx * 0.3;
      const taskName = tasks.find(t => t.id === taskId)?.name || taskId;
      return [
        { name: `ν_e - ${taskName}`, type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2, color: tabColors.neutrino.nu_e }, itemStyle: { color: tabColors.neutrino.nu_e }, data: filteredData[taskId]?.map(d => d.nu_e_luminosity * (1 + base)) || [] },
        { name: `ν̄_e - ${taskName}`, type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2, color: tabColors.neutrino.nu_ebar }, itemStyle: { color: tabColors.neutrino.nu_ebar }, data: filteredData[taskId]?.map(d => d.nu_ebar_luminosity * (1 + base)) || [] },
        { name: `ν_x - ${taskName}`, type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2, color: tabColors.neutrino.nu_x }, itemStyle: { color: tabColors.neutrino.nu_x }, data: filteredData[taskId]?.map(d => d.nu_x_luminosity * (1 + base)) || [] }
      ];
    })
  });

  const getNuclideOption = () => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6, 15, 36, 0.95)', borderColor: '#10b981', textStyle: { color: '#fff' } },
    legend: { textStyle: { color: '#c0cee8' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: { type: 'category', name: '时间 (ms)', nameTextStyle: { color: '#97add9' }, axisLine: { lineStyle: { color: '#10b981' } }, axisLabel: { color: '#6d8cca' }, data: filteredData[selectedTasks[0]]?.map(d => d.timestamp) || [] },
    yAxis: { type: 'value', name: '产额 (M☉)', nameTextStyle: { color: '#97add9' }, axisLine: { lineStyle: { color: '#10b981' } }, axisLabel: { color: '#6d8cca' }, splitLine: { lineStyle: { color: 'rgba(16, 185, 129, 0.2)' } } },
    series: selectedTasks.flatMap((taskId, idx) => [
      { name: `Ni-56 - ${tasks.find(t => t.id === taskId)?.name}`, type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2, color: tabColors.nuclide.ni56 }, itemStyle: { color: tabColors.nuclide.ni56 }, data: filteredData[taskId]?.map(d => d.ni56_mass) || [] },
      { name: `Ge-68 - ${tasks.find(t => t.id === taskId)?.name}`, type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2, color: tabColors.nuclide.ge68 }, itemStyle: { color: tabColors.nuclide.ge68 }, data: filteredData[taskId]?.map(d => d.ge68_mass) || [] }
    ])
  });

  const handleFullscreen = () => {
    const instance = chartRef.current?.getEchartsInstance();
    if (instance) {
      const option = instance.getOption();
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#060f24;';
      document.body.appendChild(container);
      const chart = new (window as any).echarts.init(container);
      chart.setOption(option);
      container.onclick = () => {
        chart.dispose();
        container.remove();
      };
    }
  };

  const handleExport = () => {
    const exportData = selectedTasks.map(taskId => ({
      task: tasks.find(t => t.id === taskId)?.name,
      data: filteredData[taskId]
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-${activeTab}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const chartOptions: Record<TabType, any> = {
    shock: getShockOption(),
    neutrino: getNeutrinoOption(),
    nuclide: getNuclideOption()
  };

  return (
    <div className="min-h-screen bg-space-gradient p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-display font-bold text-space-50 glow-text">监控中心</h1>
                <p className="text-space-300 text-sm mt-1">实时监控超新星模拟关键参数</p>
              </div>
              <button onClick={() => setIsRefreshing(!isRefreshing)} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg transition-all', isRefreshing ? 'bg-space-700 text-space-100 hover:bg-space-600' : 'bg-supernova-600 text-white hover:bg-supernova-500')}>
                {isRefreshing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRefreshing ? '自动刷新中' : '已暂停'}
              </button>
            </div>

            <div className="flex gap-2 bg-space-900/50 p-1 rounded-lg w-fit">
              {[{ key: 'shock', label: '激波监控' }, { key: 'neutrino', label: '中微子监控' }, { key: 'nuclide', label: '核合成监控' }].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as TabType)} className={cn('px-4 py-2 rounded-md text-sm font-medium transition-all', activeTab === tab.key ? 'bg-gradient-to-r from-space-600 to-space-500 text-white shadow-glow-blue' : 'text-space-300 hover:text-white hover:bg-space-800/50')}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <button onClick={() => setShowTaskDropdown(!showTaskDropdown)} className="flex items-center gap-2 px-4 py-2 bg-space-800/50 border border-space-600/30 rounded-lg text-space-200 hover:border-space-500/50 transition-all">
                  <span>任务 ({selectedTasks.length})</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showTaskDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-space-900 border border-space-600/30 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {tasks.filter(t => monitoringData[t.id]).map(task => (
                      <label key={task.id} className="flex items-center gap-2 px-3 py-2 hover:bg-space-800/50 cursor-pointer">
                        <input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => toggleTask(task.id)} className="rounded border-space-500 bg-space-800 text-space-500" />
                        <span className="text-space-200 text-sm truncate">{task.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={timeRange[0]} onChange={e => setTimeRange([parseFloat(e.target.value) || 0, timeRange[1]])} className="w-24 px-3 py-2 bg-space-800/50 border border-space-600/30 rounded-lg text-space-200 text-sm font-mono" placeholder="开始" />
                <span className="text-space-400">-</span>
                <input type="number" value={timeRange[1]} onChange={e => setTimeRange([timeRange[0], parseFloat(e.target.value) || 1000])} className="w-24 px-3 py-2 bg-space-800/50 border border-space-600/30 rounded-lg text-space-200 text-sm font-mono" placeholder="结束" />
              </div>
              <div className="flex-1" />
              <button onClick={handleFullscreen} className="p-2 bg-space-800/50 border border-space-600/30 rounded-lg text-space-300 hover:text-white hover:border-space-500/50 transition-all" title="全屏查看">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-space-700 text-space-100 rounded-lg hover:bg-space-600 transition-all">
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>

            <div className="card p-4">
              <ReactECharts ref={chartRef} option={chartOptions[activeTab]} style={{ height: '480px' }} theme="dark" />
            </div>
          </div>

          <div className="w-full md:w-80 space-y-4">
            <div className="card p-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-supernova-400" />
                实时预警
                {sortedWarnings.length > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">{sortedWarnings.length}</span>}
              </h2>
              {sortedWarnings.length === 0 ? (
                <div className="text-center py-8 text-space-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-nickel-500 opacity-50" />
                  <p className="text-sm">暂无活跃预警</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sortedWarnings.map((warning: Warning) => (
                    <div key={warning.id} className={cn('p-3 rounded-lg severity-' + warning.severity)}>
                      <div className="flex items-start gap-2">
                        {severityIcon[warning.severity]}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{warning.message}</p>
                          <p className="text-space-400 text-xs mt-1">任务: {tasks.find(t => t.id === warning.taskId)?.name}</p>
                          <p className="text-space-500 text-xs mt-0.5">{new Date(warning.timestamp).toLocaleTimeString('zh-CN')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-space-200 mb-3">监控说明</h3>
              <div className="space-y-2 text-xs text-space-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500/30" />
                  <span>激波半径 {'>'} 200km 触发停滞预警</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: tabColors.neutrino.nu_e }} />
                  <span>ν_e 电子中微子光度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: tabColors.neutrino.nu_ebar }} />
                  <span>ν̄_e 反电子中微子光度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: tabColors.neutrino.nu_x }} />
                  <span>ν_x 重子中微子光度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: tabColors.nuclide.ni56 }} />
                  <span>Ni-56 镍-56产额</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: tabColors.nuclide.ge68 }} />
                  <span>Ge-68 锗-68产额</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
