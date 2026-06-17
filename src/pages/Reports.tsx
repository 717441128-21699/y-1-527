import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, Plus, ChevronLeft, ChevronRight, X, Check, Loader2, Sparkles, Activity, Atom, Radio, BookOpen } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useStore } from '@/store/useStore';
import { SimulationStatus, SimulationReport, ReportSection } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const secOpts = [
  { v: 'shock_animation', l: '激波动画', i: Activity, c: 'text-supernova-400' },
  { v: 'abundance_distribution', l: '丰度分布', i: Atom, c: 'text-nickel-400' },
  { v: 'light_curve', l: '光变曲线', i: Sparkles, c: 'text-germanium-400' },
  { v: 'neutrino_spectrum', l: '中微子频谱', i: Radio, c: 'text-neutrino-400' },
  { v: 'summary', l: '摘要', i: BookOpen, c: 'text-space-300' },
];

const statusMap: Record<string, { l: string; cls: string }> = {
  generating: { l: '生成中', cls: 'status-running' },
  completed: { l: '已完成', cls: 'status-completed' },
  failed: { l: '失败', cls: 'status-error' },
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const axis = { axisLine: { lineStyle: { color: '#6d8cca' } }, axisLabel: { color: '#97add9' } };
const colors = ['#a78bfa', '#6d8cca', '#34d399', '#facc15', '#fb8542'];

const genData = (n: number, fn: (i: number) => number[]) => Array.from({ length: n }, (_, i) => fn(i));

const lightCurveOpt = {
  title: { text: '光变曲线', left: 'center', textStyle: { color: '#e6ecf5' } },
  tooltip: { trigger: 'axis' },
  legend: { data: ['U', 'B', 'V', 'R', 'I'], textStyle: { color: '#c0cee8' }, top: 30 },
  grid: { left: '10%', right: '5%', bottom: '10%', top: '20%' },
  xAxis: { type: 'value', name: '时间 (天)', ...axis },
  yAxis: { type: 'value', name: '星等', inverse: true, ...axis },
  series: ['U', 'B', 'V', 'R', 'I'].map((b, i) => ({
    name: b, type: 'line', smooth: true,
    data: genData(50, t => [t, 12 + i * 0.6 - 3 * Math.exp(-Math.pow((t / 50 - 0.1) * 8, 2)) + 2 * Math.exp(-t / 25) + (Math.random() - 0.5) * 0.3]),
    lineStyle: { width: 2 }, itemStyle: { color: colors[i] }
  }))
};

const neutrinoOpt = {
  title: { text: '中微子频谱', left: 'center', textStyle: { color: '#e6ecf5' } },
  tooltip: { trigger: 'axis' },
  legend: { data: ['νₑ', 'ν̄ₑ', 'νₓ'], textStyle: { color: '#c0cee8' }, top: 30 },
  grid: { left: '10%', right: '5%', bottom: '10%', top: '20%' },
  xAxis: { type: 'value', name: '能量 (MeV)', ...axis },
  yAxis: { type: 'value', name: '通量', ...axis },
  series: [
    { name: 'νₑ', type: 'line', smooth: true, data: genData(40, e => [e, Math.exp(-e / 12) * Math.pow(e / 12, 2)]), lineStyle: { width: 3 }, itemStyle: { color: '#34d399' }, areaStyle: { opacity: 0.3 } },
    { name: 'ν̄ₑ', type: 'line', smooth: true, data: genData(40, e => [e, Math.exp(-e / 16) * Math.pow(e / 16, 2)]), lineStyle: { width: 3 }, itemStyle: { color: '#fb8542' }, areaStyle: { opacity: 0.3 } },
    { name: 'νₓ', type: 'line', smooth: true, data: genData(40, e => [e, Math.exp(-e / 25) * Math.pow(e / 25, 2)]), lineStyle: { width: 3 }, itemStyle: { color: '#a78bfa' }, areaStyle: { opacity: 0.3 } }
  ]
};

const abundanceOpt = {
  title: { text: '元素丰度分布', left: 'center', textStyle: { color: '#e6ecf5' } },
  tooltip: { trigger: 'axis' },
  grid: { left: '10%', right: '5%', bottom: '15%', top: '15%' },
  xAxis: { type: 'category', data: ['H', 'He', 'C', 'O', 'Ne', 'Mg', 'Si', 'Fe', 'Ni', 'Ge'], ...axis },
  yAxis: { type: 'log', name: '质量分数', ...axis },
  series: [{
    type: 'bar', data: [0.7, 0.28, 0.003, 0.01, 0.002, 0.001, 0.0008, 0.001, 0.0005, 0.00001],
    itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#fb8542' }, { offset: 1, color: '#7c3aed' }]) },
    barWidth: '50%'
  }]
};

const summaryData = [
  { t: '前身星质量', v: '15-30 M☉', c: 'text-space-600' },
  { t: '爆炸能量', v: '~10⁵¹ erg', c: 'text-supernova-600' },
  { t: '⁵⁶Ni产额', v: '0.07-0.09 M☉', c: 'text-nickel-600' },
  { t: '激波速度', v: '~3.5×10⁹ cm/s', c: 'text-neutrino-600' }
];

export default function Reports() {
  const { reports, tasks, addReport, currentUser } = useStore();
  const [tab, setTab] = useState<'list' | 'generate'>('list');
  const [selRep, setSelRep] = useState<SimulationReport | null>(null);
  const [page, setPage] = useState(0);
  const [selTask, setSelTask] = useState('');
  const [selSecs, setSelSecs] = useState<string[]>(['summary', 'light_curve']);
  const [showPN, setShowPN] = useState(true);
  const [showH, setShowH] = useState(true);
  const [gen, setGen] = useState(false);
  const [prog, setProg] = useState(0);

  const doneTasks = useMemo(() => tasks.filter(t => t.status === SimulationStatus.COMPLETED), [tasks]);
  const taskName = (id: string) => tasks.find(t => t.id === id)?.name || '未知任务';
  const total = selRep ? selRep.sections.length + 2 : 0;
  const fmt = (d: Date) => format(new Date(d), 'yyyy-MM-dd HH:mm', { locale: zhCN });

  const onGen = async () => {
    if (!selTask || selSecs.length === 0) return;
    setGen(true); setProg(0);
    for (let i = 0; i <= 100; i += 5) { await new Promise(r => setTimeout(r, 100)); setProg(i); }
    addReport({ id: `report-${Date.now()}`, taskId: selTask, generatedAt: new Date(), generatedBy: currentUser?.id || 'user-001', sections: selSecs.map(s => ({ type: s as ReportSection['type'], title: secOpts.find(o => o.v === s)?.l || '', data: {} })), status: 'completed', downloadUrl: `/reports/${selTask}.pdf` });
    setGen(false); setSelTask(''); setSelSecs(['summary', 'light_curve']); setTab('list');
  };
  const toggleSec = (v: string) => setSelSecs(p => p.includes(v) ? p.filter(s => s !== v) : [...p, v]);

  const renderPage = () => {
    if (!selRep) return null;
    const pages = [{ t: '标题页', c: 'cover' }, ...selRep.sections.map(s => ({ t: s.title, c: s.type })), { t: '结论', c: 'conclusion' }];
    const cur = pages[page];
    const tn = taskName(selRep.taskId);
    return <div className="bg-white text-gray-900 rounded-lg p-8 min-h-[500px] flex flex-col">
      {showH && <div className="border-b border-gray-300 pb-3 mb-4 flex justify-between items-center text-sm text-gray-500"><span>超新星模拟分析报告</span><span>{tn}</span></div>}
      <div className="flex-1">
        {cur.c === 'cover' && <div className="h-full flex flex-col items-center justify-center text-center py-12">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-space-600 to-supernova-500 flex items-center justify-center mb-6"><Sparkles className="w-12 h-12 text-white" /></div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">超新星模拟分析报告</h1>
          <p className="text-xl text-gray-600 mb-4">{tn}</p>
          <p className="text-gray-500">生成时间: {format(new Date(selRep.generatedAt), 'yyyy年MM月dd日', { locale: zhCN })}</p>
        </div>}
        {cur.c === 'shock_animation' && <div className="h-full flex flex-col">
          <h2 className="text-xl font-bold mb-4">激波传播过程</h2>
          <div className="flex-1 bg-gradient-to-br from-space-900 via-space-800 to-supernova-900 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.4)_0%,transparent_50%)] animate-pulse" />
            {[...Array(5)].map((_, i) => <motion.div key={i} className="absolute rounded-full border-2 border-supernova-400/50" initial={{ width: 0, height: 0, opacity: 0.8 }} animate={{ width: 200 + i * 60, height: 200 + i * 60, opacity: 0 }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />)}
            <div className="w-16 h-16 rounded-full bg-supernova-500 shadow-glow-orange" />
          </div>
          <p className="text-sm text-gray-500 mt-3">图1: 激波向外传播过程模拟 (t=0-500ms)</p>
        </div>}
        {cur.c === 'abundance_distribution' && <div className="h-full flex flex-col"><h2 className="text-xl font-bold mb-4">元素丰度分布</h2><div className="flex-1"><ReactECharts option={abundanceOpt} style={{ height: '100%', minHeight: 350 }} /></div><p className="text-sm text-gray-500 mt-3">图2: 爆炸后核合成产物的质量分数分布</p></div>}
        {cur.c === 'light_curve' && <div className="h-full flex flex-col"><h2 className="text-xl font-bold mb-4">光变曲线分析</h2><div className="flex-1"><ReactECharts option={lightCurveOpt} style={{ height: '100%', minHeight: 350 }} /></div><p className="text-sm text-gray-500 mt-3">图3: 多波段光变曲线 (UBVRI系统)</p></div>}
        {cur.c === 'neutrino_spectrum' && <div className="h-full flex flex-col"><h2 className="text-xl font-bold mb-4">中微子能谱</h2><div className="flex-1"><ReactECharts option={neutrinoOpt} style={{ height: '100%', minHeight: 350 }} /></div><p className="text-sm text-gray-500 mt-3">图4: 不同味中微子的能量分布谱</p></div>}
        {cur.c === 'summary' && <div className="h-full flex flex-col">
          <h2 className="text-xl font-bold mb-4">执行摘要</h2>
          <div className="space-y-4 text-gray-700">
            <p>本报告对超新星模拟任务 <strong>{tn}</strong> 的计算结果进行了全面分析。</p>
            <div className="grid grid-cols-2 gap-4 my-6">{summaryData.map((it, i) => <div key={i} className="bg-gray-100 p-4 rounded-lg"><p className="text-sm text-gray-500">{it.t}</p><p className={cn('text-2xl font-bold', it.c)}>{it.v}</p></div>)}</div>
            <p>模拟结果表明，激波成功爆发，核合成产物与观测数据吻合良好。</p>
          </div>
        </div>}
        {cur.c === 'conclusion' && <div className="h-full flex flex-col items-center justify-center text-center py-12">
          <h2 className="text-2xl font-bold mb-6">结论</h2>
          <div className="max-w-md space-y-4 text-gray-700">
            <p>本次超新星模拟任务成功完成，所有物理量的演化均符合理论预期。</p>
            <p>激波动力学演化正常，能量守恒误差在允许范围内。</p>
            <p>核合成产物丰度分布与观测数据匹配度良好。</p>
            <p className="text-gray-500 mt-8">— 报告结束 —</p>
          </div>
        </div>}
      </div>
      {showPN && <div className="border-t border-gray-300 pt-3 mt-4 text-center text-sm text-gray-500">第 {page + 1} 页 / 共 {pages.length} 页</div>}
    </div>;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item}><h1 className="text-3xl font-display font-bold text-space-50 glow-text">报告中心</h1><p className="text-space-300 mt-2">生成和管理超新星模拟分析报告</p></motion.div>

          <motion.div variants={item} className="flex gap-2 border-b border-space-700 pb-1">
            {['list', 'generate'].map(t => (
              <button key={t} onClick={() => setTab(t as 'list' | 'generate')} className={cn('px-6 py-2 font-medium transition-all rounded-t-lg flex items-center gap-2', tab === t ? 'bg-space-800 text-white border border-space-600 border-b-0' : 'text-space-400 hover:text-space-200')}>
                {t === 'list' ? <><FileText className="w-4 h-4" />报告列表</> : <><Plus className="w-4 h-4" />生成报告</>}
              </button>
            ))}
          </motion.div>

          {tab === 'list' && (
            <motion.div variants={item}>
              {reports.length === 0 ? (
                <div className="card p-12 text-center"><FileText className="w-16 h-16 text-space-500 mx-auto mb-4 opacity-50" /><p className="text-space-300">暂无报告，点击"生成报告"创建新报告</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {reports.map(r => (
                    <motion.div key={r.id} variants={item} whileHover={{ y: -4 }} className="card group relative overflow-hidden">
                      <div className="h-32 bg-gradient-to-br from-space-700 via-space-800 to-neutrino-900 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(124,58,237,0.3)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,rgba(249,115,22,0.3)_0%,transparent_50%)]" />
                        <FileText className="w-10 h-10 text-space-200 relative z-10" />
                        <div className="absolute inset-0 bg-space-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button onClick={() => setSelRep(r)} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"><Eye className="w-4 h-4" />预览</button>
                          <button className="btn-success text-sm py-1.5 px-3 flex items-center gap-1"><Download className="w-4 h-4" />下载</button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-white font-semibold truncate flex-1">{taskName(r.taskId)}</h3>
                          <span className={cn('status-badge ml-2 flex-shrink-0 text-xs', statusMap[r.status].cls)}>{statusMap[r.status].l}</span>
                        </div>
                        <p className="text-space-400 text-xs font-mono mb-3">{r.id}</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {r.sections.slice(0, 3).map(s => {
                            const o = secOpts.find(op => op.v === s.type);
                            return o ? <span key={s.type} className={cn('text-xs px-2 py-0.5 rounded bg-space-700/50 flex items-center gap-1', o.c)}><o.i className="w-3 h-3" />{o.l}</span> : null;
                          })}
                          {r.sections.length > 3 && <span className="text-xs px-2 py-0.5 rounded bg-space-700/50 text-space-400">+{r.sections.length - 3}</span>}
                        </div>
                        <p className="text-xs text-space-500">生成于 {fmt(r.generatedAt)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'generate' && (
            <motion.div variants={item} className="card p-6">
              <h2 className="text-xl font-bold text-white mb-6">生成新报告</h2>
              <div className="space-y-6">
                <div><label className="block text-space-200 font-medium mb-2">选择任务</label>
                  <select value={selTask} onChange={e => setSelTask(e.target.value)} className="input-field">
                    <option value="">请选择已完成的模拟任务...</option>
                    {doneTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-space-200 font-medium mb-3">报告内容</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {secOpts.map(o => (
                      <label key={o.v} className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all', selSecs.includes(o.v) ? 'border-space-400 bg-space-700/50 shadow-glow-blue' : 'border-space-700 bg-space-800/30 hover:border-space-500')}>
                        <input type="checkbox" checked={selSecs.includes(o.v)} onChange={() => toggleSec(o.v)} className="sr-only" />
                        <div className={cn('w-5 h-5 rounded border flex items-center justify-center flex-shrink-0', selSecs.includes(o.v) ? 'bg-space-500 border-space-400' : 'border-space-600')}>{selSecs.includes(o.v) && <Check className="w-3 h-3 text-white" />}</div>
                        <o.i className={cn('w-5 h-5', o.c)} /><span className="text-space-100">{o.l}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div><label className="block text-space-200 font-medium mb-3">报告格式</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-space-800/30 rounded-lg border border-space-700">
                      <FileText className="w-8 h-8 text-red-500" />
                      <div><p className="text-white font-medium">PDF 格式</p><p className="text-space-400 text-sm">标准文档格式，适合打印和存档</p></div>
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showPN} onChange={e => setShowPN(e.target.checked)} className="w-4 h-4 rounded bg-space-800 border-space-600 text-space-500" /><span className="text-space-200">显示页码</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showH} onChange={e => setShowH(e.target.checked)} className="w-4 h-4 rounded bg-space-800 border-space-600 text-space-500" /><span className="text-space-200">显示页眉</span></label>
                    </div>
                  </div>
                </div>
                {gen && <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-space-300">正在生成报告...</span><span className="text-space-200 font-mono">{prog}%</span></div><div className="progress-bar"><div className="progress-fill" style={{ width: `${prog}%` }} /></div></div>}
                <button onClick={onGen} disabled={!selTask || selSecs.length === 0 || gen} className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2">
                  {gen ? <><Loader2 className="w-5 h-5 animate-spin" />生成中...</> : <><Sparkles className="w-5 h-5" />生成报告</>}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {selRep && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-space-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelRep(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">报告预览</h2>
                  <div className="flex items-center gap-3">
                    <button className="btn-success text-sm flex items-center gap-1"><Download className="w-4 h-4" />下载 PDF</button>
                    <button onClick={() => setSelRep(null)} className="btn-secondary p-2"><X className="w-5 h-5" /></button>
                  </div>
                </div>
                {renderPage()}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-space-700">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary disabled:opacity-50 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />上一页</button>
                  <span className="text-space-400">第 {page + 1} / {total} 页</span>
                  <button onClick={() => setPage(p => Math.min(total - 1, p + 1))} disabled={page === total - 1} className="btn-secondary disabled:opacity-50 flex items-center gap-1">下一页<ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
