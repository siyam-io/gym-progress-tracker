"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon } from "lucide-react";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { HistoryStatsSummary } from "@/components/history/HistoryStatsSummary";
import { HistoryFilterBar } from "@/components/history/HistoryFilterBar";
import { HistoryCalendar } from "@/components/history/HistoryCalendar";
import { HistoryFeed } from "@/components/history/HistoryFeed";
import { SessionDetailModal } from "@/components/history/SessionDetailModal";
import { EditWorkoutSessionModal } from "@/components/history/EditWorkoutSessionModal";
import { BackupModal } from "@/components/history/BackupModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

export default function HistoryPage() {
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();

  const {
    sessions,
    filteredSessions,
    isLoading,
    loadHistory,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    currentMonthDate,
    setCurrentMonthDate,
    selectedDateFilter,
    setSelectedDateFilter,
    inspectingSessionId,
    setInspectingSessionId,
    editingSessionData,
    setEditingSessionData,
    showBackupModal,
    setShowBackupModal,
    sessionToDelete,
    setSessionToDelete,
    handleDirectEdit,
    confirmDeleteSession,
    handleRepeatWorkout,
    monthlyStats,
    calendarDays,
  } = useWorkoutHistory();

  return (
    <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-12 min-w-0 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Header */}
      <header className="w-full px-5 md:px-8 pt-6 pb-4 border-b border-zinc-900/80 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100">
              Training Logbook
            </h1>
            <span className="text-[11px] text-zinc-500 font-semibold block">
              {sessions.length} total workout{sessions.length !== 1 ? "s" : ""} recorded
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBackupModal(true)}
          className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 hover:text-emerald-400 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shrink-0"
          title="Backup & Export Data"
        >
          <span>Backup</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full p-4 space-y-4 flex-1 flex flex-col">
        {/* Monthly Performance KPI Banner */}
        <HistoryStatsSummary stats={monthlyStats} />

        {/* Filters and View Mode Controls */}
        <HistoryFilterBar
          viewMode={viewMode}
          setViewMode={setViewMode}
          sessionsCount={sessions.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedMuscleFilter={selectedMuscleFilter}
          setSelectedMuscleFilter={setSelectedMuscleFilter}
        />

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <HistoryCalendar
            currentMonthDate={currentMonthDate}
            setCurrentMonthDate={setCurrentMonthDate}
            calendarDays={calendarDays}
            selectedDateFilter={selectedDateFilter}
            setSelectedDateFilter={setSelectedDateFilter}
            workoutDatesCount={calendarDays.filter((d) => d.hasWorkout).length}
          />
        )}

        {/* Workout Cards Feed */}
        <HistoryFeed
          isLoading={isLoading}
          filteredSessions={filteredSessions}
          selectedDateFilter={selectedDateFilter}
          searchQuery={searchQuery}
          selectedMuscleFilter={selectedMuscleFilter}
          onClearFilters={() => {
            setSelectedDateFilter(null);
            setSearchQuery("");
            setSelectedMuscleFilter("All");
          }}
          onStartNewWorkout={() => {
            void startWorkout("Floor Session", []);
            router.push("/workout/active");
          }}
          onBrowseRoutines={() => router.push("/")}
          onInspectSession={(id) => setInspectingSessionId(id)}
          onDirectEdit={(id, e) => {
            e.stopPropagation();
            router.push(`/history/${id}/edit`);
          }}
          onDeleteRequest={(item, e) => {
            e.stopPropagation();
            setSessionToDelete(item);
          }}
          onRepeatWorkout={handleRepeatWorkout}
        />
      </main>

      {/* Confirmation Modal for Session Deletion */}
      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Delete Workout?"
        description={
          sessionToDelete
            ? `Are you sure you want to delete "${sessionToDelete.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void confirmDeleteSession()}
        onCancel={() => setSessionToDelete(null)}
      />

      {/* Session Detail Inspector Modal */}
      {inspectingSessionId && (
        <SessionDetailModal
          sessionId={inspectingSessionId}
          onClose={() => setInspectingSessionId(null)}
          onDeleted={() => void loadHistory()}
          onUpdated={() => void loadHistory()}
        />
      )}

      {/* Edit Workout Session Modal */}
      {editingSessionData && (
        <EditWorkoutSessionModal
          isOpen={true}
          sessionData={editingSessionData}
          onClose={() => setEditingSessionData(null)}
          onSaved={() => {
            setEditingSessionData(null);
            void loadHistory();
          }}
        />
      )}

      {/* Backup and Restore Modal */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onDataRestored={() => void loadHistory()}
      />
    </div>
  );
}
