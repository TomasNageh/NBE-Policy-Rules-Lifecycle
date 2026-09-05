import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileCheck2, 
  Layers, 
  History, 
  Server, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Database,
  ArrowUpRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    status: string;
  };
}

const fetchHealth = async (): Promise<HealthResponse> => {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
};

export const DashboardPage: React.FC = () => {
  const { data: health, isLoading, isError, error } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <AppHeader currentModule="Dashboard & System Status" />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Formal Welcome Banner */}
        <section className="bg-white border-l-4 border-[#8B1D2C] border-y border-r border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B1D2C]">
                <Sparkles className="w-3.5 h-3.5" />
                Enterprise Governance Platform
              </div>
              <h2 className="text-2xl font-bold text-[#0F2042] tracking-tight">
                Welcome to NBE Policy Management System
              </h2>
              <p className="text-sm text-slate-600 max-w-3xl">
                Centralized lifecycle governance for National Bank of Egypt policies, standard operating procedures, 
                regulatory compliance rules, and operational guidelines.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 px-4 py-2 text-right">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider">Classification</div>
                <div className="text-xs font-bold text-[#0F2042] flex items-center gap-1.5 justify-end">
                  <Lock className="w-3 h-3 text-[#8B1D2C]" />
                  Confidential / Internal Only
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Health & Environment Monitor Widget */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* API Health Status */}
          <div className="bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-600" />
                Backend Core API
              </span>
              <span className="text-[10px] uppercase font-mono">GET /api/health</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {isLoading ? (
                    <span className="text-sm text-slate-500">Checking...</span>
                  ) : isError ? (
                    <span className="text-sm text-red-600 font-semibold">Offline</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 uppercase text-sm font-bold">
                        {health?.status || 'OK'}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isError ? (error as Error).message : 'Express + TypeScript'}
                </p>
              </div>
              <div className="w-2.5 h-2.5 bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Database Target */}
          <div className="bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-600" />
                Database Engine
              </span>
              <span className="text-[10px] uppercase font-mono">Prisma ORM</span>
            </div>
            <div className="mt-3">
              <div className="text-sm font-bold text-slate-900">PostgreSQL</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Schema: <span className="font-mono text-slate-700">public</span>
              </p>
            </div>
          </div>

          {/* Uptime / Runtime */}
          <div className="bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                Service Uptime
              </span>
              <span className="text-[10px] uppercase font-mono">Live</span>
            </div>
            <div className="mt-3">
              <div className="text-sm font-bold text-slate-900 font-mono">
                {health?.uptimeSeconds !== undefined ? `${health.uptimeSeconds}s active` : 'Active'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Env: <span className="font-semibold">{health?.environment || 'development'}</span>
              </p>
            </div>
          </div>

          {/* Brand & Theme Confirmation */}
          <div className="bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-600" />
                Brand Token Status
              </span>
              <span className="text-[10px] uppercase font-mono">Design System</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-[#8B1D2C] border border-slate-300" title="NBE Deep Red #8B1D2C" />
                <span className="w-4 h-4 bg-[#0F2042] border border-slate-300" title="NBE Navy #0F2042" />
                <span className="w-4 h-4 bg-[#C89738] border border-slate-300" title="NBE Gold #C89738" />
              </div>
              <span className="text-xs font-semibold text-slate-800">NBE Official Tokens Active</span>
            </div>
          </div>
        </section>

        {/* Feature Modules Scaffolding Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F2042] uppercase tracking-wider">
              Governance Modules (Ready for Lifecycle Implementation)
            </h3>
            <span className="text-xs text-slate-500">Prompt 0 Scaffolding Complete</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Module 1: Policy Registry */}
            <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="space-y-3">
                <div className="w-9 h-9 bg-slate-100 border border-slate-200 flex items-center justify-center text-[#8B1D2C]">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0F2042]">Policy Repository & Rules</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Repository of regulatory documents, circulars, and departmental compliance rules.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 font-mono text-[11px]">Lifecycle Module</span>
                <span className="text-[#8B1D2C] font-semibold flex items-center gap-1">
                  Ready <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Module 2: Version Control & Review Workflows */}
            <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="space-y-3">
                <div className="w-9 h-9 bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0F2042]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0F2042]">Version Control & Workflows</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Four-eye principle review, approval matrices, and multi-stage lifecycle state management.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 font-mono text-[11px]">Workflow Engine</span>
                <span className="text-[#8B1D2C] font-semibold flex items-center gap-1">
                  Ready <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Module 3: Audit Trail & Compliance */}
            <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="space-y-3">
                <div className="w-9 h-9 bg-slate-100 border border-slate-200 flex items-center justify-center text-[#C89738]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0F2042]">Audit Trail & Verification</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Immutable audit logs, version diff comparisons, and regulatory examination exports.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 font-mono text-[11px]">Audit Engine</span>
                <span className="text-[#8B1D2C] font-semibold flex items-center gap-1">
                  Ready <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} National Bank of Egypt (NBE). All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Security Level: Tier-1 Enterprise</span>
            <span>•</span>
            <span>Version: 1.0.0-rc</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
