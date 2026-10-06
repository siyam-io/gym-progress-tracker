import React, { useState } from "react";
import { X, Download, Upload, ShieldCheck, AlertCircle, Check, FileSpreadsheet, Trash2 } from "lucide-react";
import { exportAllDataAsJson, importDataFromJson, clearLocalUserData } from "@/lib/db/dexie";
import { exportWorkoutsToCsv, exportBodyWeightToCsv } from "@/lib/utils/export-csv";
import { toast } from "@/stores/useToastStore";

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
      toast.success("JSON backup downloaded successfully!");
    } catch (err) {
      console.error("Failed to export data:", err);
      toast.error("Failed to export JSON backup.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportWorkoutsCsv = async () => {
    try {
      setIsProcessing(true);
      await exportWorkoutsToCsv();
      toast.success("Workouts CSV downloaded!");
    } catch (err) {
      console.error("Failed to export workouts CSV:", err);
      toast.error("Failed to export workouts CSV.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportWeightCsv = async () => {
    try {
      setIsProcessing(true);
      await exportBodyWeightToCsv();
      toast.success("Body weight logs CSV downloaded!");
    } catch (err) {
      console.error("Failed to export weight CSV:", err);
      toast.error("Failed to export weight CSV.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetLocalData = async () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Are you sure you want to reset all your local workouts and body weight data? This will give you a fresh start."
      )
    ) {
      try {
        setIsProcessing(true);
        await clearLocalUserData();
        toast.success("Local data wiped! Fresh start ready. 🧼");
        onDataRestored();
        setTimeout(() => onClose(), 800);
      } catch (err) {
        console.error("Failed to reset local data:", err);
        toast.error("Failed to reset local data.");
      } finally {
        setIsProcessing(false);
      }
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
        toast.success(`Restored ${result.count} records!`);
        onDataRestored();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setImportStatus(`Error: ${result.error || "Failed to restore data"}`);
        toast.error("Failed to restore data from backup.");
      }
    } catch (err) {
      console.error("Import error:", err);
      setImportStatus("Failed to parse file.");
      toast.error("Failed to parse backup file.");
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm text-zinc-100">Data Backup & Export</h2>
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
          Your workout logs and routines are stored locally in IndexedDB. Export to CSV for Excel/Sheets or JSON for device transfers.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Export Workouts CSV */}
          <button
            type="button"
            onClick={handleExportWorkoutsCsv}
            disabled={isProcessing}
            className="w-full py-3 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Workouts (CSV)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Excel / Sheets</span>
          </button>

          {/* Export Body Weight CSV */}
          <button
            type="button"
            onClick={handleExportWeightCsv}
            disabled={isProcessing}
            className="w-full py-3 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Weight Logs (CSV)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Excel / Sheets</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isProcessing}
            className="w-full py-3 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Full Data Backup (JSON)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Transfer</span>
          </button>

          {/* Import JSON */}
          <label className="w-full py-3 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restore Backup (JSON)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Upload</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="hidden"
            />
          </label>

          {/* Danger Zone: Reset Local Data */}
          <div className="pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={handleResetLocalData}
              disabled={isProcessing}
              className="w-full py-2.5 px-3.5 rounded-xl bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 font-bold text-xs flex items-center justify-between active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Reset All Local Workout Data</span>
              </div>
              <span className="text-[9px] uppercase font-bold text-red-500/70">Fresh Start</span>
            </button>
          </div>
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
