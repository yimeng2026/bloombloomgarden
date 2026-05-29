import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn, User, Lock, Eye, EyeOff, Mail, Globe, Shield,
  AlertTriangle, CheckCircle, ArrowRight, Github, KeyRound
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  lastLogin: string;
  isAdmin: boolean;
}

const MOCK_USERS: UserProfile[] = [
  {
    id: 'user-001',
    name: '管理员',
    email: 'admin@thousand-realms.garden',
    role: 'admin',
    lastLogin: '2024-01-15T08:30:00Z',
    isAdmin: true,
  },
  {
    id: 'user-002',
    name: '开发者',
    email: 'dev@thousand-realms.garden',
    role: 'developer',
    lastLogin: '2024-01-14T16:20:00Z',
    isAdmin: false,
  },
];

export default function Login() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  // OAuth providers
  const oauthProviders = [
    { id: 'github', name: 'GitHub', icon: <Github className="w-5 h-5" /> },
    { id: 'google', name: 'Google', icon: <Globe className="w-5 h-5" /> },
  ];

  // Check existing session
  useEffect(() => {
    const saved = localStorage.getItem('trg_current_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('trg_current_user');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      // API call (fallback to mock)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.data || data.user;
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('trg_current_user', JSON.stringify(user));
          if (rememberMe) {
            localStorage.setItem('trg_remember_email', email);
          }
          setSuccess('登录成功！');
          setTimeout(() => navigate('/dashboard'), 800);
          return;
        }
      }

      // Mock fallback
      const mockUser = MOCK_USERS.find(u => u.email === email);
      if (mockUser && password.length >= 4) {
        setCurrentUser(mockUser);
        localStorage.setItem('trg_current_user', JSON.stringify(mockUser));
        setSuccess('登录成功（演示模式）');
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        setError('邮箱或密码错误');
      }
    } catch (err: any) {
      // Offline mock login
      const mockUser = MOCK_USERS.find(u => u.email === email);
      if (mockUser && password.length >= 4) {
        setCurrentUser(mockUser);
        localStorage.setItem('trg_current_user', JSON.stringify(mockUser));
        setSuccess('登录成功（离线演示模式）');
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        setError('登录失败: ' + (err.message || '网络错误'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('请填写所有必填项');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('两次输入的密码不一致');
      return;
    }
    if (regPassword.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });

      if (res.ok) {
        setSuccess('注册成功，请登录');
        setIsLoginMode(true);
        setEmail(regEmail);
        setRegName('');
        setRegPassword('');
        setRegConfirm('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '注册失败');
      }
    } catch {
      setError('注册服务暂不可用');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('trg_current_user');
    setSuccess('已退出登录');
  };

  const handleOAuth = (provider: string) => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  // If already logged in, show profile
  if (currentUser) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0f]">
        <Sidebar />
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
              <User className="w-6 h-6 text-blue-400" />
              用户中心
            </h1>

            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xl font-bold">
                  {currentUser.name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{currentUser.name}</h2>
                  <p className="text-gray-400 text-sm">{currentUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${currentUser.isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {currentUser.isAdmin ? '管理员' : '普通用户'}
                    </span>
                    <span className="text-xs text-gray-500">
                      上次登录: {new Date(currentUser.lastLogin).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  安全状态
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">登录状态</span>
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 在线
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">双因素认证</span>
                    <span className="text-gray-500">未启用</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">API密钥</span>
                    <span className="text-blue-400">3 个已配置</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  会话信息
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">会话ID</span>
                    <span className="text-gray-500 font-mono text-xs">{currentUser.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">角色</span>
                    <span className="text-gray-300">{currentUser.role}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">权限</span>
                    <span className="text-gray-300">{currentUser.isAdmin ? '全部权限' : '标准权限'}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">千界花园</h1>
            <p className="text-gray-500 text-sm mt-1">群智协同平台 — 登录</p>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {oauthProviders.map(p => (
              <button
                key={p.id}
                onClick={() => handleOAuth(p.id)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#12121a] border border-gray-800 hover:border-gray-700 rounded-lg text-gray-300 text-sm transition-colors"
              >
                {p.icon}
                {p.name}
              </button>
            ))}
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#0a0a0f] text-gray-500">或使用邮箱</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-[#12121a] border border-gray-800 rounded-lg">
            <button
              onClick={() => { setIsLoginMode(true); setError(null); }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${isLoginMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
              登录
            </button>
            <button
              onClick={() => { setIsLoginMode(false); setError(null); }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${!isLoginMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
              注册
            </button>
          </div>

          {/* Login Form */}
          {isLoginMode ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@thousand-realms.garden"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="输入密码（演示模式任意4位以上）"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-[#12121a] text-blue-600"
                  />
                  <span className="text-sm text-gray-400">记住我</span>
                </label>
                <button type="button" className="text-sm text-blue-400 hover:text-blue-300">
                  忘记密码？
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    登录
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="你的昵称"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="至少6位"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                    placeholder="再次输入密码"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#12121a] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    创建账号
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Demo hint */}
          <div className="mt-6 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <p className="text-xs text-gray-500 text-center">
              演示账号: <span className="text-blue-400">admin@thousand-realms.garden</span> / 任意密码（4位以上）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
