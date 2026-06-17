import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronRight, ChevronLeft, Sparkles, Cpu, Clock, HardDrive, Loader2, Star, Atom, Wind, Flame } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SimulationStatus, ApprovalStatus, SimulationTask } from '@/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  mass: z.number().min(1).max(100),
  metallicity: z.number().min(-5).max(2),
  rotationVelocity: z.number().min(0).max(1000),
  equationOfState: z.string().min(1),
  reactionNetwork: z.string().min(1),
  gridResolution: z.enum(['low', 'medium', 'high', 'extreme']),
  priority: z.enum(['low', 'medium', 'high']),
  taskName: z.string().min(2).max(100)
});

type FormData = z.infer<typeof schema>;
const steps = [{ id: 1, name: '前身星参数' }, { id: 2, name: '模拟选项' }, { id: 3, name: '确认提交' }];
const resolutions = [{ value: 'low', label: '低', cores: 32, time: 2 }, { value: 'medium', label: '中', cores: 128, time: 8 }, { value: 'high', label: '高', cores: 512, time: 24 }, { value: 'extreme', label: '极高', cores: 2048, time: 72 }];
const priorityMap: Record<string, string> = { low: '低', medium: '中', high: '高' };
const genId = () => Math.random().toString(36).substring(2, 11);
const slideVariants = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

export default function CreateTask() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const { equationsOfState: eosList, reactionNetworks: netList, addTask, currentUser } = useStore();

  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      mass: 15, metallicity: 0, rotationVelocity: 0,
      equationOfState: eosList.find(e => e.isDefault)?.id || '',
      reactionNetwork: netList.find(r => r.isDefault)?.id || '',
      gridResolution: 'medium', priority: 'medium', taskName: ''
    }
  });

  const data = watch();

  const recommendation = useMemo(() => {
    const { mass, metallicity, rotationVelocity } = data;
    let score = 0, recEos = eosList[0], recNet = netList[0];
    if (mass >= 15 && mass <= 25) { score += 25; recEos = eosList.find(e => e.name === 'LS220') || recEos; }
    if (mass > 25) { score += 20; recEos = eosList.find(e => e.name === 'SFHo') || recEos; }
    if (metallicity < -1) { score += 25; recNet = netList.find(r => r.name === 'full-network') || recNet; }
    if (rotationVelocity > 300) { score += 20; recEos = eosList.find(e => e.name === 'TM1') || recEos; recNet = netList.find(r => r.name === 'r-process-network') || recNet; }
    if (data.equationOfState === recEos.id) score += 15;
    if (data.reactionNetwork === recNet.id) score += 15;
    return { recEos, recNet, score: Math.min(100, score) };
  }, [data, eosList, netList]);

  const estimates = useMemo(() => {
    const res = resolutions.find(r => r.value === data.gridResolution);
    const base = res?.time || 8;
    const netFactor = data.reactionNetwork.includes('full') ? 1.5 : data.reactionNetwork.includes('r-process') ? 2 : 1;
    const priFactor = data.priority === 'high' ? 0.7 : data.priority === 'low' ? 1.3 : 1;
    const time = Math.round(base * (data.mass / 15) * netFactor * priFactor);
    const cores = res?.cores || 128;
    return { time, cpuHours: Math.round(cores * time), memory: Math.round(cores * 0.5 + 16), cores };
  }, [data]);

  const onSubmit = async (formData: FormData) => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    const eos = eosList.find(e => e.id === formData.equationOfState);
    const net = netList.find(r => r.id === formData.reactionNetwork);
    const task: SimulationTask = {
      id: `task-${genId()}`, name: formData.taskName,
      parameters: { mass: formData.mass, metallicity: formData.metallicity, rotationVelocity: formData.rotationVelocity, equationOfState: eos?.name || '', reactionNetwork: net?.name || '' },
      status: SimulationStatus.PENDING_VALIDATION, progress: 0, priority: formData.priority,
      createdAt: new Date(), startedAt: null, completedAt: null, createdBy: currentUser?.id || '', assignedTo: [currentUser?.id || ''],
      currentStage: '等待校验', warnings: [], adjustments: [], approvalStatus: ApprovalStatus.NOT_SUBMITTED, approvalHistory: [],
      stageTimeline: Object.values(SimulationStatus).slice(0, 6).map((stage, idx) => ({ id: `stage-${genId()}`, stage, startTime: new Date(), endTime: null, duration: 0, status: idx === 0 ? 'running' as const : 'pending' as const }))
    };
    addTask(task);
    useStore.getState().startSimulation(task.id);
    setSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => {
      navigate(`/tasks/${task.id}`);
    }, 1500);
  };

  const Slider = ({ label, field, min, max, unit, step = 1, icon: Icon }: { label: string; field: keyof FormData; min: number; max: number; unit: string; step?: number; icon: React.ComponentType<{ className?: string }> }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2 text-space-200 text-sm font-medium"><Icon className="w-4 h-4 text-supernova-400" />{label}</label>
        <div className="flex items-center gap-2">
          <input type="number" step={step} min={min} max={max} {...register(field, { valueAsNumber: true })} className="w-24 px-2 py-1 text-right bg-space-900 border border-space-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-space-400" />
          <span className="text-space-400 text-xs">{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} {...register(field, { valueAsNumber: true })} onChange={(e) => setValue(field, parseFloat(e.target.value))} className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-space-500" />
      <div className="flex justify-between text-xs text-space-500"><span>{min}</span><span>{max}</span></div>
      {errors[field] && <p className="text-red-400 text-xs">{errors[field]?.message as string}</p>}
    </div>
  );

  const Step1 = () => (
    <motion.div {...slideVariants} className="space-y-6">
      <div className="card p-6 space-y-6">
        <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2"><Star className="w-5 h-5 text-supernova-400" />前身星参数配置</h3>
        <Slider label="前身星质量" field="mass" min={1} max={100} unit="M☉" step={0.5} icon={Flame} />
        <Slider label="金属丰度" field="metallicity" min={-5} max={2} unit="[Fe/H]" step={0.1} icon={Atom} />
        <Slider label="旋转速度" field="rotationVelocity" min={0} max={1000} unit="km/s" step={10} icon={Wind} />
      </div>
      <div className="card p-5 bg-gradient-to-br from-space-800/80 to-space-900/80 border-space-500/30">
        <h4 className="text-sm font-semibold text-space-200 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-neutrino-400" />当前参数预览</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[{ val: data.mass, unit: 'M☉' }, { val: data.metallicity, unit: '[Fe/H]' }, { val: data.rotationVelocity, unit: 'km/s' }].map((item, i) => (
            <div key={i} className="p-3 bg-space-900/50 rounded-lg">
              <p className="text-2xl font-bold font-mono text-white">{item.val}</p>
              <p className="text-xs text-space-400">{item.unit}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const Step2 = () => (
    <motion.div {...slideVariants} className="space-y-6">
      <div className="card p-6 space-y-5">
        <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2"><Cpu className="w-5 h-5 text-neutrino-400" />模拟选项设置</h3>
        <div className="space-y-2">
          <label className="text-space-200 text-sm font-medium">状态方程</label>
          <select {...register('equationOfState')} className="input-field">{eosList.map(e => <option key={e.id} value={e.id}>{e.name} v{e.version} - {e.description}</option>)}</select>
        </div>
        <div className="space-y-2">
          <label className="text-space-200 text-sm font-medium">核反应网络</label>
          <select {...register('reactionNetwork')} className="input-field">{netList.map(n => <option key={n.id} value={n.id}>{n.name} v{n.version} - {n.description}</option>)}</select>
        </div>
        <div className="space-y-2">
          <label className="text-space-200 text-sm font-medium">网格分辨率</label>
          <div className="grid grid-cols-4 gap-2">{resolutions.map(opt => (
            <button key={opt.value} type="button" onClick={() => setValue('gridResolution', opt.value as FormData['gridResolution'])} className={cn('p-3 rounded-lg border transition-all text-center', data.gridResolution === opt.value ? 'bg-space-600 border-space-400 text-white shadow-glow-blue' : 'bg-space-900/50 border-space-700 text-space-300 hover:border-space-500')}>
              <p className="font-semibold text-sm">{opt.label}</p>
              <p className="text-xs text-space-400">{opt.cores}核</p>
            </button>
          ))}</div>
        </div>
        <div className="space-y-2">
          <label className="text-space-200 text-sm font-medium">优先级</label>
          <div className="grid grid-cols-3 gap-2">{(['low', 'medium', 'high'] as const).map(p => (
            <button key={p} type="button" onClick={() => setValue('priority', p)} className={cn('p-3 rounded-lg border transition-all font-medium', data.priority === p ? p === 'high' ? 'bg-red-600/30 border-red-500 text-red-300' : p === 'medium' ? 'bg-supernova-600/30 border-supernova-500 text-supernova-300' : 'bg-space-600/30 border-space-500 text-space-300' : 'bg-space-900/50 border-space-700 text-space-400 hover:border-space-500')}>
              {priorityMap[p]}优先级
            </button>
          ))}</div>
        </div>
        <div className="space-y-2">
          <label className="text-space-200 text-sm font-medium">任务名称</label>
          <input {...register('taskName')} placeholder="请输入任务名称..." className="input-field" />
          {errors.taskName && <p className="text-red-400 text-xs">{errors.taskName.message}</p>}
        </div>
      </div>
    </motion.div>
  );

  const Step3 = () => {
    const eos = eosList.find(e => e.id === data.equationOfState);
    const net = netList.find(r => r.id === data.reactionNetwork);
    const res = resolutions.find(r => r.value === data.gridResolution);
    const items = [
      { label: '前身星质量', value: `${data.mass} M☉` },
      { label: '金属丰度', value: `${data.metallicity} [Fe/H]` },
      { label: '旋转速度', value: `${data.rotationVelocity} km/s` },
      { label: '状态方程', value: `${eos?.name} v${eos?.version}` },
      { label: '核反应网络', value: `${net?.name} v${net?.version}` },
      { label: '网格分辨率', value: `${res?.label} (${res?.cores}核)` },
      { label: '优先级', value: `${priorityMap[data.priority]}优先级` },
      { label: '任务名称', value: data.taskName }
    ];
    return (
      <motion.div {...slideVariants} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-display font-semibold text-white">配置参数汇总</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">{items.map((item, i) => (
            <div key={i} className="p-3 bg-space-900/50 rounded-lg">
              <p className="text-space-400 text-xs">{item.label}</p>
              <p className={cn('font-semibold truncate', i < 3 ? 'font-mono text-white' : 'text-white')}>{item.value}</p>
            </div>
          ))}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[{ icon: Clock, val: `${estimates.time}h`, label: '预计计算时间', cls: 'text-space-400' },
            { icon: Cpu, val: estimates.cpuHours, label: 'CPU核时消耗', cls: 'text-neutrino-400' },
            { icon: HardDrive, val: `${estimates.memory}GB`, label: '内存需求', cls: 'text-nickel-400' }].map((item, i) => (
            <div key={i} className="card p-5 text-center">
              <item.icon className={cn('w-8 h-8 mx-auto mb-2', item.cls)} />
              <p className="text-2xl font-bold text-white font-mono">{item.val}</p>
              <p className="text-xs text-space-400">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={() => setStep(2)} className="flex-1 btn-secondary flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4" />返回修改</button>
          <button type="submit" disabled={submitting} className="flex-1 btn-warning flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />提交中...</> : <><Sparkles className="w-4 h-4" />提交任务</>}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-space-50 glow-text">创建超新星模拟任务</h1>
            <p className="text-space-300 mt-2">配置参数，启动恒星核心塌缩模拟</p>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">{steps.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all', step > s.id ? 'bg-nickel-600 text-white shadow-glow-green' : step === s.id ? 'bg-space-500 text-white shadow-glow-blue animate-pulse-slow' : 'bg-space-800 text-space-400 border border-space-600')}>
                    {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={cn('text-xs mt-2 font-medium', step >= s.id ? 'text-white' : 'text-space-500')}>{s.name}</span>
                </div>
                {idx < steps.length - 1 && <div className={cn('h-0.5 flex-1 mx-2 rounded transition-all', step > s.id ? 'bg-gradient-to-r from-nickel-500 to-space-500' : 'bg-space-700')} />}
              </div>
            ))}</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                  {step === 1 && <Step1 key="s1" />}
                  {step === 2 && <Step2 key="s2" />}
                  {step === 3 && <Step3 key="s3" />}
                </AnimatePresence>
                {step < 3 && (
                  <div className="flex justify-between mt-6">
                    <button type="button" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="btn-secondary flex items-center gap-2 disabled:opacity-50"><ChevronLeft className="w-4 h-4" />上一步</button>
                    <button type="button" onClick={() => setStep(s => Math.min(3, s + 1))} className="btn-primary flex items-center gap-2">下一步<ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </form>
            </div>
            <div className="lg:col-span-1">
              <div className="card p-5 sticky top-4">
                <h4 className="text-sm font-semibold text-space-200 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-neutrino-400" />智能推荐</h4>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-space-400">参数匹配度</span>
                    <span className={cn('font-semibold', recommendation.score >= 80 ? 'text-nickel-400' : recommendation.score >= 50 ? 'text-supernova-400' : 'text-red-400')}>{recommendation.score}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${recommendation.score}%` }} /></div>
                </div>
                <div className="space-y-3 text-sm">
                  {[{ label: '推荐状态方程', name: recommendation.recEos.name, ver: recommendation.recEos.version },
                    { label: '推荐反应网络', name: recommendation.recNet.name, ver: recommendation.recNet.version }].map((item, i) => (
                    <div key={i} className="p-3 bg-space-900/50 rounded-lg">
                      <p className="text-xs text-space-400 mb-1">{item.label}</p>
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-xs text-space-500">v{item.ver}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-neutrino-900/30 border border-neutrino-700/50 rounded-lg">
                  <p className="text-xs text-neutrino-300">💡 建议根据恒星质量和金属丰度选择合适的物理模型，以获得更准确的模拟结果。</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-space-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="card p-8 text-center max-w-md w-full">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-nickel-500 to-nickel-700 flex items-center justify-center mx-auto mb-6 shadow-glow-green">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">任务创建成功</h2>
              <p className="text-space-300 mb-4">模拟引擎已启动，正在跳转到任务详情页...</p>
              <div className="flex items-center justify-center gap-2 text-space-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>即将跳转</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
