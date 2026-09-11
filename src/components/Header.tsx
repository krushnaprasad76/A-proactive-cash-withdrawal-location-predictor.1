import React from 'react';
import {
  Shield,
  Layers,
  Cpu,
  RefreshCw,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface HeaderProps {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  blockHeight: number;
  syncLatencyMs: number;
  isVerifyingChain?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  availableUsers,
  onSelectUser,
  activeTab,
  onSelectTab,
  blockHeight,
  syncLatencyMs,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'investigator':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'auditor':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'analyst':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Command & GIS', icon: Shield },
    { id: 'blockchain', label: 'Blockchain & Audit Ledger', icon: Layers },
    { id: 'migration', label: 'Zero-Downtime Migration', icon: RefreshCw },
    { id: 'ai-studio', label: 'AI Streaming & Auto-Train', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0c1220]/95 backdrop-blur-md">
      {/* Top operational bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 px-4 py-2 text-xs text-slate-400 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Cluster Consensus Active
          </span>
          <span className="text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">
            Quorum: <strong className="text-slate-200">5/5 Nodes</strong> (Byzantine Proof-of-Authority)
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-slate-400">
            Active Node: <span className="font-mono text-cyan-400">{currentUser.clusterNodeId}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700/60">
            <span className="text-slate-400 text-[11px]">Block Height:</span>
            <span className="text-amber-400 font-bold">#{blockHeight}</span>
          </div>

          <div className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700/60">
            <span className="text-slate-400 text-[11px]">Cross-Chain Sync:</span>
            <span className="text-emerald-400 font-bold">{syncLatencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl font-display">
                NULL-AI <span className="text-blue-400 font-normal">v3.0</span>
              </h1>
              <span className="hidden md:inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/30">
                Blockchain & AI Security
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Decentralized Transaction Auditing • Zero-Downtime Migration • Real-Time AI Auto-Train
            </p>
          </div>
        </div>

        {/* User Role Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-left transition hover:border-slate-600 hover:bg-slate-800"
          >
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className={`inline-block rounded px-1.5 py-0.2 border text-[10px] uppercase font-bold tracking-wider ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </span>
                <span className="text-slate-400 hidden lg:inline truncate max-w-[140px]">{currentUser.badgeNumber}</span>
              </div>
            </div>
            <UserCheck className="h-4 w-4 text-blue-400 sm:hidden" />
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-700 bg-[#0f172a] p-2 shadow-2xl z-50">
              <div className="border-b border-slate-800 px-3 py-2 text-xs">
                <span className="text-slate-400">Switch Role-Based Perspective:</span>
              </div>
              <div className="mt-1 space-y-1">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      setShowUserMenu(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                      currentUser.id === user.id
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{user.name}</span>
                      <span className={`rounded px-1.5 py-0.2 border text-[9px] uppercase font-bold ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{user.agency}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="flex space-x-1 overflow-x-auto border-t border-slate-800/80 px-4 sm:px-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium transition ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
