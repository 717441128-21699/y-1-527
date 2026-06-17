import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search, User, LogOut, ChevronDown } from 'lucide-react';
import Sidebar from './Sidebar';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const pageTitleMap: Record<string, string> = {
  '/': '首页看板',
  '/tasks': '任务管理',
  '/tasks/create': '创建模拟任务',
  '/monitoring': '监控中心',
  '/alerts': '预警中心',
  '/approvals': '审批中心',
  '/reports': '报告中心',
  '/export': '数据导出',
  '/recommendations': '智能推荐',
  '/statistics': '统计看板',
  '/settings': '系统配置',
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser, warnings } = useStore();
  const pendingWarningsCount = warnings.filter(w => w.status === 'pending').length;
  const pageTitle = pageTitleMap[location.pathname] || '超新星模拟平台';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    document.title = `${pageTitle} - 超新星模拟平台`;
  }, [location.pathname, pageTitle]);

  const handleUserMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    console.log('退出登录');
  };

  const handleProfile = () => {
    setUserMenuOpen(false);
    console.log('查看个人信息');
  };

  return (
    <div className="flex h-screen bg-space-950 overflow-hidden">
      <div className="bg-star-pattern bg-[length:300px_300px] opacity-20 absolute inset-0 pointer-events-none" />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <div className="lg:hidden fixed inset-y-0 left-0 z-50">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <header className="h-16 bg-space-950/80 backdrop-blur-md border-b border-space-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-space-300 hover:text-white hover:bg-space-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-display font-semibold text-white">{pageTitle}</h2>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-400" />
              <input
                type="text"
                placeholder="搜索任务、预警..."
                className="w-full pl-10 pr-4 py-2 bg-space-900 border border-space-700 rounded-lg text-sm text-white placeholder-space-400 focus:outline-none focus:border-supernova-500 focus:ring-1 focus:ring-supernova-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/alerts')}
              className="relative p-2 rounded-lg text-space-300 hover:text-white hover:bg-space-800 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {pendingWarningsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-supernova-500 text-white text-xs font-bold rounded-full shadow-glow-orange">
                  {pendingWarningsCount > 99 ? '99+' : pendingWarningsCount}
                </span>
              )}
            </button>

            <div className="relative" data-user-menu>
              <button
                onClick={handleUserMenuToggle}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-space-800 transition-colors"
              >
                <img
                  src={currentUser?.avatar}
                  alt={currentUser?.name}
                  className="w-8 h-8 rounded-full border-2 border-neutrino-500 object-cover"
                />
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-space-300 transition-transform',
                    userMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-space-900 border border-space-700 rounded-xl shadow-card overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-space-800">
                      <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                      <p className="text-xs text-space-300 truncate">{currentUser?.email}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleProfile}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-space-200 hover:bg-space-800 hover:text-white transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>个人信息</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-supernova-400 hover:bg-space-800 hover:text-supernova-300 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
