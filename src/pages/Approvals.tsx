import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Clock, User, Filter, SortAsc, Search, CheckCircle, XCircle, Flame, Atom, Zap, Info, FileCheck, Users, BookOpen, ArrowRight, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ApprovalStatus, SimulationTask, ShockVerification, NucleosynthesisAssessment } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type TabType = 'pending' | 'history';
type ApprovalLevel = 'postdoc' | 'professor';

const levelMap: Record<ApprovalLevel, { label: string; cls: string; icon: any; items: string[] }> = {
  postdoc: { label: '博士后验证', cls: 'bg-neutrino-500/20 text-neutrino-400 border-neutrino-500/50', icon: Users, items: ['激波速度验证', '半径演化分析', '能量守恒检查'] },
  professor: { label: '教授确认', cls: 'bg-supernova-500/20 text-supernova-400 border-supernova-500/50', icon: BookOpen, items: ['镍-56产额验证', '丰度分布合理性', '观测数据匹配度'] }
};
const resultMap: Record<string, { label: string; cls: string }> = { approved: { label: '通过', cls: 'text-nickel-400' }, rejected: { label: '拒绝', cls: 'text-red-400' } };
const anim = {
  container: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
};
const shockItems = [{ key: 'shockVelocityValid', label: '激波速度验证', desc: '激波传播速度在合理范围内' }, { key: 'radiusEvolutionValid', label: '半径演化分析', desc: '激波半径随时间演化符合物理规律' }, { key: 'energyConservationValid', label: '能量守恒检查', desc: '系统总能量守恒误差在允许范围内' }];
const nucleoItems = [{ key: 'ni56YieldValid', label: '镍-56产额验证', desc: '镍-56产额与观测数据一致' }, { key: 'abundanceDistributionValid', label: '丰度分布合理性', desc: '元素丰度分布符合核合成理论' }];
const flowSteps = [{ title: '博士后验证', desc: '验证激波动力学结果', borderCls: 'border-neutrino-500/50', bgCls: 'bg-neutrino-500', icon: Users }, { title: '教授确认', desc: '评估核合成合理性', borderCls: 'border-supernova-500/50', bgCls: 'bg-supernova-500', icon: BookOpen }, { title: '审批完成', desc: '模拟结果正式生效', borderCls: '', bgCls: 'bg-nickel-500', icon: CheckCircle }];
const fmt = (d: Date) => format(new Date(d), 'MM-dd HH:mm', { locale: zhCN });
const emptyShock: ShockVerification = { shockVelocityValid: false, radiusEvolutionValid: false, energyConservationValid: false, comments: '' };
const emptyNucleo: NucleosynthesisAssessment = { ni56YieldValid: false, abundanceDistributionValid: false, observationMatch: 75, comments: '' };

export default function Approvals() {
  const { tasks, currentUser, approvePostdoc, rejectPostdoc, approveProfessor, rejectProfessor, multimessengerPushed } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedTask, setSelectedTask] = useState<SimulationTask | null>(null);
  const [modalLevel, setModalLevel] = useState<ApprovalLevel>('postdoc');
  const [shockForm, setShockForm] = useState<ShockVerification>(emptyShock);
  const [nucleoForm, setNucleoForm] = useState<NucleosynthesisAssessment>(emptyNucleo);
  const [showSidebar, setShowSidebar] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('approvedAt');
  const [searchQuery, setSearchQuery] = useState('');

  const pendingTasks = useMemo(() => ({
    postdocTasks: tasks.filter(t => t.approvalStatus === ApprovalStatus.POSTDOC_PENDING),
    professorTasks: tasks.filter(t => t.approvalStatus === ApprovalStatus.PROFESSOR_PENDING)
  }), [tasks]);

  const approvalTaskList = useMemo(() => {
    let result = tasks.filter(t => t.approvalHistory.length > 0 || multimessengerPushed[t.id]);
    if (filterStatus !== 'all') {
      result = result.filter(t => {
        if (filterStatus === 'approved') {
          return t.approvalStatus === ApprovalStatus.PROFESSOR_APPROVED || t.approvalStatus === ApprovalStatus.POSTDOC_APPROVED;
        }
        if (filterStatus === 'rejected') {
          return t.approvalStatus === ApprovalStatus.PROFESSOR_REJECTED || t.approvalStatus === ApprovalStatus.POSTDOC_REJECTED;
        }
        return true;
      });
    }
    if (searchQuery) {
      result = result.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    result.sort((a, b) => {
      if (sortBy === 'approvedAt') {
        const aTime = a.approvalHistory.length > 0 ? new Date(a.approvalHistory[a.approvalHistory.length - 1].approvedAt).getTime() : 0;
        const bTime = b.approvalHistory.length > 0 ? new Date(b.approvalHistory[b.approvalHistory.length - 1].approvedAt).getTime() : 0;
        return bTime - aTime;
      }
      return 0;
    });
    return result;
  }, [tasks, filterStatus, sortBy, searchQuery, multimessengerPushed]);

  const openModal = (task: SimulationTask, level: ApprovalLevel) => {
    setSelectedTask(task);
    setModalLevel(level);
    setShockForm(emptyShock);
    setNucleoForm(emptyNucleo);
  };

  const handleApproval = (status: 'approved' | 'rejected') => {
    if (!selectedTask) return;
    if (modalLevel === 'postdoc') {
      if (status === 'approved') {
        const verification = { ...shockForm, comments: shockForm.comments };
        approvePostdoc(selectedTask.id, verification, shockForm.comments);
      } else {
        rejectPostdoc(selectedTask.id, shockForm.comments);
      }
    } else {
      if (status === 'approved') {
        const assessment = { ...nucleoForm, comments: nucleoForm.comments };
        approveProfessor(selectedTask.id, assessment, nucleoForm.comments);
      } else {
        rejectProfessor(selectedTask.id, nucleoForm.comments);
      }
    }
    setSelectedTask(null);
  };

  const Checkbox = ({ item, form, setForm, color }: any) => (
    <label key={item.key} className="flex items-start gap-3 p-3 bg-space-800/30 rounded-lg border border-space-700/30 hover:border-space-600/50 cursor-pointer transition-colors">
      <input type="checkbox" checked={form[item.key]} onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })} className={cn('mt-1 w-4 h-4', color)} />
      <div><p className="text-white text-sm">{item.label}</p><p className="text-space-400 text-xs">{item.desc}</p></div>
    </label>
  );

  const TaskCard = ({ task, level }: { task: SimulationTask; level: ApprovalLevel }) => {
    const L = levelMap[level];
    return (
      <motion.div key={task.id} variants={anim.item} whileHover={{ y: -3 }} className="card p-4 group hover:shadow-glow-blue hover:border-space-400/50 transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate group-hover:text-space-100">{task.name}</h3>
            <p className="text-space-400 text-xs font-mono mt-1">{task.id}</p>
          </div>
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1', L.cls)}><L.icon className="w-3 h-3" />{L.label}</span>
        </div>
        <div className="space-y-1.5 mb-3 text-sm">
          <div className="flex items-center gap-2 text-space-300"><Flame className="w-3.5 h-3.5 text-supernova-400" /><span>质量: <span className="font-mono text-white">{task.parameters.mass}M☉</span></span></div>
          <div className="flex items-center gap-2 text-space-300"><Atom className="w-3.5 h-3.5 text-neutrino-400" /><span>金属丰度: <span className="font-mono text-white">{task.parameters.metallicity}</span></span></div>
          <div className="flex items-center gap-2 text-space-300"><Zap className="w-3.5 h-3.5 text-nickel-400" /><span>旋转: <span className="font-mono text-white">{task.parameters.rotationVelocity}km/s</span></span></div>
        </div>
        <div className="mb-3 p-2 bg-space-800/50 rounded-lg border border-space-700/30">
          <p className="text-xs text-space-300 mb-1 font-medium">{level === 'postdoc' ? '激波动力学验证项' : '核合成评估项'}</p>
          <div className="text-xs text-space-400 space-y-0.5">{L.items.map(i => <p key={i}>• {i}</p>)}</div>
        </div>
        <div className="flex items-center justify-between text-xs text-space-400">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(task.createdAt)}</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.createdBy}</span>
        </div>
        <button onClick={() => openModal(task, level)} className="w-full mt-3 btn-primary text-sm py-2 flex items-center justify-center gap-1"><FileCheck className="w-4 h-4" />处理审批</button>
      </motion.div>
    );
  };

  const PendingGroup = ({ tasks, level }: { tasks: SimulationTask[]; level: ApprovalLevel }) => tasks.length > 0 && (
    <motion.div variants={anim.item}>
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        {level === 'postdoc' ? <Users className="w-5 h-5 text-neutrino-400" /> : <BookOpen className="w-5 h-5 text-supernova-400" />}
        {levelMap[level].label} ({tasks.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{tasks.map(t => <TaskCard key={t.id} task={t} level={level} />)}</div>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={anim.container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={anim.item} className="flex items-center justify-between">
            <div><h1 className="text-3xl font-display font-bold text-space-50 glow-text">审批中心</h1><p className="text-space-300 mt-2">超新星模拟结果两级审批流程</p></div>
            <button onClick={() => setShowSidebar(!showSidebar)} className="btn-secondary p-2"><Info className="w-5 h-5" /></button>
          </motion.div>
          <div className="flex gap-6">
            <div className="flex-1">
              <motion.div variants={anim.item} className="card p-1 mb-6 inline-flex">
                <button onClick={() => setActiveTab('pending')} className={cn('px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2', activeTab === 'pending' ? 'bg-space-600 text-white shadow-glow-blue' : 'text-space-300 hover:text-white')}>
                  <CheckSquare className="w-4 h-4" />待我审批
                  <span className="bg-neutrino-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingTasks.postdocTasks.length + pendingTasks.professorTasks.length}</span>
                </button>
                <button onClick={() => setActiveTab('history')} className={cn('px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2', activeTab === 'history' ? 'bg-space-600 text-white shadow-glow-blue' : 'text-space-300 hover:text-white')}>
                  <Clock className="w-4 h-4" />已审批记录
                </button>
              </motion.div>
              {activeTab === 'pending' ? (
                <motion.div variants={anim.container} initial="hidden" animate="show" className="space-y-8">
                  <PendingGroup tasks={pendingTasks.postdocTasks} level="postdoc" />
                  <PendingGroup tasks={pendingTasks.professorTasks} level="professor" />
                  {pendingTasks.postdocTasks.length === 0 && pendingTasks.professorTasks.length === 0 && (
                    <motion.div variants={anim.item} className="card p-12 text-center">
                      <CheckCircle className="w-16 h-16 mx-auto text-nickel-400 opacity-50 mb-4" />
                      <p className="text-space-300 text-lg">暂无待审批任务</p>
                      <p className="text-space-500 text-sm mt-1">所有任务都已处理完毕</p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div variants={anim.item}>
                  <div className="card p-4 mb-4">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-space-400" />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field text-sm py-1.5 w-24">
                          <option value="all">全部</option><option value="approved">通过</option><option value="rejected">拒绝</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2"><SortAsc className="w-4 h-4 text-space-400" />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field text-sm py-1.5 w-32">
                          <option value="approvedAt">审批时间</option><option value="level">审批级别</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px] relative">
                        <Search className="w-4 h-4 text-space-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="搜索任务名称..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field pl-9 text-sm py-1.5 w-full" />
                      </div>
                    </div>
                  </div>
                  <motion.div variants={anim.container} initial="hidden" animate="show" className="space-y-4">
                    {approvalTaskList.map((task) => {
                      const postdocRecord = task.approvalHistory.find(h => h.level === 'postdoc');
                      const professorRecord = task.approvalHistory.find(h => h.level === 'professor');
                      const isPushed = multimessengerPushed[task.id];
                      return (
                        <motion.div key={task.id} variants={anim.item} className="card p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-white font-semibold text-lg">{task.name}</h3>
                              <p className="text-space-400 text-sm font-mono mt-1">{task.id}</p>
                            </div>
                            {isPushed && (
                              <span className="px-3 py-1 bg-nickel-500/20 text-nickel-400 border border-nickel-500/50 rounded-full text-xs font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />已推送到多信使观测提案系统
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <p className="text-space-300 text-sm">
                              <Flame className="w-3.5 h-3.5 text-supernova-400 inline mr-1" />
                              质量 {task.parameters.mass}M☉ · 
                              <Atom className="w-3.5 h-3.5 text-neutrino-400 inline mx-1" />
                              金属丰度 {task.parameters.metallicity} · 
                              <Zap className="w-3.5 h-3.5 text-nickel-400 inline mx-1" />
                              旋转 {task.parameters.rotationVelocity}km/s
                            </p>
                          </div>
                          <div className="space-y-3">
                            <div className={cn('flex items-start gap-3 p-3 rounded-lg border', postdocRecord ? 'border-space-600/50 bg-space-800/30' : 'border-space-700/30 bg-space-800/10 opacity-60')}>
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', postdocRecord ? 'bg-neutrino-500/20' : 'bg-space-700/30')}>
                                <Users className={cn('w-4 h-4', postdocRecord ? 'text-neutrino-400' : 'text-space-500')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={cn('font-medium text-sm', postdocRecord ? 'text-white' : 'text-space-500')}>博士后验证</p>
                                  {postdocRecord && <span className={cn('text-xs font-medium', resultMap[postdocRecord.status].cls)}>{resultMap[postdocRecord.status].label}</span>}
                                  {!postdocRecord && <span className="text-xs text-space-500">待处理</span>}
                                </div>
                                {postdocRecord ? (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-space-400 text-xs">审批人: <span className="text-space-300">{postdocRecord.approver}</span></p>
                                    <p className="text-space-400 text-xs">时间: <span className="text-space-300 font-mono">{fmt(postdocRecord.approvedAt)}</span></p>
                                    {postdocRecord.shockDynamicsVerification && (
                                      <div className="mt-2 space-y-1">
                                        <p className="text-space-300 text-xs font-medium">验证项:</p>
                                        <div className="flex flex-wrap gap-2">
                                          <span className={cn('px-2 py-0.5 rounded text-xs', postdocRecord.shockDynamicsVerification.shockVelocityValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                                            激波速度 {postdocRecord.shockDynamicsVerification.shockVelocityValid ? '✓' : '✗'}
                                          </span>
                                          <span className={cn('px-2 py-0.5 rounded text-xs', postdocRecord.shockDynamicsVerification.radiusEvolutionValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                                            半径演化 {postdocRecord.shockDynamicsVerification.radiusEvolutionValid ? '✓' : '✗'}
                                          </span>
                                          <span className={cn('px-2 py-0.5 rounded text-xs', postdocRecord.shockDynamicsVerification.energyConservationValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                                            能量守恒 {postdocRecord.shockDynamicsVerification.energyConservationValid ? '✓' : '✗'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {postdocRecord.comments && (
                                      <p className="text-space-400 text-xs mt-2">评论: <span className="text-space-300">{postdocRecord.comments}</span></p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-space-500 text-xs mt-1">等待博士后进行激波动力学验证</p>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <ArrowRight className="w-4 h-4 text-space-500" />
                            </div>
                            <div className={cn('flex items-start gap-3 p-3 rounded-lg border', professorRecord ? 'border-space-600/50 bg-space-800/30' : 'border-space-700/30 bg-space-800/10 opacity-60')}>
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', professorRecord ? 'bg-supernova-500/20' : 'bg-space-700/30')}>
                                <BookOpen className={cn('w-4 h-4', professorRecord ? 'text-supernova-400' : 'text-space-500')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={cn('font-medium text-sm', professorRecord ? 'text-white' : 'text-space-500')}>教授确认</p>
                                  {professorRecord && <span className={cn('text-xs font-medium', resultMap[professorRecord.status].cls)}>{resultMap[professorRecord.status].label}</span>}
                                  {!professorRecord && <span className="text-xs text-space-500">待处理</span>}
                                </div>
                                {professorRecord ? (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-space-400 text-xs">审批人: <span className="text-space-300">{professorRecord.approver}</span></p>
                                    <p className="text-space-400 text-xs">时间: <span className="text-space-300 font-mono">{fmt(professorRecord.approvedAt)}</span></p>
                                    {professorRecord.nucleosynthesisAssessment && (
                                      <div className="mt-2 space-y-2">
                                        <p className="text-space-300 text-xs font-medium">评估项:</p>
                                        <div className="flex flex-wrap gap-2">
                                          <span className={cn('px-2 py-0.5 rounded text-xs', professorRecord.nucleosynthesisAssessment.ni56YieldValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                                            镍-56产额 {professorRecord.nucleosynthesisAssessment.ni56YieldValid ? '✓' : '✗'}
                                          </span>
                                          <span className={cn('px-2 py-0.5 rounded text-xs', professorRecord.nucleosynthesisAssessment.abundanceDistributionValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                                            丰度分布 {professorRecord.nucleosynthesisAssessment.abundanceDistributionValid ? '✓' : '✗'}
                                          </span>
                                          <span className="px-2 py-0.5 rounded text-xs bg-supernova-500/20 text-supernova-400">
                                            观测匹配度 {professorRecord.nucleosynthesisAssessment.observationMatch}%
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {professorRecord.comments && (
                                      <p className="text-space-400 text-xs mt-2">评论: <span className="text-space-300">{professorRecord.comments}</span></p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-space-500 text-xs mt-1">等待教授进行核合成评估</p>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <ArrowRight className="w-4 h-4 text-space-500" />
                            </div>
                            <div className={cn('flex items-start gap-3 p-3 rounded-lg border', isPushed ? 'border-nickel-500/50 bg-nickel-500/10' : 'border-space-700/30 bg-space-800/10 opacity-60')}>
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', isPushed ? 'bg-nickel-500/20' : 'bg-space-700/30')}>
                                <FileCheck className={cn('w-4 h-4', isPushed ? 'text-nickel-400' : 'text-space-500')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={cn('font-medium text-sm', isPushed ? 'text-white' : 'text-space-500')}>推送到多信使观测提案系统</p>
                                  {isPushed && <span className="text-xs font-medium text-nickel-400">已推送</span>}
                                  {!isPushed && <span className="text-xs text-space-500">待推送</span>}
                                </div>
                                <p className={cn('text-xs mt-1', isPushed ? 'text-space-300' : 'text-space-500')}>
                                  {isPushed ? '模拟结果已正式推送到多信使观测提案系统' : '教授审批通过后将自动推送'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {approvalTaskList.length === 0 && (
                      <motion.div variants={anim.item} className="card p-12 text-center">
                        <Clock className="w-16 h-16 mx-auto text-space-500 opacity-50 mb-4" />
                        <p className="text-space-300 text-lg">暂无审批记录</p>
                        <p className="text-space-500 text-sm mt-1">还没有任何审批流程被发起</p>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </div>
            <AnimatePresence>
              {showSidebar && (
                <motion.aside initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} transition={{ duration: 0.3 }} className="w-72 flex-shrink-0">
                  <div className="card p-5 sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold flex items-center gap-2"><Info className="w-4 h-4 text-space-400" />审批流程说明</h3>
                      <button onClick={() => setShowSidebar(false)} className="text-space-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-4">
                      {flowSteps.map((step, idx) => (
                        <div key={idx} className="relative">
                          {idx < 2 && <div className="flex justify-center -my-2"><ArrowRight className="w-5 h-5 text-space-500" /></div>}
                          <div className={cn('relative pl-6', idx < 2 ? `pb-4 border-l-2 ${step.borderCls}` : '')}>
                            <div className={cn('absolute -left-2 top-0 w-4 h-4 rounded-full flex items-center justify-center', step.bgCls)}><step.icon className="w-2 h-2 text-white" /></div>
                            <p className="text-white font-medium text-sm">{step.title}</p>
                            <p className="text-space-400 text-xs mt-1">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-3 bg-space-800/50 rounded-lg border border-space-700/30">
                      <p className="text-xs text-space-300">当前用户</p>
                      <p className="text-white text-sm font-medium mt-1">{currentUser?.name}</p>
                      <p className="text-space-400 text-xs">{currentUser?.institution}</p>
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {selectedTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  {modalLevel === 'postdoc' ? <Users className="w-5 h-5 text-neutrino-400" /> : <BookOpen className="w-5 h-5 text-supernova-400" />}
                  {levelMap[modalLevel].label}
                </h2>
                <button onClick={() => setSelectedTask(null)} className="text-space-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="mb-4 p-3 bg-space-800/50 rounded-lg border border-space-700/30">
                <p className="text-white font-medium">{selectedTask.name}</p>
                <p className="text-space-400 text-sm mt-1">质量 {selectedTask.parameters.mass}M☉ · 金属丰度 {selectedTask.parameters.metallicity} · 旋转 {selectedTask.parameters.rotationVelocity}km/s</p>
              </div>
              {modalLevel === 'postdoc' ? (
                <div className="space-y-4 mb-6">
                  <h3 className="text-space-200 font-medium text-sm">激波动力学验证</h3>
                  {shockItems.map(item => <Checkbox key={item.key} item={item} form={shockForm} setForm={setShockForm} color="accent-neutrino-500" />)}
                  <div><label className="block text-space-300 text-sm mb-2">评论</label><textarea value={shockForm.comments} onChange={(e) => setShockForm({ ...shockForm, comments: e.target.value })} placeholder="输入验证评论..." className="input-field min-h-[80px] resize-none" /></div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <h3 className="text-space-200 font-medium text-sm">核合成合理性评估</h3>
                  {nucleoItems.map(item => <Checkbox key={item.key} item={item} form={nucleoForm} setForm={setNucleoForm} color="accent-supernova-500" />)}
                  <div>
                    <label className="block text-space-300 text-sm mb-2">观测匹配度: <span className="text-supernova-400 font-mono">{nucleoForm.observationMatch}%</span></label>
                    <input type="range" min="0" max="100" value={nucleoForm.observationMatch} onChange={(e) => setNucleoForm({ ...nucleoForm, observationMatch: parseInt(e.target.value) })} className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-supernova-500" />
                    <div className="flex justify-between text-xs text-space-500 mt-1"><span>0</span><span>50</span><span>100</span></div>
                  </div>
                  <div><label className="block text-space-300 text-sm mb-2">评论</label><textarea value={nucleoForm.comments} onChange={(e) => setNucleoForm({ ...nucleoForm, comments: e.target.value })} placeholder="输入评估评论..." className="input-field min-h-[80px] resize-none" /></div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => handleApproval('rejected')} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"><XCircle className="w-4 h-4" />拒绝</button>
                <button onClick={() => handleApproval('approved')} className="flex-1 bg-nickel-500/20 hover:bg-nickel-500/30 text-nickel-400 border border-nickel-500/50 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />通过</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
