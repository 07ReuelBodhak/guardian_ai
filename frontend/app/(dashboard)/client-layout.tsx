"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Brain, LayoutDashboard, Database, Goal, Activity, Calendar, Shield, Link2, Settings, Menu, X, LogOut, CheckSquare
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: "Tasks", href: "/dashboard/goals", icon: <CheckSquare className="w-5 h-5" /> },
  { name: "Mood", href: "/dashboard/mood", icon: <Activity className="w-5 h-5" /> },
  { name: "Routine", href: "/dashboard/routine", icon: <Calendar className="w-5 h-5" /> },
  { name: "Habits", href: "/dashboard/habits", icon: <Activity className="w-5 h-5" /> },
  { name: "Reports", href: "/dashboard/reports", icon: <Database className="w-5 h-5" /> },
  { name: "Guardian", href: "/dashboard/guardian", icon: <Shield className="w-5 h-5" /> },
  { name: "Connections", href: "/dashboard/connections", icon: <Link2 className="w-5 h-5" /> },
];

const BOTTOM_NAV_ITEMS = [
  { name: "Settings", href: "/dashboard/settings", icon: <Settings className="w-5 h-5" /> },
];

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-[#1E293B] transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } flex flex-col p-6`}>
        <div className="flex items-center gap-3 mb-10">
          <Link href="/dashboard" className="flex items-center space-x-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Guardian AI</span>
          </Link>
          <button 
            className="lg:hidden text-slate-500 shrink-0"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-indigo-50 text-indigo-600 dark:bg-[#1E293B] dark:text-white font-medium" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#64748B] dark:hover:text-white dark:hover:bg-transparent"
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto">
          <nav className="space-y-1 mb-6">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-indigo-50 text-indigo-600 dark:bg-[#1E293B] dark:text-white font-medium" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#64748B] dark:hover:text-white dark:hover:bg-transparent"
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#64748B] dark:hover:text-white dark:hover:bg-transparent"
            >
              <LogOut className="w-5 h-5" />
              Log out
            </button>
          </nav>
          
          <div className="p-4 bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-xl">
            <p className="text-xs text-slate-500 dark:text-[#64748B] font-semibold uppercase tracking-wider mb-2">Caspian SDK Active</p>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm text-emerald-600 dark:text-emerald-500 font-medium">Syncing Platforms</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0F172A] flex-shrink-0">
          <button 
            className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden sm:block text-sm text-slate-500 mr-2">
              Status: <span className="text-emerald-500 font-medium">Online</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
