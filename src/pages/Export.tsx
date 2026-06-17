import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, Eye, Database, FileJson, FileSpreadsheet, FileImage, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn, formatDateTime } from '@/lib/utils';
import { SimulationStatus, ExportTask, MonitoringDataPoint } from '@/types';

const dataTypeOptions = [
  { value: 'hydrodynamics', label: '流体数据' },
  { value: 'nucleosynthesis', label: '核合成数据' },
  { value: 'all', label: '全部数据' }
];

const progenitorOptions = [
  { value: '10-15', label: '10-15M☉' },
  { value: '15-20', label: '15-20M☉' },
  { value: '20-25', label: '20-25M☉' },
  { value: '25-30', label: '25-30M☉' },
  { value: 'all', label: '全部' }
];

const networkOptions = [
  { value: 'alpha-network v4.0', label: 'alpha-network v4.0' },
  { value: 'full-network v2.1', label: 'full-network v2.1' },
  { value: 'r-process-network v1.5', label: 'r-process-network v1.5' }
];

const formatOptions = [
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { value: 'fits', label: 'FITS', icon: FileImage },
  { value: 'hdf5', label: 'HDF5', icon: FileJson }
];

const statusMap: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: '待处理', cls: 'bg-space-700 text-space-300', icon: Clock },
  processing: { label: '处理中', cls: 'bg-neutrino-600/20 text-neutrino-400 border border-neutrino-500/50', icon: Database },
  completed: { label: '已完成', cls: 'bg-nickel-600/20 text-nickel-400 border border-nickel-500/50', icon: CheckCircle2 },
  failed: { label: '失败', cls: 'bg-red-600/20 text-red-400 border border-red-500/50', icon: AlertCircle }
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const previewData = [
  { field: 'timestamp', type: 'number', sample: '0.0' },
  { field: 'shock_radius', type: 'number', sample: '15.2' },
  { field: 'shock_velocity', type: 'number', sample: '2.8e9' },
  { field: 'nu_e_luminosity', type: 'number', sample: '1.8e52' },
  { field: 'ni56_mass', type: 'number', sample: '0.072' },
  { field: 'temperature', type: 'number', sample: '8.5e9' },
  { field: 'density', type: 'number', sample: '3.2e12' },
  { field: 'entropy', type: 'number', sample: '15.6' },
  { field: 'ye', type: 'number', sample: '0.48' },
  { field: 'mass_fraction', type: 'number', sample: '0.85' }
];

export default function Export() {
  const { exports, tasks, addExport, updateExport, getMonitoringData, getVersions } = useStore();
  const completedTasks = tasks.filter(t => t.status === SimulationStatus.COMPLETED);

  const [dataType, setDataType] = useState<string>('hydrodynamics');
  const [progenitorType, setProgenitorType] = useState<string>('all');
  const [networkVersion, setNetworkVersion] = useState<string>(networkOptions[0].value);
  const [timeStart, setTimeStart] = useState<number>(0);
  const [timeEnd, setTimeEnd] = useState<number>(1000);
  const [format, setFormat] = useState<string>('csv');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const currentTaskVersions = selectedTasks.length === 1 
    ? getVersions(selectedTasks[0]) 
    : [];

  useEffect(() => {
    const intervals: Record<string, number> = {};
    
    exports.forEach(exp => {
      if (exp.status === 'pending' && !intervals[exp.id]) {
        setTimeout(() => {
          updateExport(exp.id, { status: 'processing' });
        }, 500);
        
        const progressInterval = window.setInterval(() => {
          const currentExp = useStore.getState().exports.find(e => e.id === exp.id);
          if (!currentExp || currentExp.status !== 'processing') {
            clearInterval(progressInterval);
            return;
          }
        }, 300);
        
        setTimeout(() => {
          clearInterval(progressInterval);
          const downloadUrl = generateDownloadUrl(exp);
          updateExport(exp.id, { 
            status: 'completed', 
            downloadUrl 
          });
        }, 2000 + Math.random() * 2000);
      }
    });
    
    return () => {
      Object.values(intervals).forEach(id => clearInterval(id));
    };
  }, [exports, updateExport]);

  const generateDownloadUrl = (exp: ExportTask & { version?: number | null }): string => {
    const versionNum = exp.version ?? undefined;
    const monitoringData = getMonitoringData(exp.taskId, versionNum);
    const versions = getVersions(exp.taskId);
    const versionInfo = versionNum !== undefined && versions[versionNum] 
      ? versions[versionNum] 
      : versions.length > 0 ? versions[versions.length - 1] : null;
    
    const filteredData = monitoringData.filter(d => 
      d.timestamp >= exp.timeWindow.start && d.timestamp <= exp.timeWindow.end
    );

    let content = '';
    let mimeType = 'text/plain';

    if (exp.format === 'csv') {
      mimeType = 'text/csv;charset=utf-8';
      const versionLabel = versionInfo ? versionInfo.label : '最新版本';
      const versionNumber = versionInfo ? versionInfo.version : (versions.length > 0 ? versions[versions.length - 1].version : 0);
      
      content += `# Export Version: v${versionNumber} (${versionLabel})\n`;
      content += `# Task ID: ${exp.taskId}\n`;
      content += `# Export Type: ${exp.exportType}\n`;
      content += `# Time Window: ${exp.timeWindow.start} - ${exp.timeWindow.end} ms\n`;
      content += `# Generated At: ${new Date().toISOString()}\n`;
      content += '\n';
      
      const headers = ['timestamp', 'shock_radius', 'shock_velocity', 'nu_e_luminosity', 
                       'nu_ebar_luminosity', 'nu_x_luminosity', 'ni56_mass', 'ge68_mass', 
                       'total_energy', 'entropy'];
      content += headers.join(',') + '\n';
      
      filteredData.forEach(d => {
        const row = [
          d.timestamp.toFixed(6),
          d.shockRadius.toExponential(4),
          d.shockVelocity.toExponential(4),
          d.nu_e_luminosity.toExponential(4),
          d.nu_ebar_luminosity.toExponential(4),
          d.nu_x_luminosity.toExponential(4),
          d.ni56_mass.toExponential(4),
          d.ge68_mass.toExponential(4),
          d.totalEnergy.toExponential(4),
          d.entropy.toFixed(4)
        ];
        content += row.join(',') + '\n';
      });
    } else if (exp.format === 'fits' || exp.format === 'hdf5') {
      mimeType = 'application/json';
      const versionNumber = versionInfo ? versionInfo.version : (versions.length > 0 ? versions[versions.length - 1].version : 0);
      const versionLabel = versionInfo ? versionInfo.label : '最新版本';
      
      const data = {
        export_info: {
          task_id: exp.taskId,
          export_type: exp.exportType,
          format: exp.format,
          time_window: exp.timeWindow,
          generated_at: new Date().toISOString(),
          version: {
            number: versionNumber,
            label: versionLabel
          }
        },
        data_points: filteredData.map(d => ({
          timestamp: d.timestamp,
          shock_radius: d.shockRadius,
          shock_velocity: d.shockVelocity,
          nu_e_luminosity: d.nu_e_luminosity,
          nu_ebar_luminosity: d.nu_ebar_luminosity,
          nu_x_luminosity: d.nu_x_luminosity,
          ni56_mass: d.ni56_mass,
          ge68_mass: d.ge68_mass,
          total_energy: d.totalEnergy,
          entropy: d.entropy
        }))
      };
      content = JSON.stringify(data, null, 2);
    }

    const blob = new Blob([content], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSelected = prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId];
      setSelectedVersion(null);
      return newSelected;
    });
  };

  const handleExport = () => {
    if (selectedTasks.length === 0) return;

    selectedTasks.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      const newExport = {
        id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        taskId,
        exportType: dataType as any,
        progenitorType: progenitorOptions.find(o => o.value === progenitorType)?.label || 'all',
        reactionNetworkVersion: networkVersion,
        timeWindow: { start: timeStart, end: timeEnd },
        format: format as any,
        status: 'pending',
        createdAt: new Date(),
        downloadUrl: '',
        version: selectedVersion
      } as ExportTask & { version?: number | null };
      addExport(newExport);
    });

    setSelectedTasks([]);
    setSelectedVersion(null);
  };

  const handleDownload = (exp: ExportTask & { version?: number | null }) => {
    if (exp.status !== 'completed' || !exp.downloadUrl) return;
    
    const task = tasks.find(t => t.id === exp.taskId);
    const versions = getVersions(exp.taskId);
    let versionNumber: number;
    
    if (exp.version !== undefined && exp.version !== null) {
      versionNumber = exp.version;
    } else if (versions.length > 0) {
      versionNumber = versions[versions.length - 1].version;
    } else {
      versionNumber = 0;
    }
    
    const taskName = task?.name || exp.taskId;
    const fileName = `${taskName}_v${versionNumber}_${exp.timeWindow.start}-${exp.timeWindow.end}ms.${exp.format}`;
    
    const a = document.createElement('a');
    a.href = exp.downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleTimeChange = (type: 'start' | 'end', value: number) => {
    if (type === 'start') {
      setTimeStart(Math.min(value, timeEnd - 10));
    } else {
      setTimeEnd(Math.max(value, timeStart + 10));
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6">
        <motion.div variants={item} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-space-50 glow-text">数据导出中心</h1>
          <p className="text-space-300 mt-2">配置导出参数，获取模拟数据用于后续分析</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={item} className="lg:col-span-1 space-y-4">
            <div className="card p-5 space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Database className="w-5 h-5 text-space-400" />导出配置</h2>

              <div>
                <label className="block text-space-300 text-sm mb-2">数据类型</label>
                <div className="space-y-2">
                  {dataTypeOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-space-700/30 cursor-pointer transition-colors">
                      <input type="radio" name="dataType" value={opt.value} checked={dataType === opt.value} onChange={(e) => setDataType(e.target.value)} className="w-4 h-4 text-space-500 focus:ring-space-500" />
                      <span className="text-space-200">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-space-300 text-sm mb-2">前身星类型筛选</label>
                <select value={progenitorType} onChange={(e) => setProgenitorType(e.target.value)} className="input-field">
                  {progenitorOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-space-300 text-sm mb-2">核反应网络版本</label>
                <select value={networkVersion} onChange={(e) => setNetworkVersion(e.target.value)} className="input-field">
                  {networkOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-space-300 text-sm mb-2">时间窗口 (ms post-bounce)</label>
                <div className="space-y-2 px-1">
                  <div className="flex justify-between text-xs font-mono text-space-400"><span>{timeStart} ms</span><span>{timeEnd} ms</span></div>
                  <div className="relative h-6">
                    <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-space-700 rounded-full">
                      <div className="absolute h-full bg-gradient-to-r from-space-500 to-neutrino-500 rounded-full" style={{ left: `${(timeStart / 1000) * 100}%`, right: `${100 - (timeEnd / 1000) * 100}%` }} />
                    </div>
                    <input type="range" min="0" max="1000" value={timeStart} onChange={(e) => handleTimeChange('start', parseInt(e.target.value))} className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-space-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-space-200 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg" />
                    <input type="range" min="0" max="1000" value={timeEnd} onChange={(e) => handleTimeChange('end', parseInt(e.target.value))} className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutrino-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-space-200 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-space-300 text-sm mb-2">导出格式</label>
                <div className="grid grid-cols-3 gap-2">
                  {formatOptions.map(opt => (
                    <button key={opt.value} onClick={() => setFormat(opt.value)} className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border transition-all', format === opt.value ? 'bg-space-600/30 border-space-400 text-white' : 'bg-space-900/50 border-space-700 text-space-400 hover:border-space-500')}>
                      <opt.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-space-300 text-sm mb-2">版本选择</label>
                <select 
                  value={selectedVersion ?? ''} 
                  onChange={(e) => setSelectedVersion(e.target.value === '' ? null : parseInt(e.target.value))} 
                  className="input-field"
                  disabled={selectedTasks.length !== 1}
                >
                  {selectedTasks.length !== 1 ? (
                    <option value="">请先选择单个任务</option>
                  ) : currentTaskVersions.length === 0 ? (
                    <option value="">暂无版本</option>
                  ) : (
                    <>
                      <option value="">最新版本</option>
                      {currentTaskVersions.map((v, idx) => (
                        <option key={v.version} value={v.version}>
                          {idx === currentTaskVersions.length - 1 ? '最新 - ' : ''}{v.label} (v{v.version})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {selectedTasks.length !== 1 && (
                  <p className="text-space-500 text-xs mt-1">版本选择仅在选中单个任务时可用</p>
                )}
              </div>

              <div>
                <label className="block text-space-300 text-sm mb-2">选择任务 ({selectedTasks.length} 已选)</label>
                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                  {completedTasks.length === 0 ? (
                    <p className="text-space-500 text-sm p-2">暂无已完成的模拟任务</p>
                  ) : (
                    completedTasks.map(task => (
                      <label key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-space-700/30 cursor-pointer transition-colors">
                        <input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => handleTaskToggle(task.id)} className="w-4 h-4 text-space-500 rounded focus:ring-space-500" />
                        <span className="text-space-200 text-sm truncate">{task.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowPreview(true)} className="flex-1 btn-secondary flex items-center justify-center gap-2"><Eye className="w-4 h-4" />预览</button>
                <button onClick={handleExport} disabled={selectedTasks.length === 0} className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Download className="w-4 h-4" />导出</button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="lg:col-span-2">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-space-400" />导出任务列表</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-space-700">
                      <th className="text-left py-3 px-2 text-space-400 text-sm font-medium">任务ID</th>
                      <th className="text-left py-3 px-2 text-space-400 text-sm font-medium">导出类型</th>
                      <th className="text-left py-3 px-2 text-space-400 text-sm font-medium">版本</th>
                      <th className="text-left py-3 px-2 text-space-400 text-sm font-medium">格式</th>
                      <th className="text-left py-3 px-2 text-space-400 text-sm font-medium">状态</th>
                      <th className="text-left py-3 px-2 text-space-400 text-sm font-medium">创建时间</th>
                      <th className="text-left py-3 px-2 text-space-400 text-sm font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exports.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-space-500">暂无导出任务</td></tr>
                    ) : (
                      exports.map((exp: ExportTask & { version?: number | null }) => {
                        const versions = getVersions(exp.taskId);
                        let versionLabel = '最新版本';
                        let versionNum = 0;
                        
                        if (exp.version !== undefined && exp.version !== null) {
                          versionNum = exp.version;
                          const v = versions.find(v => v.version === exp.version);
                          versionLabel = v ? v.label : `v${exp.version}`;
                        } else if (versions.length > 0) {
                          versionNum = versions[versions.length - 1].version;
                          versionLabel = versions[versions.length - 1].label;
                        }
                        
                        return (
                          <motion.tr key={exp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-space-700/30 hover:bg-space-700/20 transition-colors">
                            <td className="py-3 px-2 font-mono text-sm text-space-300">{exp.id.slice(-8)}</td>
                            <td className="py-3 px-2 text-space-200 text-sm">{dataTypeOptions.find(o => o.value === exp.exportType)?.label || exp.exportType}</td>
                            <td className="py-3 px-2">
                              <span className="px-2 py-1 bg-neutrino-500/20 text-neutrino-400 rounded text-xs" title={versionLabel}>
                                v{versionNum}
                              </span>
                            </td>
                            <td className="py-3 px-2"><span className="px-2 py-1 bg-space-700/50 rounded text-xs text-space-300 uppercase">{exp.format}</span></td>
                            <td className="py-3 px-2">
                              <div className="space-y-1">
                                <span className={cn('status-badge flex items-center gap-1', statusMap[exp.status].cls)}>
                                  {(() => { const Icon = statusMap[exp.status].icon; return <Icon className="w-3 h-3" />; })()}
                                  {statusMap[exp.status].label}
                                </span>
                                {exp.status === 'processing' && (
                                  <div className="progress-bar"><div className="progress-fill animate-pulse" style={{ width: '65%' }} /></div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-space-400 text-xs">{formatDateTime(exp.createdAt)}</td>
                            <td className="py-3 px-2">
                              <div className="flex gap-1">
                                {exp.status === 'completed' && <button onClick={() => handleDownload(exp)} className="p-1.5 rounded-lg text-nickel-400 hover:bg-nickel-500/20 transition-colors" title="下载文件"><Download className="w-4 h-4" /></button>}
                                {exp.status === 'processing' && <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"><X className="w-4 h-4" /></button>}
                                {exp.status === 'failed' && <button className="p-1.5 rounded-lg text-supernova-400 hover:bg-supernova-500/20 transition-colors"><RefreshCw className="w-4 h-4" /></button>}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card p-6 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">数据预览</h3>
                <button onClick={() => setShowPreview(false)} className="p-1 rounded-lg hover:bg-space-700 text-space-400"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-space-400 text-sm mb-4">以下为导出数据的前10行示例（共 {previewData.length} 个字段）</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-space-600"><th className="text-left py-2 px-3 text-space-400 font-medium">#</th><th className="text-left py-2 px-3 text-space-400 font-medium">字段名</th><th className="text-left py-2 px-3 text-space-400 font-medium">数据类型</th><th className="text-left py-2 px-3 text-space-400 font-medium">示例值</th></tr></thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={row.field} className="border-b border-space-700/30 hover:bg-space-700/20">
                        <td className="py-2 px-3 text-space-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 text-space-200 font-mono">{row.field}</td>
                        <td className="py-2 px-3"><span className="px-2 py-0.5 bg-neutrino-500/20 text-neutrino-400 rounded text-xs">{row.type}</span></td>
                        <td className="py-2 px-3 text-space-300 font-mono">{row.sample}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4"><button onClick={() => setShowPreview(false)} className="btn-primary">关闭</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
