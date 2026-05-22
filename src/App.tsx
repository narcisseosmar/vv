/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Users, GraduationCap, CalendarDays, AlertTriangle, 
  Sparkles, RefreshCw, AlertCircle, FileText, CheckCircle2, Bot,
  Plus, Trash2, Edit2, Search, Filter, Printer, Download, BookOpen,
  X, Check, UserCheck, Shield, HelpCircle, Laptop, Landmark, ClipboardList,
  Eye, Calendar, BarChart3, ChevronRight, Settings, Info
} from "lucide-react";
import { 
  User, Classroom, Teacher, Subject, SchoolClass, Schedule, 
  ScheduleConflict, DBState, DayOfWeek, ClassroomType, UserRole
} from "./types.js";
import DashboardStats from "./components/DashboardStats.js";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Application overarching states
  const [dbState, setDbState] = useState<DBState>({
    users: [],
    classrooms: [],
    teachers: [],
    subjects: [],
    schoolClasses: [],
    schedules: []
  });
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Role management simulation state for evaluation inside AI Studio sandbox
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("admin");
  // Simulated associated entity selector for teacher/student views
  const [simSelectedTeacherId, setSimSelectedTeacherId] = useState<string>("");
  const [simSelectedClassId, setSimSelectedClassId] = useState<string>("");

  // Search, filter & visual view configurations
  const [calViewMode, setCalViewMode] = useState<"classe" | "enseignant" | "salle">("classe");
  const [calFilterTargetId, setCalFilterTargetId] = useState<string>("");

  // CRUD search queries
  const [classroomSearch, setClassroomSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");

  // Editing Modals Configuration states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSchoolClassModal, setShowSchoolClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Form states
  const [classroomForm, setClassroomForm] = useState<Partial<Classroom>>({ nom_salle: "", capacite: 30, type: "normale" });
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({ nom: "", specialite: "", email: "", disponibilites: [] });
  const [schoolClassForm, setSchoolClassForm] = useState<Partial<SchoolClass>>({ nom_classe: "", niveau: "Licence 1", effectif: 25 });
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({ nom_matiere: "", volume_horaire: 30, coefficient: 2, enseignant_id: "" });
  const [scheduleForm, setScheduleForm] = useState<Partial<Schedule>>({
    jour: "Lundi",
    heure_debut: "08:30",
    heure_fin: "10:30",
    enseignant_id: "",
    salle_id: "",
    matiere_id: "",
    classe_id: ""
  });

  // Time Slot specifications
  const DAYS: DayOfWeek[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const TIME_SLOTS = [
    { start: "08:30", end: "10:30", label: "08h30 - 10h30" },
    { start: "10:30", end: "12:30", label: "10h30 - 12h30" },
    { start: "13:30", end: "15:30", label: "13h30 - 15h30" },
    { start: "15:30", end: "17:30", label: "15h30 - 17h30" },
  ];

  // Fetch full state on mount
  const fetchState = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Erreur de communication avec le serveur principal");
      const data = await res.json();
      setDbState(data.state);
      setConflicts(data.conflicts);

      // Pre-select first options for simulator defaults
      if (data.state.teachers.length > 0 && !simSelectedTeacherId) {
        setSimSelectedTeacherId(data.state.teachers[0].id);
      }
      if (data.state.schoolClasses.length > 0 && !simSelectedClassId) {
        setSimSelectedClassId(data.state.schoolClasses[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Sync simulator select filters with calViewMode
  useEffect(() => {
    if (calViewMode === "classe") {
      setCalFilterTargetId(simSelectedClassId || (dbState.schoolClasses[0]?.id || ""));
    } else if (calViewMode === "enseignant") {
      setCalFilterTargetId(simSelectedTeacherId || (dbState.teachers[0]?.id || ""));
    } else if (calViewMode === "salle") {
      setCalFilterTargetId(dbState.classrooms[0]?.id || "");
    }
  }, [calViewMode, simSelectedClassId, simSelectedTeacherId, dbState]);

  // Handle simulations roles modifications views
  useEffect(() => {
    if (currentUserRole === "teacher") {
      setCalViewMode("enseignant");
      setCalFilterTargetId(simSelectedTeacherId);
    } else if (currentUserRole === "student") {
      setCalViewMode("classe");
      setCalFilterTargetId(simSelectedClassId);
    }
  }, [currentUserRole, simSelectedTeacherId, simSelectedClassId]);

  // Flash Notifications helper
  const showToast = (message: string, isError = false) => {
    if (isError) {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // -----------------------------------------------------
  // STATE WRITING PROCEDURES (CRUD & RESOLVERS)
  // -----------------------------------------------------

  // Global Reset
  const handleResetDB = async () => {
    if (!window.confirm("Êtes-vous certain de vouloir vider le planning et réinitialiser les tables de démonstration ? Allées, classes de test et enseignants seront rechargés.")) {
      return;
    }
    try {
      const res = await fetch("/api/state/reset", { method: "POST" });
      const data = await res.json();
      setDbState(data.state);
      setConflicts(data.conflicts);
      showToast("La base de données a été réinitialisée avec succès");
    } catch (err) {
      showToast("Erreur lors de la réinitialisation.", true);
    }
  };

  // Auto solver request
  const handleAutoGenerate = async (keepExisting: boolean) => {
    try {
      const res = await fetch("/api/schedules/generate-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepExisting })
      });
      const data = await res.json();
      if (data.success) {
        setDbState(data.state);
        setConflicts(data.conflicts);
        showToast(`Génération complétée ! ${data.assignedCount} cours assignés avec succès, ${data.failuresCount} échecs.`);
      } else {
        showToast("Erreur lors de la résolution algorithmique.", true);
      }
    } catch (err) {
      showToast("Erreur de connexion avec le solveur intellectuel.", true);
    }
  };

  // Clear weekly schedules
  const handleClearSchedules = async () => {
    if (!window.confirm("Voulez-vous supprimer l'intégralité de l'emploi du temps actuel ? Vos listes de salles, d'enseignants et de matières seront conservées.")) {
      return;
    }
    try {
      const res = await fetch("/api/schedules/clear-all", { method: "POST" });
      const data = await res.json();
      setDbState(data.state);
      setConflicts([]);
      showToast("L'emploi du temps a été entièrement vidé.");
    } catch (err) {
      showToast("Impossible de réinitialiser l'emploi du temps.", true);
    }
  };

  // 1. CLASSROOM CRUD ACTIONS
  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEntityId ? `/api/classrooms/${editingEntityId}` : "/api/classrooms";
      const method = editingEntityId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classroomForm)
      });
      if (!res.ok) throw new Error("Erreur de sauvegarde");
      await fetchState();
      setShowClassroomModal(false);
      setEditingEntityId(null);
      setClassroomForm({ nom_salle: "", capacite: 30, type: "normale" });
      showToast("La salle de classe a été enregistrée.");
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!window.confirm("Supprimer cette salle effacera toutes ses affectations d'emploi du temps. Continuer ?")) return;
    try {
      await fetch(`/api/classrooms/${id}`, { method: "DELETE" });
      await fetchState();
      showToast("La salle et ses cours associés ont été supprimés.");
    } catch (err) {
      showToast("Erreur lors du retrait de la salle.", true);
    }
  };

  // 2. TEACHER CRUD ACTIONS
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEntityId ? `/api/teachers/${editingEntityId}` : "/api/teachers";
      const method = editingEntityId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherForm)
      });
      if (!res.ok) throw new Error("Sauvegarde de l'enseignant échouée");
      await fetchState();
      setShowTeacherModal(false);
      setEditingEntityId(null);
      setTeacherForm({ nom: "", specialite: "", email: "", disponibilites: [] });
      showToast("Fiche enseignant planifiée.");
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!window.confirm("Supprimer cet enseignant déconnectera tous les cours qui lui sont associés en cascade. Continuer ?")) return;
    try {
      await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      await fetchState();
      showToast("Enseignant supprimé.");
    } catch (err) {
      showToast("Erreur système.", true);
    }
  };

  // Helper toggle availability slot
  const toggleTeacherAvailability = (slotKey: string) => {
    const list = teacherForm.disponibilites || [];
    if (list.includes(slotKey)) {
      setTeacherForm({ ...teacherForm, disponibilites: list.filter(k => k !== slotKey) });
    } else {
      setTeacherForm({ ...teacherForm, disponibilites: [...list, slotKey] });
    }
  };

  // 3. SCHOOL CLASSE CRUD
  const handleSaveSchoolClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEntityId ? `/api/classes/${editingEntityId}` : "/api/classes";
      const method = editingEntityId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolClassForm)
      });
      if (!res.ok) throw new Error();
      await fetchState();
      setShowSchoolClassModal(false);
      setEditingEntityId(null);
      setSchoolClassForm({ nom_classe: "", niveau: "Licence 1", effectif: 25 });
      showToast("Classe d'étudiants sauvegardée.");
    } catch (err) {
      showToast("Erreur de sauvegarde de la classe.", true);
    }
  };

  const handleDeleteSchoolClass = async (id: string) => {
    if (!window.confirm("Supprimer cette promotion retirera ses créneaux de cours. Continuer ?")) return;
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      await fetchState();
      showToast("Classe supprimée.");
    } catch (err) {
      showToast("Action refusée.", true);
    }
  };

  // 4. SUBJECTS CRUD
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEntityId ? `/api/subjects/${editingEntityId}` : "/api/subjects";
      const method = editingEntityId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectForm)
      });
      if (!res.ok) throw new Error();
      await fetchState();
      setShowSubjectModal(false);
      setEditingEntityId(null);
      setSubjectForm({ nom_matiere: "", volume_horaire: 30, coefficient: 2, enseignant_id: "" });
      showToast("Matière académique mise à jour.");
    } catch (err) {
      showToast("Erreur lors de la mise à jour de la matière.", true);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm("Désactiver cette matière ?")) return;
    try {
      await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      await fetchState();
      showToast("Matière retirée.");
    } catch (err) {
      showToast("Erreur.", true);
    }
  };

  // 5. SCHEDULE TIMESLOT APPOINTMENT CRUD
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (!scheduleForm.salle_id || !scheduleForm.enseignant_id || !scheduleForm.matiere_id || !scheduleForm.classe_id) {
      showToast("Veuillez renseigner tous les champs obligatoires avant de planifier.", true);
      return;
    }

    try {
      const url = editingEntityId ? `/api/schedules/${editingEntityId}` : "/api/schedules";
      const method = editingEntityId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm)
      });
      
      const data = await res.json();
      if (data.error) {
        showToast(data.error, true);
        return;
      }

      setDbState(data.state);
      setConflicts(data.conflicts);
      setShowScheduleModal(false);
      setEditingEntityId(null);
      showToast("Planning enregistré ! Le moteur d'analyse a vérifié la conformité des contraintes.");
    } catch (err) {
      showToast("Erreur de liaison réseau lors de la planification.", true);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Voulez-vous détacher ce cours de l'emploi du temps ?")) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      const data = await res.json();
      setDbState(data.state);
      setConflicts(data.conflicts);
      showToast("Créneau libéré.");
    } catch (err) {
      showToast("Erreur.", true);
    }
  };


  // -----------------------------------------------------
  // LOOKUP MAPS & IN-MEMORY CALCULATION FOR DISPLAY
  // -----------------------------------------------------
  const classroomsMap = useMemo(() => new Map(dbState.classrooms.map(r => [r.id, r])), [dbState.classrooms]);
  const teachersMap = useMemo(() => new Map(dbState.teachers.map(t => [t.id, t])), [dbState.teachers]);
  const classesMap = useMemo(() => new Map(dbState.schoolClasses.map(c => [c.id, c])), [dbState.schoolClasses]);
  const subjectsMap = useMemo(() => new Map(dbState.subjects.map(s => [s.id, s])), [dbState.subjects]);

  // Determine if a class is currently occupied, to build usage statistics in cards
  const classroomOccupiedCount = useMemo(() => {
    const occupiedIds = new Set(dbState.schedules.map(s => s.salle_id));
    return occupiedIds.size;
  }, [dbState.schedules]);

  // Filtered lists for simple queries
  const filteredClassrooms = useMemo(() => {
    return dbState.classrooms.filter(r => 
      r.nom_salle.toLowerCase().includes(classroomSearch.toLowerCase()) ||
      r.type.toLowerCase().includes(classroomSearch.toLowerCase())
    );
  }, [dbState.classrooms, classroomSearch]);

  const filteredTeachers = useMemo(() => {
    return dbState.teachers.filter(t => 
      t.nom.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.specialite.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(teacherSearch.toLowerCase())
    );
  }, [dbState.teachers, teacherSearch]);

  const filteredSchoolClasses = useMemo(() => {
    return dbState.schoolClasses.filter(c => 
      c.nom_classe.toLowerCase().includes(classSearch.toLowerCase()) ||
      c.niveau.toLowerCase().includes(classSearch.toLowerCase())
    );
  }, [dbState.schoolClasses, classSearch]);

  const filteredSubjects = useMemo(() => {
    return dbState.subjects.filter(s => {
      const teacher = teachersMap.get(s.enseignant_id);
      return s.nom_matiere.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        (teacher && teacher.nom.toLowerCase().includes(subjectSearch.toLowerCase()));
    });
  }, [dbState.subjects, subjectSearch, teachersMap]);


  // Filter schedules to draw in the ACTIVE planning view (Filtered by category in headers)
  const schedulesToDisplay = useMemo(() => {
    if (!calFilterTargetId) return [];
    return dbState.schedules.filter(s => {
      if (calViewMode === "classe") {
        return s.classe_id === calFilterTargetId;
      } else if (calViewMode === "enseignant") {
        return s.enseignant_id === calFilterTargetId;
      } else { // salle
        return s.salle_id === calFilterTargetId;
      }
    });
  }, [dbState.schedules, calViewMode, calFilterTargetId]);

  // Check if a course chunk has been assigned to conflicts to list them in red box
  const getSchedulesInConflictRelation = (scheduleId: string) => {
    return conflicts.filter(c => c.targetIds.includes(scheduleId));
  };

  // PDF or Printer preview triggering
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-[#1e293b] overflow-hidden antialiased">
      {/* Toast Warnings */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-red-600 text-white rounded-xl shadow-lg flex items-center space-x-2 border border-red-500 max-w-lg text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-2 font-bold hover:text-red-100">✕</button>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center space-x-2 border border-emerald-500 max-w-lg text-sm animate-pulse"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-2 font-bold hover:text-emerald-100">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR navigation */}
      <aside className="no-print w-64 bg-[#0f172a] text-white flex flex-col pt-6 shrink-0 border-r border-slate-800">
        <div className="px-6 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3 logo">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5] flex items-center justify-center font-black text-white text-base logo-icon">
              S
            </div>
            <span className="text-lg font-bold tracking-tight">SmartSchedule</span>
          </div>
          <div className="mt-3 px-2 py-1 bg-indigo-950/40 border border-indigo-900 rounded-md text-center">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
              Planification Académique
            </span>
          </div>
        </div>

        {/* Live Simulator View Controls inside sidebar */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Shield className="w-3 h-3 text-indigo-400" />
            Mode de Simulation
          </p>
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 rounded-lg">
            {(["admin", "teacher", "student"] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setCurrentUserRole(r);
                  showToast(`Rôle basculé sur : ${r === "admin" ? "Administrateur" : r === "teacher" ? "Enseignant" : "Étudiant"}`);
                }}
                className={`text-[10px] py-1.5 px-1 rounded font-medium capitalize transition-all ${
                  currentUserRole === r 
                    ? "bg-[#4f46e5] text-white font-bold shadow-xs" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r === "admin" ? "Admin" : r === "teacher" ? "Prof" : "Étu"}
              </button>
            ))}
          </div>

          {/* Context switches depending on selected role */}
          {currentUserRole === "teacher" && dbState.teachers.length > 0 && (
            <div className="mt-3 space-y-1">
              <label className="text-[10px] text-indigo-300 block font-semibold">Consulter Enseignant :</label>
              <select
                value={simSelectedTeacherId}
                onChange={(e) => setSimSelectedTeacherId(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-1 px-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {dbState.teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.nom}</option>
                ))}
              </select>
            </div>
          )}

          {currentUserRole === "student" && dbState.schoolClasses.length > 0 && (
            <div className="mt-3 space-y-1">
              <label className="text-[10px] text-indigo-300 block font-semibold">Consulter Classe :</label>
              <select
                value={simSelectedClassId}
                onChange={(e) => setSimSelectedClassId(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-1 px-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {dbState.schoolClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.nom_classe}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* SIDEBAR NAVIGATION ITEMS */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar nav-links">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full text-left flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none nav-item ${
              activeTab === "dashboard" 
                ? "bg-slate-800/80 text-white font-medium active" 
                : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4.5 h-4.5" />
            <span>Tableau de bord</span>
          </button>

          <button
            onClick={() => setActiveTab("schedules")}
            className={`w-full text-left flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none nav-item ${
              activeTab === "schedules"
                ? "bg-slate-800/80 text-white font-medium active" 
                : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4.5 h-4.5" />
            <span>Emplois du Temps</span>
          </button>

          {/* Admin features */}
          <div className="pt-4 pb-1">
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Données Scolaires
            </span>
          </div>

          <button
            onClick={() => setActiveTab("classrooms")}
            className={`w-full text-left flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none nav-item ${
              activeTab === "classrooms"
                ? "bg-slate-800/80 text-white font-medium active" 
                : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <Building2 className="w-4.5 h-4.5" />
            <span>Gestion des Salles</span>
          </button>

          <button
            onClick={() => setActiveTab("teachers")}
            className={`w-full text-left flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none nav-item ${
              activeTab === "teachers"
                ? "bg-slate-800/80 text-white font-medium active" 
                : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <Users className="w-4.5 h-4.5" />
            <span>Enseignants</span>
          </button>

          <button
            onClick={() => setActiveTab("classes")}
            className={`w-full text-left flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none nav-item ${
              activeTab === "classes"
                ? "bg-slate-800/80 text-white font-medium active" 
                : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <GraduationCap className="w-4.5 h-4.5" />
            <span>Classes & Filières</span>
          </button>

          <button
            onClick={() => setActiveTab("subjects")}
            className={`w-full text-left flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none nav-item ${
              activeTab === "subjects"
                ? "bg-slate-800/80 text-white font-medium active" 
                : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            <span>Matières</span>
          </button>

          <div className="pt-4 border-t border-slate-800 pb-2" />

          <button
            onClick={handleResetDB}
            className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-lg text-xs text-amber-400 hover:bg-slate-850 transition-all focus:outline-none"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Réinitialiser Données</span>
          </button>
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
            <img 
              src={`https://ui-avatars.com/api/?name=${
                currentUserRole === "admin" 
                  ? "Adama+Traore" 
                  : currentUserRole === "teacher" 
                  ? "Jean+Dupont" 
                  : "Amelie+Kabore"
              }&background=4f46e5&color=fff`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-semibold text-slate-100 truncate">
              {currentUserRole === "admin" 
                ? "Adama Traoré" 
                : currentUserRole === "teacher" 
                ? (teachersMap.get(simSelectedTeacherId)?.nom || "Dr. Jean Dupont")
                : "Amélie Kaboré"}
            </h5>
            <p className="text-[10px] text-slate-400 capitalize truncate">
              {currentUserRole} smartschedule
            </p>
          </div>
        </div>
      </aside>

      {/* CENTER WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto print-area relative">
        {/* HEADER Section */}
        <header className="no-print bg-white border-b border-slate-200 px-8 py-5 shrink-0 flex items-center justify-between header">
          <div className="header-title">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 uppercase tracking-widest">
              <span>Gestion Calendaire</span>
              <span>•</span>
              <span className="capitalize">{currentUserRole} simulé</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 capitalize">
              {activeTab === "dashboard" && "Tableau de bord"}
              {activeTab === "schedules" && "Emplois du temps hebdomadaires"}
              {activeTab === "classrooms" && "Salles de classe"}
              {activeTab === "teachers" && "Enseignants & Disponibilités"}
              {activeTab === "classes" && "Classes & promotions"}
              {activeTab === "subjects" && "Matières & Horaires"}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick stats tags inside headers */}
            {conflicts.length > 0 && (
              <div className="px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-amber-700 text-xs font-medium flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                <span>{conflicts.length} alertes</span>
              </div>
            )}
            <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
              UTC: 20h20
            </span>
          </div>
        </header>

        {/* LOADING INDICATOR PANEL */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#f8fafc]">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="mt-4 text-sm text-slate-500 font-medium">Récupération des données académiques...</p>
          </div>
        ) : (
          <div className="flex-1 p-8 space-y-8 bg-[#f8fafc]">
            
            {/* -----------------------------------------------------------------
                TAB: DASHBOARD VIEW
               ----------------------------------------------------------------- */}
            {activeTab === "dashboard" && (
              <div className="space-y-8">
                {/* Stats widget panel */}
                <DashboardStats 
                  state={dbState} 
                  conflicts={conflicts} 
                  onAutoGenerate={handleAutoGenerate} 
                  onClearAll={handleClearSchedules}
                  onResetDB={handleResetDB}
                  triggerReload={fetchState}
                />

                {/* Main splits: Welcome status message and Conflict checklist list */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Quick classroom load status and usage chart */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-indigo-500" />
                        Taux d'occupation des Salles de classe
                      </h3>
                      <div className="space-y-4">
                        {dbState.classrooms.map(room => {
                          const numBooked = dbState.schedules.filter(s => s.salle_id === room.id).length;
                          // Assume 24 available slots max a week (6 days * 4 slots)
                          const pct = Math.min(Math.round((numBooked / 24) * 100), 100);
                          
                          return (
                            <div key={room.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700">{room.nom_salle} <span className="text-slate-400 font-normal">({room.type})</span></span>
                                <span className="text-slate-500 font-medium">{numBooked} / 24 créneaux ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    pct > 60 ? "bg-amber-500" : pct > 0 ? "bg-[#4f46e5]" : "bg-slate-300"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                        <Info className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="text-xs text-slate-600">
                          <p><strong>Conseil :</strong> Les salles informatiques ont un effectif limité et doivent être prioritairement attribuées aux TP pratiques d'Algorithmique. Vous pouvez modifier le type de salle dans l'onglet Salles.</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick helper manual instructions */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                      <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-emerald-500" />
                        Utilisation rapide de l'application :
                      </h3>
                      <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5 mt-3">
                        <li><strong>Contrôle des rôles :</strong> Changez de Rôle (Admin, Prof, Étudiant) dans le menu de gauche pour tester différents formulaires d'accès.</li>
                        <li><strong>Édition de l'Emploi du temps :</strong> Dans l'onglet <em>Emplois du Temps</em>, sélectionnez la classe d'étudiants, puis cliquez sur une cellule vide du calendrier pour ajouter manuellement un cours.</li>
                        <li><strong>Analyse prédictive :</strong> Le système bloque les enregistrements impossibles de salle double et affiche instantanément les alertes de conflits.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Right Column: Conflict Panel widget list matching instruction #5 */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Alerte de Conflits
                      </h3>
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Validation
                      </span>
                    </div>

                    {conflicts.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                        <p className="text-sm font-semibold text-slate-800">Aucun conflit détecté</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">Génération optimale ! Les salles et les enseignants sont 100% disponibles aux heures prévues.</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto max-h-[480px] space-y-3 custom-scrollbar pr-1">
                        {conflicts.map(c => (
                          <div 
                            key={c.id} 
                            className={`p-3 rounded-lg border flex gap-3 ${
                              c.severity === "high" 
                                ? "bg-red-50 border-red-200 text-red-900" 
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                          >
                            <div className={`w-1 shrink-0 rounded ${
                              c.severity === "high" ? "bg-red-600" : "bg-amber-500"
                            }`} />
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-600">
                                {c.type === "classroom_double" && "🔴 Conflit de Salle"}
                                {c.type === "teacher_double" && "🟡 Conflit Enseignant"}
                                {c.type === "class_double" && "🔵 Conflit Agenda Classe"}
                                {c.type === "capacity_overflow" && "🟠 Capacité Dépassée"}
                                {c.type === "teacher_unav" && "⚠️ Indisponibilité Enseignant"}
                              </p>
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">{c.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentUserRole === "admin" && conflicts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => handleAutoGenerate(false)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                        >
                          Corriger par Génération Automatique
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* -----------------------------------------------------------------
                TAB: SCHEDULES WEEKLY CALENDAR (interactive visual grid & filters)
               ----------------------------------------------------------------- */}
            {activeTab === "schedules" && (
              <div className="space-y-6">
                
                {/* Visualizer Filters row */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {/* Category switcher */}
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-500 uppercase">Consultation :</span>
                    <div className="p-0.5 bg-slate-100 rounded-lg flex">
                      {(["classe", "enseignant", "salle"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setCalViewMode(mode);
                            setCalFilterTargetId(""); // Reset first
                          }}
                          className={`text-xs py-1.5 px-3 rounded-md font-medium capitalize transition-all ${
                            calViewMode === mode 
                              ? "bg-white text-[#4f46e5] font-bold shadow-xs border border-slate-200" 
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          Par {mode === "classe" ? "Classe" : mode === "enseignant" ? "Enseignant" : "Salle"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Select Filter */}
                  <div className="flex-1 max-w-sm flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={calFilterTargetId}
                      onChange={(e) => setCalFilterTargetId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-semibold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Sélectionner --</option>
                      {calViewMode === "classe" && dbState.schoolClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.nom_classe} ({c.niveau} • {c.effectif} élèves)</option>
                      ))}
                      {calViewMode === "enseignant" && dbState.teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.nom} ({t.specialite})</option>
                      ))}
                      {calViewMode === "salle" && dbState.classrooms.map(r => (
                        <option key={r.id} value={r.id}>{r.nom_salle} (Cap: {r.capacite} • {r.type})</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Print Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePrint}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer Planning
                    </button>
                    
                    {currentUserRole === "admin" && (
                      <button
                        onClick={() => {
                          setEditingEntityId(null);
                          setScheduleForm({
                            jour: "Lundi",
                            heure_debut: "08:30",
                            heure_fin: "10:30",
                            enseignant_id: dbState.teachers[0]?.id || "",
                            salle_id: dbState.classrooms[0]?.id || "",
                            matiere_id: dbState.subjects[0]?.id || "",
                            classe_id: dbState.schoolClasses[0]?.id || ""
                          });
                          setShowScheduleModal(true);
                        }}
                        className="px-3.5 py-1.5 bg-[#4f46e5] hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Planifier un cours
                      </button>
                    )}
                  </div>
                </div>

                {/* TARGET BIO PREVIEW HEADER */}
                {calFilterTargetId && (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-indigo-100 text-[#4f46e5] rounded-lg">
                        {calViewMode === "classe" && <GraduationCap className="w-5 h-5" />}
                        {calViewMode === "enseignant" && <Users className="w-5 h-5" />}
                        {calViewMode === "salle" && <Building2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Visualisation de la cible
                        </h4>
                        <p className="text-sm font-bold text-slate-800">
                          {calViewMode === "classe" && classesMap.get(calFilterTargetId)?.nom_classe}
                          {calViewMode === "enseignant" && teachersMap.get(calFilterTargetId)?.nom}
                          {calViewMode === "salle" && classroomsMap.get(calFilterTargetId)?.nom_salle}
                        </p>
                        <span className="text-xs text-slate-500 font-medium">
                          {calViewMode === "classe" && `Effectif : ${classesMap.get(calFilterTargetId)?.effectif} inscrits • ${classesMap.get(calFilterTargetId)?.niveau}`}
                          {calViewMode === "enseignant" && `Spécialité : ${teachersMap.get(calFilterTargetId)?.specialite} • ${teachersMap.get(calFilterTargetId)?.email}`}
                          {calViewMode === "salle" && `Capacité autorisée : ${classroomsMap.get(calFilterTargetId)?.capacite} placesMax • Type : ${classroomsMap.get(calFilterTargetId)?.type}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500 font-semibold no-print">
                      {schedulesToDisplay.length} cours planifiés ce cycle
                    </div>
                  </div>
                )}

                {/* THE WEEKLY CALENDAR GRID SCREEN */}
                {!calFilterTargetId ? (
                  <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white max-w-xl mx-auto">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-800 text-sm">Prêt pour la consultation</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Veuillez désigner la Classe, l'Enseignant ou la Salle dans la liste ci-dessus pour inspecter ou mettre à jour l'emploi du temps hebdomadaire en temps réel.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="min-w-[800px]">
                      {/* Grid Header matching specified HTML structure */}
                      <div className="grid grid-cols-7 schedule-grid divide-x divide-slate-100 border-b border-slate-200">
                        {/* Empty/Period Slot column */}
                        <div className="bg-slate-50/80 p-3.5 text-center font-bold text-xs text-slate-500 uppercase tracking-wider grid-header no-print">
                          Créneau
                        </div>
                        {DAYS.map((day) => (
                          <div key={day} className="bg-slate-50/80 p-3.5 text-center font-bold text-xs text-slate-700 grid-header">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Grid Rows for Time slots */}
                      {TIME_SLOTS.map((slot) => (
                        <div key={slot.start} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0 divide-x divide-slate-50">
                          {/* Left Timeslot indicators */}
                          <div className="bg-slate-50/40 p-3 flex flex-col justify-center items-center text-center text-xs text-slate-500 font-semibold uppercase font-mono time-col no-print">
                            <span>{slot.start}</span>
                            <span className="text-[10px] text-slate-400 font-normal">à</span>
                            <span>{slot.end}</span>
                          </div>

                          {/* 6 Weekly Day Cells */}
                          {DAYS.map((day) => {
                            // Find any schedules matching this timeslot & day
                            const matches = schedulesToDisplay.filter(
                              (s) => s.jour === day && s.heure_debut === slot.start
                            );

                            return (
                              <div 
                                key={day} 
                                className="p-2 min-h-[110px] bg-white hover:bg-slate-50/50 transition-colors relative grid-cell group"
                              >
                                {matches.length === 0 ? (
                                  currentUserRole === "admin" ? (
                                    <button
                                      onClick={() => {
                                        setEditingEntityId(null);
                                        setScheduleForm({
                                          id: undefined,
                                          jour: day,
                                          heure_debut: slot.start,
                                          heure_fin: slot.end,
                                          enseignant_id: calViewMode === "enseignant" ? calFilterTargetId : (dbState.teachers[0]?.id || ""),
                                          salle_id: calViewMode === "salle" ? calFilterTargetId : (dbState.classrooms[0]?.id || ""),
                                          matiere_id: dbState.subjects[0]?.id || "",
                                          classe_id: calViewMode === "classe" ? calFilterTargetId : (dbState.schoolClasses[0]?.id || "")
                                        });
                                        setShowScheduleModal(true);
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 bg-indigo-50/40 hover:bg-indigo-50/80 transition-opacity flex items-center justify-center text-indigo-600 focus:outline-none"
                                      title="Cliquer pour planifier un cours sur ce créneau"
                                    >
                                      <Plus className="w-5 h-5 pointer-events-none" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-medium text-slate-300 absolute top-2 right-2 select-none uppercase">Libre</span>
                                  )
                                ) : (
                                  <div className="space-y-2 h-full flex flex-col justify-between">
                                    {matches.map((sch) => {
                                      const teacher = teachersMap.get(sch.enseignant_id);
                                      const classroom = classroomsMap.get(sch.salle_id);
                                      const subject = subjectsMap.get(sch.matiere_id);
                                      const schoolClass = classesMap.get(sch.classe_id);

                                      // Evaluate conflict styling
                                      const itemConflicts = getSchedulesInConflictRelation(sch.id);
                                      const isDoubleBooked = itemConflicts.some(c => c.severity === "high");
                                      const hasWarning = itemConflicts.some(c => c.severity === "warning");

                                      return (
                                        <div 
                                          key={sch.id} 
                                          className={`rounded-lg p-2.5 h-full flex flex-col justify-between text-xs transition-shadow border-l-[3px] course-block ${
                                            isDoubleBooked 
                                              ? "bg-red-50 border-red-500 text-red-900 shadow-xs" 
                                              : hasWarning 
                                              ? "bg-amber-50 border-amber-500 text-amber-900" 
                                              : "bg-[#eef2ff] border-[#4f46e5] text-indigo-950"
                                          }`}
                                        >
                                          <div>
                                            <div className="flex items-start justify-between">
                                              <span className="font-extrabold tracking-tight truncate block text-[11px] uppercase course-name">
                                                {subject ? subject.nom_matiere : "Matière indéterminée"}
                                              </span>
                                              
                                              {/* Actions for Admin on block hover */}
                                              {currentUserRole === "admin" && (
                                                <div className="opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-center space-x-1 shrink-0 ml-1 no-print">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingEntityId(sch.id);
                                                      setScheduleForm({ ...sch });
                                                      setShowScheduleModal(true);
                                                    }}
                                                    className="p-1 text-indigo-700 hover:bg-indigo-100 rounded"
                                                    title="Modifier le créneau"
                                                  >
                                                    <Edit2 className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteSchedule(sch.id);
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Supprimer le cours"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              )}
                                            </div>

                                            {/* Details depending on view mode */}
                                            <div className="mt-1 space-y-0.5 text-[10px] font-medium text-slate-500 leading-tight course-meta">
                                              {calViewMode !== "enseignant" && (
                                                <p className="truncate font-semibold text-slate-600">
                                                  🎓 {teacher ? teacher.nom : "Professeur indéfini"}
                                                </p>
                                              )}
                                              {calViewMode !== "classe" && (
                                                <p className="truncate">
                                                  🏫 Classe : {schoolClass ? schoolClass.nom_classe : "Indéfini"}
                                                </p>
                                              )}
                                              {calViewMode !== "salle" && (
                                                <p className="truncate">
                                                  📍 Salle : {classroom ? classroom.nom_salle : "Indéterminé"}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Bottom row alerts */}
                                          {itemConflicts.length > 0 && (
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                              {itemConflicts.map(c => (
                                                <span 
                                                  key={c.id} 
                                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold select-none uppercase tracking-wider ${
                                                    c.severity === "high" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
                                                  }`}
                                                  title={c.message}
                                                >
                                                  CONFLIT !
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* -----------------------------------------------------------------
                TAB: CLASSROOMS GENERAL CRUD
               ----------------------------------------------------------------- */}
            {activeTab === "classrooms" && (
              <div className="space-y-6">
                
                {/* Search / filter search bars */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={classroomSearch}
                      onChange={(e) => setClassroomSearch(e.target.value)}
                      placeholder="Rechercher une salle de classe..."
                      className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {currentUserRole === "admin" && (
                    <button
                      onClick={() => {
                        setEditingEntityId(null);
                        setClassroomForm({ nom_salle: "", capacite: 30, type: "normale" });
                        setShowClassroomModal(true);
                      }}
                      className="px-4 py-2 bg-[#4f46e5] hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Créer une Salle
                    </button>
                  )}
                </div>

                {/* Display Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClassrooms.map(room => {
                    const numBookedThisWeek = dbState.schedules.filter(s => s.salle_id === room.id).length;
                    
                    return (
                      <div key={room.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              room.type === "informatique" 
                                ? "bg-sky-50 text-sky-700 border border-sky-100" 
                                : room.type === "amphitheatre" 
                                ? "bg-purple-50 text-purple-700 border border-purple-100" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {room.type}
                            </span>
                            
                            {/* Admin edits */}
                            {currentUserRole === "admin" && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingEntityId(room.id);
                                    setClassroomForm({ ...room });
                                    setShowClassroomModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                                  title="Editer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClassroom(room.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                                  title="Retirer de l'école"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                            {room.type === "informatique" ? <Laptop className="w-4 h-4 text-slate-500" /> : <Landmark className="w-4 h-4 text-slate-500" />}
                            {room.nom_salle}
                          </h3>
                          <p className="text-xs text-slate-500">Capacité technique : <strong>{room.capacite} places</strong></p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Créneaux réservés :</span>
                          <span className={`font-bold px-2 py-0.5 rounded-full ${
                            numBookedThisWeek > 10 ? "bg-amber-100 text-amber-850" : numBookedThisWeek > 0 ? "bg-indigo-100 text-indigo-850" : "bg-slate-100 text-slate-500"
                          }`}>
                            {numBookedThisWeek} / 24 créneaux
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* -----------------------------------------------------------------
                TAB: TEACHERS GENERAL CRUD
               ----------------------------------------------------------------- */}
            {activeTab === "teachers" && (
              <div className="space-y-6">
                
                {/* Search and additions */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      placeholder="Rechercher par nom ou spécialité..."
                      className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {currentUserRole === "admin" && (
                    <button
                      onClick={() => {
                        setEditingEntityId(null);
                        setTeacherForm({ nom: "", specialite: "", email: "", disponibilites: ["Lundi-Matin", "Mardi-Matin"] });
                        setShowTeacherModal(true);
                      }}
                      className="px-4 py-2 bg-[#4f46e5] hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Inscrire un Enseignant
                    </button>
                  )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeachers.map(teacher => {
                    const coursesTaught = dbState.schedules.filter(s => s.enseignant_id === teacher.id).length;
                    
                    return (
                      <div key={teacher.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#4f46e5]">
                                {teacher.nom.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-800">{teacher.nom}</h3>
                                <p className="text-[10px] text-slate-400">{teacher.email}</p>
                              </div>
                            </div>

                            {/* Actions buttons */}
                            {currentUserRole === "admin" && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingEntityId(teacher.id);
                                    setTeacherForm({ ...teacher });
                                    setShowTeacherModal(true);
                                  }}
                                  className="p-1 px-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                  title="Modifier disponiblités"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTeacher(teacher.id)}
                                  className="p-1 px-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-600">Spécialité : <strong>{teacher.specialite}</strong></p>
                            <p className="text-xs text-slate-600">Disponibilités : <strong>{teacher.disponibilites.length} périodes</strong></p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Heures attribuées :</span>
                          <span className="font-bold text-slate-800">{coursesTaught * 2} heures</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* -----------------------------------------------------------------
                TAB: SCHOOL CLASSES CRUD
               ----------------------------------------------------------------- */}
            {activeTab === "classes" && (
              <div className="space-y-6">
                
                {/* Search */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder="Filtrer par filière ou niveau..."
                      className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {currentUserRole === "admin" && (
                    <button
                      onClick={() => {
                        setEditingEntityId(null);
                        setSchoolClassForm({ nom_classe: "", niveau: "Licence 1", effectif: 30 });
                        setShowSchoolClassModal(true);
                      }}
                      className="px-4 py-2 bg-[#4f46e5] hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une Classe
                    </button>
                  )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSchoolClasses.map(cls => {
                    const assignedSchedules = dbState.schedules.filter(s => s.classe_id === cls.id).length;
                    
                    return (
                      <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">
                              {cls.niveau}
                            </span>
                            
                            {currentUserRole === "admin" && (
                              <div className="flex items-center space-x-1 animate-fadeIn">
                                <button
                                  onClick={() => {
                                    setEditingEntityId(cls.id);
                                    setSchoolClassForm({ ...cls });
                                    setShowSchoolClassModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchoolClass(cls.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded"
                                  title="Retirer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-800">{cls.nom_classe}</h3>
                          <p className="text-xs text-slate-500">Effectif de la promotion : <strong>{cls.effectif} étudiants</strong></p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Cours planifiés cette semaine :</span>
                          <span className="font-bold text-slate-850">{assignedSchedules} créneaux</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* -----------------------------------------------------------------
                TAB: SUBJECTS ENTIRE CURRICULUM CRUD
               ----------------------------------------------------------------- */}
            {activeTab === "subjects" && (
              <div className="space-y-6">
                
                {/* Search */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      placeholder="Filtrer par enseignement ou enseignant..."
                      className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {currentUserRole === "admin" && (
                    <button
                      onClick={() => {
                        setEditingEntityId(null);
                        setSubjectForm({ nom_matiere: "", volume_horaire: 30, coefficient: 2, enseignant_id: dbState.teachers[0]?.id || "" });
                        setShowSubjectModal(true);
                      }}
                      className="px-4 py-2 bg-[#4f46e5] hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Créer une Matière
                    </button>
                  )}
                </div>

                {/* Table Layout for clear view */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4 pl-6">Matière</th>
                        <th className="p-4">Volume Horaire</th>
                        <th className="p-4">Coefficient / ECTS</th>
                        <th className="p-4">Enseignant Responsable</th>
                        {currentUserRole === "admin" && <th className="p-4 text-right pr-6">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredSubjects.map(sub => {
                        const assignedTeacher = teachersMap.get(sub.enseignant_id);
                        
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 pl-6">
                              <span className="font-bold text-slate-800">{sub.nom_matiere}</span>
                            </td>
                            <td className="p-4 font-semibold text-slate-600">{sub.volume_horaire} heures</td>
                            <td className="p-4 text-slate-500">Coef {sub.coefficient}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-[#4f46e5]">
                                  {assignedTeacher?.nom.substring(0, 2).toUpperCase() || "?"}
                                </span>
                                <span className="font-medium text-slate-700">{assignedTeacher ? assignedTeacher.nom : "Non assigné"}</span>
                              </span>
                            </td>
                            {currentUserRole === "admin" && (
                              <td className="p-4 text-right pr-6">
                                <div className="inline-flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setEditingEntityId(sub.id);
                                      setSubjectForm({ ...sub });
                                      setShowSubjectModal(true);
                                    }}
                                    className="p-1 px-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubject(sub.id)}
                                    className="p-1 px-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* -----------------------------------------------------------------
          SCHEDULING FORM MODAL (PLANIFIER UN COURS)
         ----------------------------------------------------------------- */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-gradient-to-r from-[#4f46e5] to-indigo-700 text-white p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-200" />
                  {editingEntityId ? "Modifier le cours planifié" : "Planifier un nouveau cours"}
                </h3>
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-indigo-100 text-xs mt-1">
                Le moteur de validation SmartSchedule va contrôler les conflits en temps réel lors de l'enregistrement.
              </p>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Day */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Jour de la semaine :</label>
                  <select
                    value={scheduleForm.jour}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, jour: e.target.value as DayOfWeek })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-semibold text-slate-700 focus:bg-white"
                  >
                    {DAYS.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                {/* Time slot start */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Horaire (Session 2h) :</label>
                  <select
                    value={scheduleForm.heure_debut}
                    onChange={(e) => {
                      const selected = TIME_SLOTS.find(item => item.start === e.target.value);
                      if (selected) {
                        setScheduleForm({
                          ...scheduleForm,
                          heure_debut: selected.start,
                          heure_fin: selected.end
                        });
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-semibold text-slate-700 focus:bg-white"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.start} value={slot.start}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class association */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Groupe / Promotion d'Étudiants :</label>
                <select
                  value={scheduleForm.classe_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, classe_id: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                >
                  <option value="">-- Sélectionner la Classe --</option>
                  {dbState.schoolClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.nom_classe} ({c.effectif} élèves)</option>
                  ))}
                </select>
              </div>

              {/* Subject to teach */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Matière / Enseignement :</label>
                <select
                  value={scheduleForm.matiere_id}
                  onChange={(e) => {
                    const subId = e.target.value;
                    const subObj = dbState.subjects.find(s => s.id === subId);
                    setScheduleForm({ 
                      ...scheduleForm, 
                      matiere_id: subId,
                      // Automatically preselect teacher assigned to subject
                      enseignant_id: subObj ? subObj.enseignant_id : scheduleForm.enseignant_id
                    });
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                >
                  <option value="">-- Choisir l'Enseignement --</option>
                  {dbState.subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.nom_matiere} (Hrs: {s.volume_horaire} • Coef: {s.coefficient})</option>
                  ))}
                </select>
              </div>

              {/* Classroom Assignment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Salle de classe d'accueil :</label>
                <select
                  value={scheduleForm.salle_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, salle_id: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                >
                  <option value="">-- Assigner une salle --</option>
                  {dbState.classrooms.map(room => {
                    // Quick display of capacity inside option
                    return (
                      <option key={room.id} value={room.id}>
                        {room.nom_salle} (Capacité : {room.capacite} placesMax • {room.type})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Teacher Assignement override */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Professeur en charge :</label>
                <select
                  value={scheduleForm.enseignant_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, enseignant_id: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                >
                  <option value="">-- Assigner l'enseignant --</option>
                  {dbState.teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nom} ({teacher.specialite})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  Enregistrer Planning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* -----------------------------------------------------------------
          CLASSROOM FORM DRAW MODAL
         ----------------------------------------------------------------- */}
      {showClassroomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingEntityId ? "Modifier la Salle" : "Créer une nouvelle Salle"}
              </h3>
            </div>
            
            <form onSubmit={handleSaveClassroom} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase block">Nom de la Salle de Classe :</label>
                <input
                  type="text"
                  value={classroomForm.nom_salle || ""}
                  onChange={(e) => setClassroomForm({ ...classroomForm, nom_salle: e.target.value })}
                  placeholder="Ex: Salle B-105"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase block">Capacité d'accueil :</label>
                <input
                  type="number"
                  value={classroomForm.capacite || ""}
                  onChange={(e) => setClassroomForm({ ...classroomForm, capacite: Number(e.target.value) })}
                  placeholder="Ex: 35"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase block">Type d'Infrastructure :</label>
                <select
                  value={classroomForm.type || "normale"}
                  onChange={(e) => setClassroomForm({ ...classroomForm, type: e.target.value as ClassroomType })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                >
                  <option value="normale">Salle Normale / Standard</option>
                  <option value="amphitheatre">Amphithéâtre / Grande salle</option>
                  <option value="informatique">Salle Informatique / Laboratoire PC</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowClassroomModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4f46e5] text-white text-xs font-bold rounded-lg"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          TEACHER FORM MODAL with interactive dynamic availability matrix
         ----------------------------------------------------------------- */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingEntityId ? "Modifier fiche Enseignant" : "Inscrire un nouvel Enseignant"}
              </h3>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nom complet :</label>
                  <input
                    type="text"
                    value={teacherForm.nom || ""}
                    onChange={(e) => setTeacherForm({ ...teacherForm, nom: e.target.value })}
                    placeholder="Ex: Dr. Adama Traoré"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Adresse Email académique :</label>
                  <input
                    type="email"
                    value={teacherForm.email || ""}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    placeholder="Ex: adama.traore@establishment.edu"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Spécialité Principale :</label>
                <input
                  type="text"
                  value={teacherForm.specialite || ""}
                  onChange={(e) => setTeacherForm({ ...teacherForm, specialite: e.target.value })}
                  placeholder="Ex: Intelligence Artificielle et Deep Learning"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                />
              </div>

              {/* Availability checklist matrix */}
              <div className="space-y-2 border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
                <span className="text-xs font-bold text-slate-700 block">
                  Disponibilités de Plages Horaires :
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block">
                  Cochez les périodes lors desquelles l'enseignant accepte d'avoir des cours attribués (Utiles au solveur de planification automatique).
                </span>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {DAYS.map(day => (
                    <div key={day} className="space-y-1 border-b border-slate-100 pb-1.5 last:border-b-0">
                      <span className="text-xs font-bold text-slate-600 block">{day}</span>
                      <div className="flex gap-2">
                        {["Matin", "ApresMidi"].map(period => {
                          const key = `${day}-${period}`;
                          const isChecked = (teacherForm.disponibilites || []).includes(key);

                          return (
                            <button
                              key={period}
                              type="button"
                              onClick={() => toggleTeacherAvailability(key)}
                              className={`flex-1 text-[10px] py-1 px-2 rounded-md font-semibold border transition-all ${
                                isChecked 
                                  ? "bg-indigo-50 border-[#4f46e5] text-indigo-700" 
                                  : "bg-white border-slate-200 text-slate-400"
                              }`}
                            >
                              {period}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4f46e5] text-white text-xs font-bold rounded-lg"
                >
                  Inscrire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* -----------------------------------------------------------------
          SCHOOL CLASS FORM MODAL
         ----------------------------------------------------------------- */}
      {showSchoolClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingEntityId ? "Modifier la Classe" : "Enregistrer une Classe d'étudiants"}
              </h3>
            </div>

            <form onSubmit={handleSaveSchoolClass} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nom de la Promo / Filière :</label>
                <input
                  type="text"
                  value={schoolClassForm.nom_classe || ""}
                  onChange={(e) => setSchoolClassForm({ ...schoolClassForm, nom_classe: e.target.value })}
                  placeholder="Ex: Licence 3 Génie Logiciel"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Niveau d'Étude :</label>
                <select
                  value={schoolClassForm.niveau || "Licence 1"}
                  onChange={(e) => setSchoolClassForm({ ...schoolClassForm, niveau: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                >
                  <option value="Licence 1">Licence 1 (L1)</option>
                  <option value="Licence 2">Licence 2 (L2)</option>
                  <option value="Licence 3">Licence 3 (L3)</option>
                  <option value="Master 1">Master 1 (M1)</option>
                  <option value="Master 2">Master 2 (M2)</option>
                  <option value="Doctorat">Doctorat</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre d'Étudiants inscrits (Effectif) :</label>
                <input
                  type="number"
                  value={schoolClassForm.effectif || ""}
                  onChange={(e) => setSchoolClassForm({ ...schoolClassForm, effectif: Number(e.target.value) })}
                  placeholder="Ex: 50"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSchoolClassModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4f46e5] text-white text-xs font-bold rounded-lg"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* -----------------------------------------------------------------
          SUBJECT FORM MODAL
         ----------------------------------------------------------------- */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingEntityId ? "Modifier Matière" : "Enregistrer une Matière"}
              </h3>
            </div>

            <form onSubmit={handleSaveSubject} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nom de l'Enseignement :</label>
                <input
                  type="text"
                  value={subjectForm.nom_matiere || ""}
                  onChange={(e) => setSubjectForm({ ...subjectForm, nom_matiere: e.target.value })}
                  placeholder="Ex: Introduction aux Réseaux IP"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Volume horaire initial :</label>
                  <input
                    type="number"
                    value={subjectForm.volume_horaire || ""}
                    onChange={(e) => setSubjectForm({ ...subjectForm, volume_horaire: Number(e.target.value) })}
                    placeholder="Ex: 30"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Coefficient / Poids :</label>
                  <input
                    type="number"
                    value={subjectForm.coefficient || ""}
                    onChange={(e) => setSubjectForm({ ...subjectForm, coefficient: Number(e.target.value) })}
                    placeholder="Ex: 3"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Enseignant Principal Référent :</label>
                <select
                  value={subjectForm.enseignant_id}
                  onChange={(e) => setSubjectForm({ ...subjectForm, enseignant_id: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white"
                  required
                >
                  <option value="">-- Assigner un Professeur --</option>
                  {dbState.teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.nom} ({t.specialite})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4f46e5] text-white text-xs font-bold rounded-lg"
                >
                  Saisir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
