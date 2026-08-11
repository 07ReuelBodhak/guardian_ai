import Link from "next/link";
import { Brain } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-12">
      <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Guardian</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} Guardian AI. All rights reserved.
        </p>
        <div className="flex gap-4">
          <Link href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Twitter</Link>
          <Link href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">GitHub</Link>
          <Link href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Discord</Link>
        </div>
      </div>
    </footer>
  );
}
