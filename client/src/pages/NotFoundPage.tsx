import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Compass, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 text-center">
      <div className="max-w-md space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Compass className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">404 Error</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The curriculum topic or page you requested does not exist or has been relocated.
          </p>
        </div>
        <div>
          <Link to="/">
            <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
