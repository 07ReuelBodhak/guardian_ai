import Link from 'next/link';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center relative">
            <ShieldAlert className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 border-4 border-slate-50 dark:border-slate-900" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            404
          </h1>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lost in the mainframe
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Guardian couldn't find the page you're looking for. It might have been moved, deleted, or never existed in the first place.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Home className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
