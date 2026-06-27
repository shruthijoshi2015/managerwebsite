"use client";
import React, { useState, useEffect } from "react";
import { Database, Shield, HardDrive, Cloud, Check, ArrowRight, X } from "lucide-react";
import { StorageMode, getStorageConfig, saveStorageConfig } from "@/lib/storageProvider";

export function StorageSetupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<StorageMode>('indexedDB');
  const [cloudUrl, setCloudUrl] = useState("");
  const [cloudKey, setCloudKey] = useState("");
  const [cloudProvider, setCloudProvider] = useState<'supabase' | 'firebase'>('supabase');

  useEffect(() => {
    const config = getStorageConfig();
    if (!config.isConfigured) {
      setIsOpen(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleConfirm = () => {
    saveStorageConfig({
      mode: selectedMode,
      cloudUrl: selectedMode === 'cloud' ? cloudUrl : undefined,
      cloudKey: selectedMode === 'cloud' ? cloudKey : undefined,
      cloudProvider: selectedMode === 'cloud' ? cloudProvider : undefined,
      isConfigured: true,
    });
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Database className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">One-Time Storage Setup</h2>
              <p className="text-slate-300 text-xs">Choose where your team's tracking data is stored</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <p className="text-sm text-slate-600 mb-2">
            Select your backend storage architecture. You can change this anytime in <strong>Settings → Data Storage</strong>.
          </p>

          {/* Option 1: IndexedDB */}
          <div 
            onClick={() => setSelectedMode('indexedDB')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
              selectedMode === 'indexedDB' 
                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              selectedMode === 'indexedDB' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">1.1 Browser Local Storage (IndexedDB)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Recommended for Vercel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Data is stored safely inside your browser. <strong>100% private & offline</strong>. Perfect for zero-billing Vercel hosting as data never touches a cloud database.
              </p>
            </div>
            <div className="mt-1">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                selectedMode === 'indexedDB' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
              }`}>
                {selectedMode === 'indexedDB' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Option 2: Local File Access */}
          <div 
            onClick={() => setSelectedMode('fileSystem')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
              selectedMode === 'fileSystem' 
                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              selectedMode === 'fileSystem' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">1.2 Local File System Access</span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Sync & Backup
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Grant permission to a `.json` database file on your computer. Place it inside OneDrive, Dropbox, or Google Drive to automatically sync across devices.
              </p>
            </div>
            <div className="mt-1">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                selectedMode === 'fileSystem' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
              }`}>
                {selectedMode === 'fileSystem' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Option 3: Cloud Database */}
          <div 
            onClick={() => setSelectedMode('cloud')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
              selectedMode === 'cloud' 
                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              selectedMode === 'cloud' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">1.3 Cloud Database Hosting</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Team Collaboration
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect your website to a hosted cloud database like Supabase (PostgreSQL) or Google Firebase Firestore.
              </p>

              {selectedMode === 'cloud' && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cloudProvider" 
                        checked={cloudProvider === 'supabase'} 
                        onChange={() => setCloudProvider('supabase')}
                        className="accent-indigo-600"
                      />
                      Supabase (PostgreSQL)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cloudProvider" 
                        checked={cloudProvider === 'firebase'} 
                        onChange={() => setCloudProvider('firebase')}
                        className="accent-indigo-600"
                      />
                      Google Firebase (Firestore)
                    </label>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder={cloudProvider === 'supabase' ? "Supabase Project URL (https://xyz.supabase.co)" : "Firebase Project ID"}
                      value={cloudUrl}
                      onChange={e => setCloudUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder={cloudProvider === 'supabase' ? "Supabase Anon API Key" : "Firebase API Key"}
                      value={cloudKey}
                      onChange={e => setCloudKey(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-1">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                selectedMode === 'cloud' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
              }`}>
                {selectedMode === 'cloud' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Current deployment target: <strong className="text-slate-700">Vercel</strong>
          </span>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            Confirm Setup <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
