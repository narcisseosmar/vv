/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Building2, Users, GraduationCap, CalendarDays, AlertTriangle, 
  Sparkles, RefreshCw, AlertCircle, FileText, CheckCircle2, Bot 
} from "lucide-react";
import { DBState, ScheduleConflict } from "../types.js";
import { motion, AnimatePresence } from "motion/react";

interface DashboardStatsProps {
  state: DBState;
  conflicts: ScheduleConflict[];
  onAutoGenerate: (keepExisting: boolean) => Promise<void>;
  onClearAll: () => Promise<void>;
  onResetDB: () => Promise<void>;
  triggerReload: () => void;
}

export default function DashboardStats({
  state,
  conflicts,
  onAutoGenerate,
  onClearAll,
  onResetDB,
  triggerReload
}: DashboardStatsProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSolverLoading, setIsSolverLoading] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [keepExisting, setKeepExisting] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const numRooms = state.classrooms.length;
  const numTeachers = state.teachers.length;
  const numClasses = state.schoolClasses.length;
  const numSchedules = state.schedules.length;
  const numConflicts = conflicts.length;

  const handleGenerateClick = async () => {
    setIsSolverLoading(true);
    try {
      await onAutoGenerate(keepExisting);
      setShowAutoModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSolverLoading(false);
    }
  };

  const handleAiAudit = async () => {
    setIsAiLoading(true);
    setAiReport(null);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setAiReport(data.auditReport);
      } else {
        setAiError(data.errorMsg || "Impossible de contacter l'IA.");
      }
    } catch (err) {
      setAiError("Une erreur réseau s'est produite lors de l'appel à l'assistant d'audit principal.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Salles</p>
            <p className="text-2xl font-bold text-gray-900">{numRooms}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Enseignants</p>
            <p className="text-2xl font-bold text-gray-900">{numTeachers}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Classes/Niveaux</p>
            <p className="text-2xl font-bold text-gray-900">{numClasses}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cours Planifiés</p>
            <p className="text-2xl font-bold text-gray-900">{numSchedules}</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm flex items-center space-x-4 transition-all ${
          numConflicts > 0 
            ? "bg-amber-50 border-amber-200 text-amber-900" 
            : "bg-white border-gray-100 text-gray-900"
        }`}>
          <div className={`p-3 rounded-lg ${
            numConflicts > 0 ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-gray-50 text-gray-400"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Conflits Détectés</p>
            <p className="text-2xl font-bold">{numConflicts}</p>
          </div>
        </div>
      </div>

      {/* Control Actions & Trigger Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800">
        <div className="space-y-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Planification Intelligente SmartSchedule
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Notre moteur algorithmique interne résout les contraintes scolaires (Capacité, profs, horaires) instantanément. Vous pouvez aussi auditer par IA.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowAutoModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-indigo-400 focus:outline-none flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Génération Automatique
          </button>

          <button
            onClick={handleAiAudit}
            disabled={isAiLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm rounded-lg transition-all border border-slate-700 focus:ring-2 focus:ring-slate-500 focus:outline-none flex items-center gap-2 disabled:opacity-50"
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            {isAiLoading ? "Analyse IA..." : "Audit Intelligent IA"}
          </button>

          <button
            onClick={onClearAll}
            className="px-3.5 py-2 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-red-400 text-sm font-medium rounded-lg transition-all border border-transparent hover:border-slate-700 flex items-center gap-1.5"
            title="Effacer le planning hebdomadaire"
          >
            Réinitialiser Planning
          </button>
        </div>
      </div>

      {/* Dynamic AI Feedback Panel */}
      <AnimatePresence>
        {(isAiLoading || aiReport || aiError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl border border-indigo-900 text-white overflow-hidden shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-indigo-900 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="font-semibold text-sm tracking-wider uppercase">Rapport d'Audit Gemini AI</span>
              </div>
              <button 
                onClick={() => { setAiReport(null); setAiError(null); }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            {isAiLoading && (
              <div className="py-6 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-4 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                <p className="text-xs text-slate-400">Analyse de l'Emploi du temps par Gemini-3.5-Flash... Veuillez patienter...</p>
              </div>
            )}

            {aiError && (
              <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-red-200 text-sm flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <h4 className="font-semibold">Impossible de faire l'audit IA</h4>
                  <p className="text-xs text-red-300 mt-1">{aiError}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Note: Notre moteur de planification déterministe interne est toujours opérationnel et résout les conflits en temps réel.
                  </p>
                </div>
              </div>
            )}

            {aiReport && (
              <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line space-y-2">
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-xl mb-4 text-emerald-200 text-xs flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Audit complété :</strong> Gemini a scanné l'ensemble de l'agenda et propose des points d'optimisations pédagogiques détaillés ci-dessous.
                  </span>
                </div>
                <div className="markdown-body p-1 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {aiReport}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto Generation Options Modal */}
      {showAutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Générer l'agenda automatiquement
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Le puissant moteur va recalculer les cours et les associer aux différentes salles compatibles en veillant à éviter les chevauchements pour les enseignants, les groupes et le volume de places des salles.
            </p>

            <div className="my-6 p-4 bg-slate-50 rounded-xl flex items-start space-x-3">
              <input
                id="keep-existing"
                type="checkbox"
                checked={keepExisting}
                onChange={(e) => setKeepExisting(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="keep-existing" className="text-xs text-gray-700 cursor-pointer">
                <strong>Conserver les créneaux déjà configurés</strong><br />
                Si coché, l'algorithme ajoutera de nouveaux créneaux sans toucher ni écraser les cours déjà planifiés manuellement.
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowAutoModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSolverLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateClick}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                disabled={isSolverLoading}
              >
                {isSolverLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Calcul en cours...
                  </>
                ) : "Lancer le Calendrier"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
