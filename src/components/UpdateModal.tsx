'use client';

import React from 'react';
import { Sparkles, Download, X, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';

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
  if (!isOpen || !updateInfo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-sky-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">มีเวอร์ชันใหม่พร้อมใช้งาน!</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  New Update
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                เวอร์ชันล่าสุด: <span className="text-sky-400 font-bold">v{updateInfo.latestVersion}</span> (ปัจจุบัน: v{updateInfo.currentVersion})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
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
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-56 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans scrollbar-thin">
            {updateInfo.releaseNotes || 'ไม่มีรายละเอียดเพิ่มเติม'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            เตือนฉันภายหลัง
          </button>
          
          {updateInfo.downloadUrl && (
            <a
              href={updateInfo.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดอัปเดต</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
