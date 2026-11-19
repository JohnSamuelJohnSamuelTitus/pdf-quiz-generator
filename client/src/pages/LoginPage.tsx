import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { GraduationCap, ArrowRight, Sparkles, Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      showToast('Welcome back! Logged in successfully.', 'success');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('student@learnsphere.edu');
    setPassword('Password123!');
    setError(null);
    setIsSubmitting(true);

    try {
      await login('student@learnsphere.edu', 'Password123!');
      showToast('Logged in as Demo Student (Alex Morgan).', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 items-center justify-center shadow-subtle mb-2">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Sign in to LearnSphere
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your credentials to access your academic dashboard
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <Input
                label="Academic Email"
                type="email"
                placeholder="student@university.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-medium">
                    Evaluator Shortcut
                  </span>
                </div>
              </div>

              {/* Instant Demo Login Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                size="sm"
                onClick={handleDemoLogin}
                isLoading={isSubmitting}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              >
                One-Click Demo Student Sign In
              </Button>
            </CardContent>

            <CardFooter className="justify-center border-t border-slate-100 dark:border-slate-800/60 p-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Don't have an account yet?</span>
              <Link to="/register" className="ml-1 text-slate-900 dark:text-white font-medium hover:underline">
                Register here
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
