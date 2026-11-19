import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { GraduationCap, ArrowRight, User, Mail, Lock } from 'lucide-react';

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, fullName);
      showToast('Registration successful! Complete your onboarding.', 'success');
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
            Create Student Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Join LearnSphere to explore subjects, take quizzes, and track mastery
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
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="Academic Email"
                type="email"
                placeholder="jane@university.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                helperText="Use at least 8 characters with a mix of letters and numbers"
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account & Continue
              </Button>
            </CardContent>

            <CardFooter className="justify-center border-t border-slate-100 dark:border-slate-800/60 p-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Already have an account?</span>
              <Link to="/login" className="ml-1 text-slate-900 dark:text-white font-medium hover:underline">
                Sign in here
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
