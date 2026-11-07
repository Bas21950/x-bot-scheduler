'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Plus, RefreshCw, Trash2, Edit3, CheckCircle2, AlertCircle, 
  Clock, Play, Pause, ExternalLink, Sparkles, Layers, Sliders, 
  History, ArrowRight, Check, X, ShieldAlert, Copy, Image as ImageIcon,
  Download
} from 'lucide-react';
import UpdateModal, { UpdateInfo } from '@/components/UpdateModal';
import { APP_VERSION } from '@/lib/version';

function XLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface Post {
  id: number;
  content: string;
  image_url: string | null;
  status: 'pending' | 'posted' | 'draft' | 'archived';
  post_count: number;
  created_at: string;
  updated_at: string;
}

interface BotSettings {
  id: number;
  is_active: boolean;
  interval_hours: number;
  post_mode: 'random' | 'sequential';
  last_run_at: string | null;
  updated_at: string;
}

interface PostLog {
  id: number;
  post_id: number | null;
  content: string;
  image_url: string | null;
  tweet_id: string | null;
  status: 'success' | 'failed';
  error_message: string | null;
  posted_at: string;
}

interface CredentialsConfig {
  database: boolean;
  xApiKey: boolean;
  xApiSecret: boolean;
  xAccessToken: boolean;
  xAccessSecret: boolean;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'posts' | 'settings' | 'logs'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [credentials, setCredentials] = useState<CredentialsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // New Post Form State
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postImmediately, setPostImmediately] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Add Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Edit Post Modal
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('pending');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Version & Updates
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('🎉 ติดตั้งแอพลงเครื่องเรียบร้อยแล้ว!', 'success');
    }
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const checkUpdate = async (manual: boolean = false) => {
    try {
      if (manual) setIsCheckingUpdate(true);
      const res = await fetch('/api/check-update');
      const data = await res.json();
      if (data.success) {
        setUpdateInfo(data);
        if (data.hasUpdate) {
          // If automatic check, only show popup if user hasn't dismissed this version in current session
          const dismissed = sessionStorage.getItem('dismissed_update_version');
          if (manual || dismissed !== data.latestVersion) {
            setShowUpdateModal(true);
          }
        } else if (manual) {
          showToast(`คุณใช้งานเวอร์ชันล่าสุดแล้ว (v${APP_VERSION})`, 'success');
        }
      }
    } catch (err: any) {
      if (manual) showToast('ไม่สามารถตรวจสอบการอัปเดตได้: ' + err.message, 'error');
    } finally {
      if (manual) setIsCheckingUpdate(false);
    }
  };

  const handleDismissUpdate = () => {
    if (updateInfo?.latestVersion) {
      sessionStorage.setItem('dismissed_update_version', updateInfo.latestVersion);
    }
    setShowUpdateModal(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPosts, resSettings, resLogs] = await Promise.all([
        fetch('/api/posts').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
      ]);

      if (resPosts.success) setPosts(resPosts.posts);
      if (resSettings.success) {
        setSettings(resSettings.settings);
        setCredentials(resSettings.credentialsConfigured);
      }
      if (resLogs.success) setLogs(resLogs.logs);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkUpdate(false);

    // Check if just updated
    const justUpdated = localStorage.getItem('just_updated_version');
    if (justUpdated) {
      showToast(`🎉 อัปเดตเป็นเวอร์ชัน v${justUpdated} สำเร็จเรียบร้อยแล้ว!`, 'success');
      localStorage.removeItem('just_updated_version');
    }

    // Background Auto-Polling: Check every 20 seconds without needing to refresh
    const intervalId = setInterval(() => {
      checkUpdate(false);
    }, 20000);

    // Window Focus / Tab Switch: Check immediately when user switches to app
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkUpdate(false);
      }
    };
    window.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, []);

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('ขนาดรูปภาพต้องไม่เกิน 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEdit) {
        setEditImage(base64);
      } else {
        setNewImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      setIsSubmitting(true);
      if (postImmediately) {
        // Direct Post to X
        const res = await fetch('/api/post-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newContent, imageUrl: newImage }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('🚀 โพสต์ขึ้น X เรียบร้อยแล้ว!', 'success');
          setNewContent('');
          setNewImage(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          fetchData();
        } else {
          showToast('❌ ไม่สามารถโพสต์ได้: ' + data.error, 'error');
        }
      } else {
        // Save to Queue
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newContent, imageUrl: newImage, status: 'pending' }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('บันทึกเข้าคลังโพสต์แล้ว', 'success');
          setNewContent('');
          setNewImage(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setPosts([data.post, ...posts]);
        } else {
          showToast('เกิดข้อผิดพลาด: ' + data.error, 'error');
        }
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Bulk Add
  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    const lines = bulkText
      .split(/\n---\n|\n\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= 280);

    if (lines.length === 0) {
      showToast('ไม่พบข้อความที่ถูกต้อง (ข้อความต้องไม่ว่างและไม่เกิน 280 อักษร)', 'error');
      return;
    }

    try {
      setBulkSubmitting(true);
      let count = 0;
      for (const line of lines) {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: line, status: 'pending' }),
        });
        if (res.ok) count++;
      }
      showToast(`เพิ่มข้อความเข้าคลังสำเร็จ ${count} รายการ!`, 'success');
      setBulkText('');
      setShowBulkModal(false);
      fetchData();
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการเพิ่มหลายรายการ: ' + err.message, 'error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Handle Immediate Post from Existing Post
  const handlePostNow = async (post: Post) => {
    if (!confirm(`ต้องการโพสต์ข้อความนี้ขึ้น X ทันทีหรือไม่?\n\n"${post.content.slice(0, 60)}..."`)) return;

    try {
      showToast('กำลังส่งโพสต์ขึ้น X...', 'info');
      const res = await fetch('/api/post-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: post.content, imageUrl: post.image_url, postId: post.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 โพสต์ขึ้น X สำเร็จแล้ว!', 'success');
        fetchData();
      } else {
        showToast('❌ โพสต์ไม่สำเร็จ: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  // Delete Post
  const handleDeletePost = async (id: number) => {
    if (!confirm('คุณต้องการลบข้อความนี้ออกจากคลังหรือไม่?')) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.filter(p => p.id !== id));
        showToast('ลบข้อความเรียบร้อย', 'success');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  // Edit Post
  const handleSaveEdit = async () => {
    if (!editingPost || !editContent.trim()) return;
    try {
      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: editContent.trim(), 
          imageUrl: editImage,
          status: editStatus 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => p.id === editingPost.id ? data.post : p));
        setEditingPost(null);
        showToast('อัปเดตข้อความเรียบร้อย', 'success');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  // Update Settings
  const handleUpdateSettings = async (updates: Partial<BotSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        showToast('บันทึกการตั้งค่าแล้ว', 'success');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  // Force Trigger Auto-Post
  const handleForceRunCron = async () => {
    try {
      showToast('กำลังสั่งรัน Auto-Post...', 'info');
      const res = await fetch('/api/cron/auto-post?force=true');
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ทำงานสำเร็จ! โพสต์ ID: ${data.tweetId || 'OK'}`, 'success');
        fetchData();
      } else {
        showToast(`แจ้งเตือน: ${data.message || data.error}`, 'error');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  // Filtering
  const filteredPosts = posts.filter(post => {
    const matchesFilter = filterStatus === 'all' || post.status === filterStatus;
    const matchesSearch = !searchQuery || post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const charsLeft = 280 - newContent.length;
  const isAllKeysReady = credentials && credentials.database && credentials.xApiKey && credentials.xApiSecret && credentials.xAccessToken && credentials.xAccessSecret;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all transform duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30' 
            : toast.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-500/30'
            : 'bg-sky-950/90 text-sky-200 border-sky-500/30'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {toast.type === 'info' && <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/icons/icon-192x192.png" 
              alt="X Bot Scheduler Icon" 
              className="w-10 h-10 rounded-xl shadow-lg border border-sky-500/30 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white">X Auto-Poster & Scheduler</h1>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">OneStop AI</span>
              </div>
              <p className="text-xs text-slate-400">ระบบโพสต์ข้อความและรูปภาพอัตโนมัติด้วย Neon Postgres & Vercel</p>
            </div>
          </div>

          {/* Bot Live Status Pill & Version & PWA Install */}
          <div className="flex items-center gap-2 sm:gap-3">
            {canInstall && (
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 hover:text-white hover:bg-emerald-900 transition font-medium cursor-pointer animate-pulse"
                title="ติดตั้งแอพลงบนหน้า Desktop / มือถือ"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>ติดตั้งแอพ (PWA)</span>
              </button>
            )}

            <button
              onClick={() => checkUpdate(true)}
              disabled={isCheckingUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition cursor-pointer"
              title="คลิกเพื่อตรวจสอบเวอร์ชันใหม่จาก GitHub"
            >
              <Sparkles className={`w-3.5 h-3.5 text-sky-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span className="font-mono">v{APP_VERSION}</span>
              {updateInfo?.hasUpdate && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${settings?.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-medium text-slate-300">
                {settings?.is_active ? `บอททำงานอัตโนมัติ (ทุก ${settings.interval_hours} ชม.)` : 'บอทหยุดชั่วคราว (Paused)'}
              </span>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Warning Banner if API keys are not ready */}
      {!isAllKeysReady && (
        <div className="bg-amber-950/40 border-b border-amber-900/40 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-xs sm:text-sm text-amber-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                ยังไม่ได้กรอก <strong>X API Keys & Access Tokens</strong> ในไฟล์ <code>.env.local</code> (หรือ Vercel Environment Variables) 
              </span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="underline hover:text-white ml-2 flex-shrink-0 font-medium"
            >
              ดูวิธีตั้งค่า
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'posts'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>คลังโพสต์ ({posts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'settings'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>ตั้งค่าบอท</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'logs'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติการโพสต์ ({logs.length})</span>
          </button>
        </div>

        {/* TAB 1: POST BANK */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Quick Composer Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <form onSubmit={handleCreatePost}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>เขียนข้อความและแนบรูปภาพสำหรับโพสต์</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-800/40 hover:bg-sky-900/50 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มข้อความจำนวนมาก (Bulk Add)
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="เขียนข้อความที่ต้องการโพสต์ลง X (รองรับข้อความ, ลิงก์, แฮชแท็ก)..."
                    rows={3}
                    maxLength={280}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-xs font-mono">
                    <span className={charsLeft < 20 ? 'text-rose-400 font-bold' : charsLeft < 50 ? 'text-amber-400' : 'text-slate-500'}>
                      {charsLeft}
                    </span>
                    <span className="text-slate-600">/280</span>
                  </div>
                </div>

                {/* Attached Image Preview */}
                {newImage && (
                  <div className="mt-3 relative inline-block group">
                    <img 
                      src={newImage} 
                      alt="Attached preview" 
                      className="h-28 w-auto rounded-xl object-cover border border-slate-700 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full shadow-lg hover:bg-rose-500 transition"
                      title="ลบรูปภาพ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                  <div className="flex items-center gap-4">
                    {/* Image Attachment Button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleImageChange(e, false)}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        newImage 
                          ? 'bg-sky-950 text-sky-400 border-sky-800' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>{newImage ? 'เปลี่ยนรูปภาพ' : 'แนบรูปภาพ'}</span>
                    </button>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={postImmediately}
                        onChange={(e) => setPostImmediately(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>โพสต์ขึ้น X ทันที (ไม่เข้าคิว)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newContent.trim()}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                        postImmediately
                          ? 'bg-sky-500 hover:bg-sky-400 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : postImmediately ? (
                        <>
                          <Send className="w-4 h-4" />
                          <span>โพสต์ขึ้น X ทันที</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>บันทึกเข้าคลัง</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {['all', 'pending', 'posted', 'draft'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                      filterStatus === st
                        ? 'bg-slate-800 text-sky-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'ทั้งหมด' : st === 'pending' ? 'รอโพสต์' : st === 'posted' ? 'เคยโพสต์แล้ว' : 'ฉบับร่าง'}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="ค้นหาข้อความ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Post List */}
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-300">ยังไม่มีข้อความในคลัง</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  พิมพ์ข้อความด้านบนเพื่อเก็บเข้าคลัง หรือใช้ปุ่ม Bulk Add เพื่อใส่หลายๆ ข้อความพร้อมกัน
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            post.status === 'posted' 
                              ? 'bg-sky-950 text-sky-400 border border-sky-800/50'
                              : post.status === 'pending'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {post.status}
                          </span>
                          {post.post_count > 0 && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              โพสต์ไปแล้ว {post.post_count} ครั้ง
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500">
                          #{post.id}
                        </div>
                      </div>

                      <p className="text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                        {post.content}
                      </p>

                      {/* Post Image Thumbnail */}
                      {post.image_url && (
                        <div className="mt-3">
                          <img 
                            src={post.image_url} 
                            alt="Post attached image" 
                            className="max-h-48 w-full rounded-xl object-cover border border-slate-800"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {new Date(post.created_at).toLocaleDateString('th-TH')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePostNow(post)}
                          className="px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-800/40 text-sky-400 text-xs font-medium flex items-center gap-1 transition"
                          title="ยิงโพสต์นี้ขึ้น X ทันที"
                        >
                          <Send className="w-3 h-3" />
                          <span>โพสต์ทันที</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingPost(post);
                            setEditContent(post.content);
                            setEditImage(post.image_url);
                            setEditStatus(post.status);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                          title="แก้ไข"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            {/* Bot Controls */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-400" />
                <span>การตั้งค่ารอบเวลาและระบบออโต้โพสต์</span>
              </h2>

              {/* Master Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-slate-200">เปิดระบบโพสต์อัตโนมัติ (Master Switch)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    เมื่อเปิดใช้งาน Vercel Cron จะทำการเรียกโพสต์ตามความถี่ที่ตั้งไว้
                  </div>
                </div>
                <button
                  onClick={() => handleUpdateSettings({ is_active: !settings?.is_active })}
                  className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    settings?.is_active ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ${
                      settings?.is_active ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  ความถี่ในการโพสต์ (Interval)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[1, 2, 4, 6, 8, 12, 24].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => handleUpdateSettings({ interval_hours: hrs })}
                      className={`p-3 rounded-xl border text-center transition ${
                        settings?.interval_hours === hrs
                          ? 'border-sky-500 bg-sky-500/10 text-sky-400 font-bold'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm">{hrs} ชั่วโมง</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        {hrs === 1 ? 'ชั่วโมงละครั้ง' : `ทุก ${hrs} ชม.`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  วิธีเลือกข้อความที่จะโพสต์ (Post Selection Strategy)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => handleUpdateSettings({ post_mode: 'random' })}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      settings?.post_mode === 'random'
                        ? 'border-sky-500 bg-sky-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>🎲 สุ่มข้อความ (Random Mode)</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      สุ่มหยิบข้อความจากคลัง เหมาะสำหรับแอคเคานต์แชร์คำคม ทิป หรือเนื้อหาที่วนซ้ำได้
                    </div>
                  </div>

                  <div
                    onClick={() => handleUpdateSettings({ post_mode: 'sequential' })}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      settings?.post_mode === 'sequential'
                        ? 'border-sky-500 bg-sky-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>📋 เรียงตามลำดับ (Sequential Queue)</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      โพสต์ข้อความที่เพิ่งเพิ่มเข้ามาใหม่ตามลำดับก่อน-หลัง (FIFO) เมื่อหมดจะวนซ้ำอันที่โพสต์น้อยที่สุด
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Run & Force Test */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">โพสต์อัตโนมัติล่าสุดเมื่อ:</div>
                  <div className="text-sm font-medium text-slate-200">
                    {settings?.last_run_at ? new Date(settings.last_run_at).toLocaleString('th-TH') : 'ยังไม่เคยรัน'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleForceRunCron}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
                >
                  <Play className="w-3.5 h-3.5 text-sky-400" />
                  <span>ทดสอบยิง Auto-Post ตอนนี้ (Force Test)</span>
                </button>
              </div>
            </div>

            {/* Connection Credentials Check Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>สถานะการเชื่อมต่อ (System Status)</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Neon PostgreSQL Database</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${credentials?.database ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                    {credentials?.database ? 'Connected' : 'Missing DATABASE_URL'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">X API Key & Secret (OAuth 1.0a)</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${credentials?.xApiKey && credentials?.xApiSecret ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                    {credentials?.xApiKey && credentials?.xApiSecret ? 'Configured' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">X Access Token & Secret (Read/Write)</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${credentials?.xAccessToken && credentials?.xAccessSecret ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                    {credentials?.xAccessToken && credentials?.xAccessSecret ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>

              {/* Guide */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                💡 <strong>เมื่อ Deploy ขึ้น Vercel:</strong> ให้นำค่าตัวแปรจากไฟล์ <code>.env.local</code> ไปใส่ในเมนู <strong>Settings &gt; Environment Variables</strong> ของโปรเจกต์บน Vercel แล้ว Vercel Cron จะทำการยิง endpoint <code>/api/cron/auto-post</code> ทุกชั่วโมงอัตโนมัติครับ
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LOGS & HISTORY */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">ประวัติการโพสต์ 30 รายการล่าสุด</h2>
              <button
                onClick={fetchData}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                รีเฟรชประวัติ
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-300">ยังไม่มีประวัติการโพสต์</h3>
                <p className="text-xs text-slate-500 mt-1">
                  เมื่อระบบหรือคุณทำการโพสต์ข้อความ รายการจะถูกบันทึกไว้ที่นี่โดยละเอียด
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-850/50 transition">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            log.status === 'success'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                          }`}>
                            {log.status === 'success' ? 'สำเร็จ' : 'ล้มเหลว'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(log.posted_at).toLocaleString('th-TH')}
                          </span>
                        </div>

                        {log.tweet_id && (
                          <a
                            href={`https://x.com/user/status/${log.tweet_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                          >
                            <span>เปิดดูบน X</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <p className="text-sm text-slate-200 mt-1">{log.content}</p>

                      {log.image_url && (
                        <div className="mt-2">
                          <img 
                            src={log.image_url} 
                            alt="Logged attached image" 
                            className="h-24 w-auto rounded-lg object-cover border border-slate-800"
                          />
                        </div>
                      )}

                      {log.error_message && (
                        <div className="mt-2 text-xs text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-900/30">
                          <strong>ข้อผิดพลาด:</strong> {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: Bulk Add */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>เพิ่มข้อความหลายรายการ (Bulk Add)</span>
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              พิมพ์หรือวางข้อความที่ต้องการเพิ่มลงในคลัง โดยแยกแต่ละโพสต์ด้วยการขึ้นบรรทัดใหม่สองครั้ง หรือคั่นด้วย <code>---</code>
            </p>

            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="ข้อความที่ 1&#10;&#10;---&#10;&#10;ข้อความที่ 2&#10;&#10;---&#10;&#10;ข้อความที่ 3"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 mb-4 resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={bulkSubmitting || !bulkText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {bulkSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>บันทึกทั้งหมดเข้าคลัง</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Post */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <span>แก้ไขข้อความ #{editingPost.id}</span>
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              maxLength={280}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500 mb-3 resize-none"
            />

            {/* Edit Image Attachment */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">รูปภาพประกอบ</label>
              <input
                type="file"
                ref={editFileInputRef}
                onChange={(e) => handleImageChange(e, true)}
                accept="image/*"
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>{editImage ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}</span>
                </button>
                {editImage && (
                  <button
                    type="button"
                    onClick={() => setEditImage(null)}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    ลบรูป
                  </button>
                )}
              </div>
              {editImage && (
                <div className="mt-2">
                  <img src={editImage} alt="Edit preview" className="h-24 w-auto rounded-lg object-cover border border-slate-700" />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">สถานะ</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="pending">รอโพสต์ (pending)</option>
                <option value="posted">เคยโพสต์แล้ว (posted)</option>
                <option value="draft">ฉบับร่าง (draft)</option>
                <option value="archived">เก็บถาวร (archived)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Update Notification */}
      <UpdateModal
        updateInfo={updateInfo}
        isOpen={showUpdateModal}
        onClose={handleDismissUpdate}
      />
    </div>
  );
}
