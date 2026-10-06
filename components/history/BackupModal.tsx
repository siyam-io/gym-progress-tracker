"use client";

import React, { useState } from "react";
import { X, Download, Upload, ShieldCheck, AlertCircle, Check } from "lucide-react";
import { exportAllDataAsJson, importDataFromJson } from "@/lib/db/dexie";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export function BackupModal({ isOpen, onClose, onDataRestored }: BackupModalProps) {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = await exportAllDataAsJson();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `pulse-gym-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export data:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setImportStatus("Reading backup file...");
      const text = await file.text();
      const result = await importDataFromJson(text);

      if (result.success) {
        setImportStatus(`Successfully restored ${result.count} records!`);
        onDataRestored();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setImportStatus(`Error: ${result.error || "Failed to restore data"}`);
      }
    } catch (err) {
      console.error("Import error:", err);
      setImportStatus("Failed to parse file.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm text-zinc-100">Data Backup & Restore</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:text-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Your workout logs and routines are stored locally in IndexedDB. Export a JSON backup to protect your data or transfer it to another device.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Data (JSON)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Download</span>
          </button>

          {/* Import JSON */}
          <label className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import Data (JSON)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Select file</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="hidden"
            />
          </label>
        </div>

        {/* Status Message */}
        {importStatus && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-center text-emerald-400">
            {importStatus}
          </div>
        )}
      </div>
    </div>
  );
}
