import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Atom,
  Activity,
  AlertTriangle,
  CheckSquare,
  FileText,
  Download,
  Sparkles,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { path: '/', label: '首页看板', icon: LayoutDashboard },
  { path: '/tasks', label: '任务管理', icon: Atom },
  { path: '/monitoring', label: '监控中心', icon: Activity },
  { path: '/alerts', label: '预警中心', icon: AlertTriangle },
  { path: '/approvals', label: '审批中心', icon: CheckSquare },
  { path: '/reports', label: '报告中心', icon: FileText },
  { path: '/export', label: '数据导出', icon: Download },
  { path: '/recommendations', label: '智能推荐', icon: Sparkles },
  { path: '/statistics', label: '统计看板', icon: BarChart3 },
  { path: '/settings', label: '系统配置', icon: Settings },
]

const currentUser = {
  name: '张博士',
  role: '博士后研究员',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supernova',
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      className="relative h-screen bg-space-950 border-r border-space-800 flex flex-col overflow-hidden"
    >
      <div className="bg-star-pattern bg-[length:200px_200px] opacity-30 absolute inset-0 pointer-events-none" />

      <div className="relative z-10 p-4 flex items-center justify-between border-b border-space-800">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-supernova-500 to-neutrino-600 flex items-center justify-center shadow-glow-orange"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Rocket className="w-5 h-5 text-white" />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="overflow-hidden"
              >
                <h1 className="text-lg font-display font-bold text-white whitespace-nowrap">超新星模拟平台</h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <nav className="relative z-10 flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-space-800 text-supernova-400 shadow-glow-orange'
                  : 'text-space-200 hover:bg-space-900 hover:text-white'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-supernova-500 rounded-r-full"
                />
              )}
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'animate-pulse-slow')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}
      </nav>

      <div className="relative z-10 p-3 border-t border-space-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-space-900/50">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full border-2 border-neutrino-500 object-cover"
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden"
              >
                <p className="text-sm font-medium text-white whitespace-nowrap">{currentUser.name}</p>
                <p className="text-xs text-space-300 whitespace-nowrap">{currentUser.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {collapsed && <User className="w-5 h-5 text-space-300" />}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-6 -right-3 z-20 w-6 h-6 rounded-full bg-space-800 border border-space-700 flex items-center justify-center text-space-300 hover:text-white hover:bg-supernova-600 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  )
}
