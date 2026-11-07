'use client';

import React, { useState } from 'react';
import { 
  Sparkles, RefreshCw, X, ExternalLink, Calendar, CheckCircle2, 
  ArrowRight, ShieldCheck, Zap
} from 'lucide-react';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  releaseUrl?: string;
}

interface UpdateModalProps {
  updateInfo: UpdateInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateModal({ updateInfo, isOpen, onClose }: UpdateModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('');

  if (!isOpen || !updateInfo) return null;

  const handleAutoUpdate = async () => {
    try {
      setIsUpdating(true);
      
      // Step 1: Downloading
      setStepText('กำลังดาวน์โหลดแพ็คเกจเวอร์ชันใหม่...');
      setProgress(25);
      await new Promise(r => setTimeout(r, 600));

      // Step 2: Updating Service Workers
      setStepText('กำลังอัปเดต Service Worker & Core Cache...');
      setProgress(55);
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      await new Promise(r => setTimeout(r, 600));

      // Step 3: Clearing Old Assets Cache
      setStepText('กำลังติดตั้งไฟล์ระบบและล้างแคชเก่า...');
      setProgress(85);
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
      await new Promise(r => setTimeout(r, 700));

      // Step 4: Finished & Restart
      setStepText('อัปเดตสำเร็จ! กำลังรีสตาร์ทแอพ...');
      setProgress(100);
      localStorage.setItem('just_updated_version', updateInfo.latestVersion);
      await new Promise(r => setTimeout(r, 600));

      // Hard reload with timestamp to bypass any browser cache
      window.location.href = window.location.pathname + '?updated=' + Date.now();
    } catch (err: any) {
      console.error('Update error:', err);
      setStepText('เกิดข้อผิดพลาดในการอัปเดตอัตโนมัติ');
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-sky-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">พบการอัปเดตเวอร์ชันใหม่!</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  Ready to install
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                เวอร์ชันล่าสุด: <span className="text-sky-400 font-bold">v{updateInfo.latestVersion}</span> (ปัจจุบัน: v{updateInfo.currentVersion})
              </p>
            </div>
          </div>
          {!isUpdating && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Release Metadata */}
        {updateInfo.publishedAt && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>ปล่อยอัปเดตเมื่อ: {new Date(updateInfo.publishedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        )}

        {/* Release Notes Box */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            รายละเอียดการอัปเดต (Changelog):
          </label>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-52 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans scrollbar-thin">
            {updateInfo.releaseNotes || 'ไม่มีรายละเอียดเพิ่มเติม'}
          </div>
        </div>

        {/* Update Progress State */}
        {isUpdating ? (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-sky-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{stepText}</span>
              </span>
              <span className="font-mono text-slate-400">{progress}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              กรุณาอย่าปิดหน้าต่าง แอพจะทำการติดตั้งและรีสตาร์ทให้อัตโนมัติในไม่กี่วินาที
            </p>
          </div>
        ) : (
          /* Action Buttons */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            {updateInfo.releaseUrl ? (
              <a
                href={updateInfo.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
              >
                <span>ดูโค้ดบน GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ) : <div />}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                เตือนฉันภายหลัง
              </button>
              
              <button
                type="button"
                onClick={handleAutoUpdate}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>ติดตั้งและอัปเดตอัตโนมัติ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
