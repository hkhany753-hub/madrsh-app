import { useState } from 'react';
import { GraduationCap, Mail, Lock, User, AtSign, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Input } from '@/components/Form';

export function AuthPage({ onBack }: { onBack?: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password, displayName, username);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        // The session is created immediately since email confirmation is off
        // The auth state change listener will handle the redirect
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      {/* Back to landing */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-[calc(50%+270px)] right-1/2 translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white interactive z-10 whitespace-nowrap"
        >
          بازگشت به صفحه اصلی
        </button>
      )}

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-primary-10 border border-primary-20 mb-4">
            <GraduationCap size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">MADRSH</h1>
          <p className="text-sm text-zinc-400 mt-1">پلتفرم مدیریت مطالعه و کنکور</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl">
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl mb-6">
            <button
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold interactive ${
                mode === 'signin' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              ورود
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold interactive ${
                mode === 'signup' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              ثبت‌نام
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">نام نمایشی</label>
                  <Input
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="نام خود را وارد کنید"
                    icon={<User size={18} />}
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">نام کاربری</label>
                  <Input
                    value={username}
                    onChange={setUsername}
                    placeholder="username"
                    icon={<AtSign size={18} />}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-zinc-400 mb-2">ایمیل</label>
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="email@example.com"
                icon={<Mail size={18} />}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">رمز عبور</label>
              <Input
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                icon={<Lock size={18} />}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : mode === 'signin' ? (
                'ورود به حساب'
              ) : (
                'ایجاد حساب'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          با ورود یا ثبت‌نام، شما قوانین MADRSH را می‌پذیرید
        </p>
      </div>
    </div>
  );
}
