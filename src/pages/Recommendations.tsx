import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { Sparkles, ChevronDown, ChevronRight, Search, Filter, BookOpen, X, Clock, CheckCircle2, Target, Atom, Zap, History, Star, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Recommendation } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';

const progenitorTypes = ['10-15M☉', '15-20M☉', '25-30M☉', '快速旋转 (>300km/s)', '低金属丰度 ([Fe/H] < -1.0)'];
const observationTargets = ['SN 1987A', 'SN 2011fe', 'SN 1998bw', 'GRB 030329', 'SN 2005cs', 'GRB 080916C', 'SN 2007bi'];
const physParams = [['Ni-56产额', '0.082 M☉', '0.080 M☉', '+2.5%'], ['激波速度', '3.5e9 cm/s', '3.4e9 cm/s', '+2.9%'], ['爆发能量', '1.2e51 erg', '1.1e51 erg', '+9.1%'], ['电子丰度', '0.47', '0.46', '+2.2%']];
const helpItems = [['关于智能推荐', '基于深度学习模型，分析历史模拟数据与观测数据的匹配度，推荐最优的状态方程和反应速率组合。'], ['前身星类型', '选择目标前身星的质量范围、旋转速度或金属丰度特征。'], ['目标观测数据', '选择一个或多个观测目标，系统将基于这些数据进行匹配度计算。'], ['匹配分数', '综合评分，考虑光变曲线、光谱、Ni-56产额等多维度匹配程度。'], ['置信度', '模型对推荐结果的信心程度，基于支持样本的数量和质量计算。']];

const ScoreRing = ({ score, size = 80 }: { score: number; size?: number }) => {
  const radius = (size - 8) / 2, circumference = 2 * Math.PI * radius, offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#10b981' : score >= 80 ? '#f97316' : '#7c3aed';
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e3a5f" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="fill-white font-bold text-lg transform rotate-90" style={{ transformOrigin: 'center' }}>{score}</text>
    </svg>
  );
};

export default function Recommendations() {
  const { recommendations, tasks } = useStore();
  const [selectedProgenitor, setSelectedProgenitor] = useState('15-20M☉');
  const [selectedObservations, setSelectedObservations] = useState<string[]>(['SN 1987A']);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleObservation = (obs: string) => setSelectedObservations(prev => prev.includes(obs) ? prev.filter(o => o !== obs) : [...prev, obs]);
  const handleGenerate = () => { setIsGenerating(true); setTimeout(() => setIsGenerating(false), 1500); };

  const filteredHistory = useMemo(() => recommendations.filter(rec => {
    const matchesSearch = rec.progenitorType.toLowerCase().includes(searchQuery.toLowerCase()) || rec.recommendedEquationOfState.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScore = filterScore === null || rec.matchScore >= filterScore;
    return matchesSearch && matchesScore;
  }), [recommendations, searchQuery, filterScore]);

  const getRadarOption = (rec: Recommendation) => ({
    tooltip: {},
    radar: { indicator: [{ name: '光变曲线', max: 100 }, { name: '光谱匹配', max: 100 }, { name: 'Ni-56产额', max: 100 }, { name: '激波速度', max: 100 }, { name: '中微子信号', max: 100 }, { name: '元素丰度', max: 100 }], axisName: { color: '#97add9' }, splitLine: { lineStyle: { color: '#1e3a5f' } }, splitArea: { areaStyle: { color: ['rgba(30, 64, 175, 0.05)', 'rgba(30, 64, 175, 0.1)'] } } },
    series: [{ type: 'radar', data: [{ value: [rec.matchScore, rec.matchScore - 5, rec.matchScore + 3, rec.matchScore - 8, rec.matchScore - 3, rec.matchScore - 6], name: '推荐模型', areaStyle: { color: 'rgba(124, 58, 237, 0.3)' }, lineStyle: { color: '#7c3aed' }, itemStyle: { color: '#7c3aed' } }, { value: [85, 88, 90, 82, 86, 84], name: '观测数据', areaStyle: { color: 'rgba(249, 115, 22, 0.3)' }, lineStyle: { color: '#f97316' }, itemStyle: { color: '#f97316' } }] }]
  });

  const getNi56Option = () => ({
    tooltip: { trigger: 'axis' }, legend: { textStyle: { color: '#97add9' } }, grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['0', '50', '100', '150', '200', '250', '300'], axisLine: { lineStyle: { color: '#1e40af' } }, axisLabel: { color: '#97add9' } },
    yAxis: { type: 'value', name: 'Ni-56 质量 (M☉)', axisLine: { lineStyle: { color: '#1e40af' } }, axisLabel: { color: '#97add9' }, splitLine: { lineStyle: { color: '#1e3a5f' } } },
    series: [{ name: '推荐模型', type: 'line', smooth: true, data: [0, 0.02, 0.05, 0.078, 0.082, 0.083, 0.083], lineStyle: { color: '#7c3aed', width: 2 }, itemStyle: { color: '#7c3aed' }, areaStyle: { color: 'rgba(124, 58, 237, 0.2)' } }, { name: 'SN 1987A 观测', type: 'line', smooth: true, data: [0, 0.018, 0.048, 0.075, 0.079, 0.08, 0.08], lineStyle: { color: '#f97316', width: 2, type: 'dashed' }, itemStyle: { color: '#f97316' } }]
  });

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto flex gap-6">
        <div className="flex-1 space-y-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
            <h1 className="text-3xl font-display font-bold text-space-50 glow-text flex items-center gap-3"><Sparkles className="w-8 h-8 text-neutrino-400" />智能推荐引擎</h1>
            <p className="text-space-300 mt-2">基于机器学习的状态方程与反应速率最优组合推荐</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-space-400" />推荐参数配置</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-space-300 text-sm mb-2 block">前身星类型</label>
                <select value={selectedProgenitor} onChange={(e) => setSelectedProgenitor(e.target.value)} className="input-field">
                  {progenitorTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="text-space-300 text-sm mb-2 block">目标观测数据（多选）</label>
                <div className="flex flex-wrap gap-2">
                  {observationTargets.map(obs => (
                    <button key={obs} onClick={() => toggleObservation(obs)} className={cn('px-3 py-1.5 rounded-lg text-sm transition-all border', selectedObservations.includes(obs) ? 'bg-space-600 border-space-400 text-white' : 'bg-space-900/50 border-space-700 text-space-300 hover:border-space-500')}>{obs}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={isGenerating || selectedObservations.length === 0} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isGenerating ? <div className="spinner w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {isGenerating ? '生成中...' : '开始推荐'}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-supernova-400" />推荐结果</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec, idx) => (
                <motion.div key={rec.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + idx * 0.1 }} className="card p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                  <div className="flex items-start gap-4">
                    <ScoreRing score={rec.matchScore} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium truncate">{rec.progenitorType}</h3>
                        {expandedId === rec.id ? <ChevronDown className="w-4 h-4 text-space-400" /> : <ChevronRight className="w-4 h-4 text-space-400" />}
                      </div>
                      <p className="text-space-300 text-sm"><Atom className="w-3.5 h-3.5 inline mr-1" />{rec.recommendedEquationOfState}</p>
                      <p className="text-space-300 text-sm"><Zap className="w-3.5 h-3.5 inline mr-1" />{rec.recommendedReactionRates}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-neutrino-400">置信度 {Math.round(rec.confidence * 100)}%</span>
                        <span className="text-space-400"><Clock className="w-3 h-3 inline mr-1" />{formatDateTime(rec.generatedAt).slice(5, 16)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rec.supportingSimulations.map(simId => {
                          const task = tasks.find(t => t.id === simId);
                          return task ? <span key={simId} className="px-2 py-0.5 bg-space-700/50 rounded text-xs text-space-300"><CheckCircle2 className="w-3 h-3 inline mr-1 text-nickel-400" />{task.name.slice(0, 8)}...</span> : null;
                        })}
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedId === rec.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 pt-4 border-t border-space-700">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-space-200 mb-2">匹配度对比（雷达图）</h4>
                            <ReactECharts option={getRadarOption(rec)} style={{ height: 280 }} theme="dark" />
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-space-200 mb-2">关键物理参数对比</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead><tr className="text-space-400"><th className="text-left py-1">参数</th><th className="text-center py-1">推荐值</th><th className="text-center py-1">观测值</th><th className="text-right py-1">偏差</th></tr></thead>
                                  <tbody>{physParams.map((row, i) => (
                                    <tr key={i} className="border-t border-space-700/50">
                                      <td className="py-1.5 text-space-200">{row[0]}</td>
                                      <td className="py-1.5 text-center font-mono text-neutrino-400">{row[1]}</td>
                                      <td className="py-1.5 text-center font-mono text-supernova-400">{row[2]}</td>
                                      <td className={cn('py-1.5 text-right font-mono', row[3].startsWith('+') ? 'text-nickel-400' : 'text-red-400')}>{row[3]}</td>
                                    </tr>
                                  ))}</tbody>
                                </table>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-space-200 mb-2">Ni-56 产额对比曲线</h4>
                              <ReactECharts option={getNi56Option()} style={{ height: 180 }} theme="dark" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-space-400" />历史推荐记录</h2>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-space-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索..." className="input-field pl-9 py-1.5 text-sm w-40" /></div>
                <select value={filterScore ?? ''} onChange={(e) => setFilterScore(e.target.value ? Number(e.target.value) : null)} className="input-field py-1.5 text-sm w-32">
                  <option value="">全部分数</option><option value="80">≥80分</option><option value="85">≥85分</option><option value="90">≥90分</option>
                </select>
                <button className="p-1.5 text-space-400 hover:text-white"><Filter className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="relative pl-6 border-l border-space-700 space-y-4">
              {filteredHistory.map((rec, idx) => (
                <motion.div key={rec.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + idx * 0.05 }} className="relative">
                  <div className="absolute -left-[25px] top-2 w-3 h-3 rounded-full bg-gradient-to-r from-neutrino-500 to-space-500 shadow-glow-purple" />
                  <div className="card p-3 hover:border-space-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div><span className="text-white font-medium">{rec.progenitorType}</span><span className="text-space-400 text-sm ml-3">→ {rec.recommendedEquationOfState} + {rec.recommendedReactionRates}</span></div>
                      <div className="flex items-center gap-3"><span className="text-nickel-400 font-mono">{rec.matchScore}分</span><span className="text-space-500 text-xs">{formatDateTime(rec.generatedAt).slice(0, 16)}</span></div>
                    </div>
                    <div className="flex gap-1.5 mt-2">{rec.targetObservations.map(obs => <span key={obs} className="px-2 py-0.5 bg-supernova-500/20 text-supernova-400 rounded text-xs">{obs}</span>)}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {showSidebar && (
            <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-72 flex-shrink-0">
              <div className="card p-5 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-space-400" />使用说明</h3>
                  <button onClick={() => setShowSidebar(false)} className="text-space-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3 text-sm text-space-300">
                  {helpItems.map(([title, desc], i) => (
                    <div key={i} className="p-3 bg-space-900/50 rounded-lg">
                      <p className="text-white font-medium mb-1 flex items-center gap-1.5">{i === 0 && <Info className="w-3.5 h-3.5 text-neutrino-400" />}{title}</p>
                      <p className="text-xs">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {!showSidebar && (
          <button onClick={() => setShowSidebar(true)} className="fixed right-4 top-20 p-3 card z-10 hover:border-space-500/50">
            <BookOpen className="w-5 h-5 text-space-300" />
          </button>
        )}
      </div>
    </div>
  );
}
