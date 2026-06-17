import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Atom, Zap, AlertTriangle, Plus, Edit2, Trash2, Star, Eye, X, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ConfigItem, WarningThresholds } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';

type TabType = 'eos' | 'network' | 'threshold';

const tabVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }, exit: { opacity: 0, y: -20, transition: { duration: 0.2 } } };
const modalVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } } };
const mockNuclides = ['H-1', 'He-4', 'C-12', 'O-16', 'Ne-20', 'Mg-24', 'Si-28', 'S-32', 'Ar-36', 'Ca-40', 'Ti-44', 'Fe-56', 'Ni-56', 'Ni-58', 'Ge-68'];
const thresholdRanges: Record<keyof WarningThresholds, [number, number]> = { shockStagnationTime: [100, 2000], neutrinoEnergyMin: [1e50, 1e53], neutrinoEnergyMax: [1e51, 1e55], ni56DeviationThreshold: [5, 50], convergenceRateThreshold: [0.8, 0.99] };

export default function Settings() {
  const { equationsOfState, reactionNetworks, warningThresholds } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('eos');
  const [eosList, setEosList] = useState<ConfigItem[]>(equationsOfState);
  const [networkList, setNetworkList] = useState<ConfigItem[]>(reactionNetworks);
  const [thresholds, setThresholds] = useState<WarningThresholds>(warningThresholds);
  const [showEosModal, setShowEosModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [editingEos, setEditingEos] = useState<ConfigItem | null>(null);
  const [eosForm, setEosForm] = useState({ name: '', version: '', description: '' });
  const [networkForm, setNetworkForm] = useState({ name: '', version: '', description: '', nuclideCount: 20 });

  const tabs = [{ id: 'eos' as TabType, label: '状态方程管理', icon: Atom }, { id: 'network' as TabType, label: '核反应网络', icon: Zap }, { id: 'threshold' as TabType, label: '预警阈值配置', icon: AlertTriangle }];
  const thresholdFields = [{ key: 'shockStagnationTime' as const, label: '激波停滞临界时间', unit: 'ms', desc: '激波停滞超过此时间触发预警' }, { key: 'neutrinoEnergyMin' as const, label: '中微子能量最小值', unit: 'erg/s', desc: '中微之光度低于此值触发预警' }, { key: 'neutrinoEnergyMax' as const, label: '中微子能量最大值', unit: 'erg/s', desc: '中微之光度高于此值触发预警' }, { key: 'ni56DeviationThreshold' as const, label: '镍-56偏差阈值', unit: '%', desc: '同一前身星产额偏差超过此值预警' }, { key: 'convergenceRateThreshold' as const, label: '核网络收敛率阈值', unit: '', desc: '收敛率低于此值触发预警' }];

  const setDefaultEos = (id: string) => setEosList(prev => prev.map(item => ({ ...item, isDefault: item.id === id })));
  const deleteEos = (id: string) => setEosList(prev => prev.filter(item => item.id !== id));
  const openEditEos = (eos: ConfigItem) => { setEditingEos(eos); setEosForm({ name: eos.name, version: eos.version, description: eos.description }); setShowEosModal(true); };

  const handleSaveEos = () => {
    if (!eosForm.name || !eosForm.version) return;
    if (editingEos) {
      setEosList(prev => prev.map(item => item.id === editingEos.id ? { ...item, ...eosForm } : item));
    } else {
      setEosList([...eosList, { id: `eos-${Date.now()}`, ...eosForm, isDefault: false, createdAt: new Date() }]);
    }
    setShowEosModal(false);
    setEditingEos(null);
    setEosForm({ name: '', version: '', description: '' });
  };

  const setDefaultNetwork = (id: string) => setNetworkList(prev => prev.map(item => ({ ...item, isDefault: item.id === id })));
  const deleteNetwork = (id: string) => setNetworkList(prev => prev.filter(item => item.id !== id));

  const handleSaveNetwork = () => {
    if (!networkForm.name || !networkForm.version) return;
    setNetworkList([...networkList, { id: `net-${Date.now()}`, name: networkForm.name, version: networkForm.version, description: networkForm.description, isDefault: false, createdAt: new Date() }]);
    setShowNetworkModal(false);
    setNetworkForm({ name: '', version: '', description: '', nuclideCount: 20 });
  };

  const validateThreshold = (key: keyof WarningThresholds, value: number): boolean => {
    const [min, max] = thresholdRanges[key];
    return value >= min && value <= max;
  };

  const handleThresholdChange = (key: keyof WarningThresholds, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) setThresholds(prev => ({ ...prev, [key]: num }));
  };

  const Modal = ({ show, onClose, title, icon: Icon, iconColor, children }: { show: boolean; onClose: () => void; title: string; icon: any; iconColor: string; children: React.ReactNode }) => (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative card p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Icon className={`w-5 h-5 ${iconColor}`} />{title}</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-space-700/50 text-space-400"><X className="w-5 h-5" /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-space-50 glow-text flex items-center gap-3"><SettingsIcon className="w-8 h-8 text-neutrino-400" />系统配置</h1>
          <p className="text-space-300 mt-2">管理状态方程、核反应网络和预警阈值配置</p>
        </motion.div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 whitespace-nowrap', activeTab === tab.id ? 'bg-space-600 text-white shadow-glow-blue' : 'bg-space-800/50 text-space-300 hover:bg-space-700/50 border border-space-700/50')}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'eos' && (
            <motion.div key="eos" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="card p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Atom className="w-5 h-5 text-neutrino-400" />状态方程列表</h2>
                <button onClick={() => { setEditingEos(null); setEosForm({ name: '', version: '', description: '' }); setShowEosModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />添加新状态方程</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-space-700/50">{['名称', '版本', '描述', '默认', '创建时间', '操作'].map(h => <th key={h} className="text-left py-3 px-4 text-space-300 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {eosList.map((eos) => (
                      <tr key={eos.id} className={cn('border-b border-space-700/30 hover:bg-space-700/20 transition-colors', eos.isDefault && 'bg-neutrino-500/10')}>
                        <td className="py-3 px-4 text-white font-medium">{eos.name}</td>
                        <td className="py-3 px-4 text-space-300 font-mono">{eos.version}</td>
                        <td className="py-3 px-4 text-space-400 max-w-xs truncate">{eos.description}</td>
                        <td className="py-3 px-4 text-center">{eos.isDefault ? <Star className="w-5 h-5 text-germanium-400 mx-auto fill-germanium-400" /> : <span className="text-space-500">—</span>}</td>
                        <td className="py-3 px-4 text-space-400 text-sm font-mono">{formatDateTime(eos.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {!eos.isDefault && <button onClick={() => setDefaultEos(eos.id)} className="p-1.5 rounded-lg hover:bg-germanium-500/20 text-germanium-400 transition-colors" title="设为默认"><CheckCircle2 className="w-4 h-4" /></button>}
                            <button onClick={() => openEditEos(eos)} className="p-1.5 rounded-lg hover:bg-space-500/20 text-space-300 transition-colors" title="编辑"><Edit2 className="w-4 h-4" /></button>
                            {!eos.isDefault && <button onClick={() => deleteEos(eos.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'network' && (
            <motion.div key="network" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-supernova-400" />核反应网络</h2>
                <button onClick={() => setShowNetworkModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />添加新网络</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {networkList.map((network) => (
                  <motion.div key={network.id} whileHover={{ y: -4 }} className={cn('card p-5 relative overflow-hidden', network.isDefault && 'border-germanium-500/50 shadow-glow-green')}>
                    {network.isDefault && <div className="absolute top-0 right-0 bg-germanium-500 text-space-950 text-xs font-bold px-2 py-1 rounded-bl-lg">默认</div>}
                    <h3 className="text-xl font-bold text-white mb-1">{network.name}</h3>
                    <p className="text-space-400 font-mono text-sm mb-3">v{network.version}</p>
                    <p className="text-space-300 text-sm mb-4">{network.description}</p>
                    <div className="flex items-center gap-4 mb-4 text-sm"><span className="text-space-400"><Atom className="w-4 h-4 inline mr-1 text-neutrino-400" />{parseInt(network.description) || 20} 种核素</span></div>
                    <div className="flex gap-2">
                      {!network.isDefault && <button onClick={() => setDefaultNetwork(network.id)} className="flex-1 btn-secondary text-sm py-1.5">设为默认</button>}
                      <button onClick={() => alert(`${network.name} 详情:\n核素: ${mockNuclides.join(', ')}\n反应式: ${150 + Math.floor(Math.random() * 200)} 个`)} className="flex-1 btn-primary text-sm py-1.5 flex items-center justify-center gap-1"><Eye className="w-3 h-3" />查看详情</button>
                      {!network.isDefault && <button onClick={() => deleteNetwork(network.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'threshold' && (
            <motion.div key="threshold" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="card p-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6"><AlertTriangle className="w-5 h-5 text-supernova-400" />预警阈值配置</h2>
              <div className="space-y-6">
                {thresholdFields.map((field) => {
                  const isValid = validateThreshold(field.key, thresholds[field.key]);
                  const [min, max] = thresholdRanges[field.key];
                  return (
                    <div key={field.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-4">
                        <label className="block text-white font-medium mb-1">{field.label}</label>
                        <p className="text-space-400 text-sm">{field.desc}</p>
                        <p className="text-space-500 text-xs mt-1">范围: {min}-{max} {field.unit}</p>
                      </div>
                      <div className="md:col-span-6">
                        <div className="flex items-center gap-2">
                          <input type="number" value={thresholds[field.key]} onChange={(e) => handleThresholdChange(field.key, e.target.value)} step={field.key === 'convergenceRateThreshold' ? 0.01 : field.key.includes('neutrino') ? 1e50 : 1} className={cn('input-field font-mono flex-1', !isValid && 'border-red-500 focus:border-red-400 focus:ring-red-500/30')} />
                          {field.unit && <span className="text-space-400 w-16">{field.unit}</span>}
                        </div>
                        {!isValid && <p className="text-red-400 text-xs mt-1">⚠️ 输入值超出有效范围</p>}
                      </div>
                      <div className="md:col-span-2 flex justify-end">{isValid ? <CheckCircle2 className="w-5 h-5 text-nickel-400" /> : <X className="w-5 h-5 text-red-400" />}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-space-700/50">
                <button onClick={() => setThresholds(warningThresholds)} className="btn-secondary flex items-center gap-2"><RotateCcw className="w-4 h-4" />恢复默认</button>
                <button onClick={() => alert('阈值配置已保存！')} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />保存配置</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Modal show={showEosModal} onClose={() => setShowEosModal(false)} title={editingEos ? '编辑状态方程' : '添加新状态方程'} icon={Atom} iconColor="text-neutrino-400">
          <div className="space-y-4">
            <div><label className="block text-space-300 text-sm mb-1">名称 *</label><input type="text" value={eosForm.name} onChange={(e) => setEosForm({ ...eosForm, name: e.target.value })} className="input-field" placeholder="如: LS220" /></div>
            <div><label className="block text-space-300 text-sm mb-1">版本 *</label><input type="text" value={eosForm.version} onChange={(e) => setEosForm({ ...eosForm, version: e.target.value })} className="input-field font-mono" placeholder="如: 2.0" /></div>
            <div><label className="block text-space-300 text-sm mb-1">描述</label><textarea value={eosForm.description} onChange={(e) => setEosForm({ ...eosForm, description: e.target.value })} className="input-field min-h-[80px]" placeholder="输入状态方程描述..." /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowEosModal(false)} className="btn-secondary">取消</button><button onClick={handleSaveEos} className="btn-primary">保存</button></div>
        </Modal>

        <Modal show={showNetworkModal} onClose={() => setShowNetworkModal(false)} title="添加新核反应网络" icon={Zap} iconColor="text-supernova-400">
          <div className="space-y-4">
            <div><label className="block text-space-300 text-sm mb-1">名称 *</label><input type="text" value={networkForm.name} onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })} className="input-field" placeholder="如: alpha-network" /></div>
            <div><label className="block text-space-300 text-sm mb-1">版本 *</label><input type="text" value={networkForm.version} onChange={(e) => setNetworkForm({ ...networkForm, version: e.target.value })} className="input-field font-mono" placeholder="如: 4.0" /></div>
            <div><label className="block text-space-300 text-sm mb-1">描述</label><textarea value={networkForm.description} onChange={(e) => setNetworkForm({ ...networkForm, description: e.target.value })} className="input-field min-h-[80px]" placeholder="输入网络描述..." /></div>
            <div><label className="block text-space-300 text-sm mb-1">核素数量</label><input type="number" value={networkForm.nuclideCount} onChange={(e) => setNetworkForm({ ...networkForm, nuclideCount: parseInt(e.target.value) || 0 })} className="input-field font-mono" min="1" /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowNetworkModal(false)} className="btn-secondary">取消</button><button onClick={handleSaveNetwork} className="btn-primary">保存</button></div>
        </Modal>
      </div>
    </div>
  );
}
