import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

type PendingAction = 'sign-in' | 'sign-up' | 'reset-password' | null;

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码。');
      return;
    }

    setError(null);
    setStatus(null);
    setPendingAction('sign-in');
    await signInWithEmailAndPassword(auth, email.trim(), password).catch((nextError: unknown) => {
      setError(nextError instanceof Error ? nextError.message : '登录失败');
    });
    setPendingAction(null);
  }

  async function handleSignUp() {
    if (!email.trim() || !password.trim()) {
      setError('请先输入邮箱和密码。');
      return;
    }

    setError(null);
    setStatus(null);
    setPendingAction('sign-up');
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password).catch(
      (nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : '注册失败');
        return null;
      }
    );

    if (result?.user) {
      await setDoc(
        doc(db, 'users', result.user.uid),
        {
          email: result.user.email,
          createdAt: result.user.metadata.creationTime ?? null,
        },
        { merge: true }
      );
    }

    setPendingAction(null);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('请先输入邮箱地址。');
      setStatus(null);
      return;
    }

    setError(null);
    setStatus(null);
    setPendingAction('reset-password');
    await sendPasswordResetEmail(auth, email.trim())
      .then(() => {
        setStatus(`已向 ${email.trim()} 发送重置密码邮件。`);
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : '发送重置密码邮件失败');
      });
    setPendingAction(null);
  }

  return (
    <div className="syncclip-login min-h-screen relative isolate overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="syncclip-floating-shape bg-blue-400 w-80 h-80 -top-16 -left-14" />
      <div className="syncclip-floating-shape bg-indigo-400 w-[420px] h-[420px] -bottom-24 -right-24" />
      <div className="syncclip-floating-shape bg-pink-300 w-72 h-72 top-1/4 left-1/2" />

      <div className="absolute top-8 right-8 z-20">
        <button
          type="button"
          className="syncclip-glass-card p-3 rounded-full text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform"
          onClick={toggleTheme}
          aria-label="切换主题"
        >
          <span className="material-symbols-rounded block dark:hidden">
            dark_mode
          </span>
          <span className="material-symbols-rounded hidden dark:block">
            light_mode
          </span>
        </button>
      </div>

      <div
        data-testid="login-glass-card"
        className="syncclip-glass-card relative z-10 w-full max-w-md rounded-[1.75rem] p-8 md:p-10 border border-white/40 dark:border-white/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
            <span className="material-symbols-rounded text-white text-4xl">content_paste_go</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Clipboard Bridge</h1>
          <p className="text-slate-600 dark:text-slate-400 text-center text-sm leading-relaxed">
            登录后即可同步剪贴板历史，在任意设备即时访问你的数据。
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignIn}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1" htmlFor="email">
              邮箱地址
            </label>
            <div className="relative group">
              <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                mail
              </span>
              <input
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:text-white"
                id="email"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
                密码
              </label>
              <button
                type="button"
                className="text-xs text-indigo-500 font-medium hover:underline disabled:opacity-70"
                onClick={handleForgotPassword}
                disabled={pendingAction !== null}
              >
                忘记密码？
              </button>
            </div>
            <div className="relative group">
              <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                lock
              </span>
              <input
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:text-white"
                id="password"
                placeholder="请输入密码"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowPassword((current) => !current)}
              >
                <span className="material-symbols-rounded text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-1">
            <input
              id="remember"
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 bg-white/50"
            />
            <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400">
              在此设备记住我
            </label>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-300" role="alert">
              {error}
            </p>
          )}
          {status && (
            <p className="text-sm text-emerald-600 dark:text-emerald-300" role="status">
              {status}
            </p>
          )}

          <button
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            type="submit"
            disabled={pendingAction !== null}
          >
            {pendingAction === 'sign-in' ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 text-slate-500 dark:text-slate-400 syncclip-glass-card rounded-full py-0.5">
              或使用以下方式
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 syncclip-glass-card rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors text-slate-700 dark:text-slate-200 text-sm font-semibold"
          >
            <span className="material-symbols-rounded text-base">language</span>
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 syncclip-glass-card rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors text-slate-700 dark:text-slate-200 text-sm font-semibold"
          >
            <span className="material-symbols-rounded text-base">laptop_mac</span>
            Apple
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          还没有账号？
          <button
            type="button"
            className="text-indigo-500 font-bold hover:underline ml-1 disabled:opacity-70"
            onClick={handleSignUp}
            disabled={pendingAction !== null}
          >
            {pendingAction === 'sign-up' ? '注册中...' : '免费注册'}
          </button>
        </p>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="text-xs text-slate-500 dark:text-slate-500">© 2026 Clipboard Bridge. All rights reserved.</p>
      </div>
    </div>
  );
}
