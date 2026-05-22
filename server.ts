/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  User, Classroom, Teacher, Subject, SchoolClass, Schedule, 
  ScheduleConflict, DBState, DayOfWeek 
} from "./src/types.js";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Initial Seed Data
const DEFAULT_DB: DBState = {
  users: [
    { id: "u-admin", nom: "Adama Traoré (Admin)", email: "admin@smartschedule.edu", role: "admin" },
    { id: "u-t1", nom: "Dr. Jean Dupont", email: "jean.dupont@smartschedule.edu", role: "teacher", assocId: "t-1" },
    { id: "u-t2", nom: "Mme. Marie Martin", email: "marie.martin@smartschedule.edu", role: "teacher", assocId: "t-2" },
    { id: "u-t3", nom: "M. Thomas Bernhard", email: "thomas.bernhard@smartschedule.edu", role: "teacher", assocId: "t-3" },
    { id: "u-s1", nom: "Amélie Kaboré (Étudiant L1)", email: "amelie@smartschedule.edu", role: "student", assocId: "c-1" },
  ],
  classrooms: [
    { id: "s-101", nom_salle: "Salle PC 101", capacite: 25, type: "informatique" },
    { id: "s-204", nom_salle: "Salle 204 (Normale)", capacite: 45, type: "normale" },
    { id: "s-amphi-a", nom_salle: "Amphithéâtre A", capacite: 150, type: "amphitheatre" },
    { id: "s-amphi-b", nom_salle: "Amphithéâtre B", capacite: 100, type: "amphitheatre" },
    { id: "s-302", nom_salle: "Salle 302 (Normale)", capacite: 35, type: "normale" },
  ],
  teachers: [
    { 
      id: "t-1", 
      nom: "Dr. Jean Dupont", 
      specialite: "Algorithmique & C++", 
      email: "jean.dupont@smartschedule.edu",
      disponibilites: ["Lundi-Matin", "Lundi-ApresMidi", "Mardi-Matin", "Mercredi-Matin", "Jeudi-ApresMidi", "Vendredi-Matin"]
    },
    { 
      id: "t-2", 
      nom: "Mme. Marie Martin", 
      specialite: "Bases de Données & IA", 
      email: "marie.martin@smartschedule.edu",
      disponibilites: ["Lundi-Matin", "Mardi-Matin", "Mardi-ApresMidi", "Jeudi-Matin", "Vendredi-ApresMidi"]
    },
    { 
      id: "t-3", 
      nom: "M. Thomas Bernhard", 
      specialite: "Réseaux & Sécurité", 
      email: "thomas.bernhard@smartschedule.edu",
      disponibilites: ["Lundi-ApresMidi", "Mercredi-Matin", "Mercredi-ApresMidi", "Jeudi-Matin", "Vendredi-Matin"]
    },
    { 
      id: "t-4", 
      nom: "Dr. Alice Robert", 
      specialite: "Systèmes d'Exploiting", 
      email: "alice.robert@smartschedule.edu",
      disponibilites: ["Mardi-Matin", "Mercredi-ApresMidi", "Jeudi-Matin", "Vendredi-Matin", "Vendredi-ApresMidi"]
    }
  ],
  schoolClasses: [
    { id: "c-1", nom_classe: "L1 Informatique", niveau: "Licence 1", effectif: 120 },
    { id: "c-2", nom_classe: "L2 Administration Systèmes", niveau: "Licence 2", effectif: 32 },
    { id: "c-3", nom_classe: "M1 Architecture Logicielle", niveau: "Master 1", effectif: 22 },
  ],
  subjects: [
    { id: "sub-1", nom_matiere: "Introduction à l'Algorithmique", volume_horaire: 40, coefficient: 4, enseignant_id: "t-1" },
    { id: "sub-2", nom_matiere: "Bases de Données Relationnelles", volume_horaire: 30, coefficient: 3, enseignant_id: "t-2" },
    { id: "sub-3", nom_matiere: "Réseaux de Communication", volume_horaire: 30, coefficient: 3, enseignant_id: "t-3" },
    { id: "sub-4", nom_matiere: "Principes des Systèmes d'Exploitation", volume_horaire: 30, coefficient: 2, enseignant_id: "t-4" },
    { id: "sub-5", nom_matiere: "Programmation Orientée Objet C++", volume_horaire: 35, coefficient: 3, enseignant_id: "t-1" },
  ],
  schedules: [
    { id: "sch-1", jour: "Lundi", heure_debut: "08:30", heure_fin: "10:30", enseignant_id: "t-1", salle_id: "s-amphi-a", matiere_id: "sub-1", classe_id: "c-1" },
    { id: "sch-2", jour: "Lundi", heure_debut: "10:30", heure_fin: "12:30", enseignant_id: "t-2", salle_id: "s-101", matiere_id: "sub-2", classe_id: "c-2" },
    { id: "sch-3", jour: "Mardi", heure_debut: "13:30", heure_fin: "15:30", enseignant_id: "t-3", salle_id: "s-204", matiere_id: "sub-3", classe_id: "c-3" }
  ]
};

// Simple synchronized JSON file storage load/save helpers
function loadDB(): DBState {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
      return DEFAULT_DB;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading or seeding DB, falling back to in-memory state", err);
    return DEFAULT_DB;
  }
}

function saveDB(data: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving DB to filesystem", err);
  }
}

// Conflict Analysis Engine
// This respects all requested rules in section 9:
// - No overlap of the same classroom in the same slot
// - No overlap of the same teacher in the same slot
// - No class schedule overlap in the same slot
// - Classroom capacity >= Class effectif
// - Teacher availability matching
function analyzeConflicts(db: DBState): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const schedules = db.schedules;
  const classroomsMap = new Map(db.classrooms.map(r => [r.id, r]));
  const teachersMap = new Map(db.teachers.map(t => [t.id, t]));
  const classesMap = new Map(db.schoolClasses.map(c => [c.id, c]));
  const subjectsMap = new Map(db.subjects.map(s => [s.id, s]));

  // Helper to test overlapping timeslots
  const isOverlapping = (s1: Schedule, s2: Schedule) => {
    if (s1.jour !== s2.jour) return false;
    // Simple time comparison e.g., "08:30" < "10:30"
    return s1.heure_debut < s2.heure_fin && s2.heure_debut < s1.heure_fin;
  };

  schedules.forEach((s, idx) => {
    const r = classroomsMap.get(s.salle_id);
    const cls = classesMap.get(s.classe_id);
    const teacher = teachersMap.get(s.enseignant_id);
    const subject = subjectsMap.get(s.matiere_id);

    const rName = r ? r.nom_salle : "Salle inconnue";
    const subName = subject ? subject.nom_matiere : "Matière inconnue";
    const tName = teacher ? teacher.nom : "Enseignant inconnu";
    const clName = cls ? cls.nom_classe : "Classe inconnue";

    // 1. Capacity checking
    if (r && cls) {
      if (cls.effectif > r.capacite) {
        conflicts.push({
          id: `c-cap-${s.id}`,
          type: "capacity_overflow",
          severity: "warning",
          message: `Dépassement de capacité : La classe "${clName}" (${cls.effectif} étudiants) à "${s.jour}" à ${s.heure_debut} dépasse la capacité de ${rName} (${r.capacite} places).`,
          targetIds: [s.id]
        });
      }
    }

    // 2. Teacher availability checking
    if (teacher) {
      // Determine slot key (Matin is before 13:00, ApresMidi is after 13:00)
      const hour = parseInt(s.heure_debut.split(":")[0]);
      const sessionPeriod = hour < 13 ? "Matin" : "ApresMidi";
      const slotKey = `${s.jour}-${sessionPeriod}`;
      if (!teacher.disponibilites.includes(slotKey)) {
        conflicts.push({
          id: `c-t-unav-${s.id}`,
          type: "teacher_unav",
          severity: "warning",
          message: `Indisponibilité enseignant : ${tName} n'a pas déclaré de disponibilité pour le créneau "${s.jour} ${sessionPeriod}" (Cours: ${subName}).`,
          targetIds: [s.id]
        });
      }
    }

    // Compare with subsequent schedules to find duplicate layouts
    for (let j = idx + 1; j < schedules.length; j++) {
      const other = schedules[j];
      if (isOverlapping(s, other)) {
        const otherCls = classesMap.get(other.classe_id);
        const otherClName = otherCls ? otherCls.nom_classe : "Classe inconnue";
        const otherTeacher = teachersMap.get(other.enseignant_id);
        const otherTName = otherTeacher ? otherTeacher.nom : "Enseignant inconnu";
        const otherSubject = subjectsMap.get(other.matiere_id);
        const otherSubName = otherSubject ? otherSubject.nom_matiere : "Matière inconnue";

        // Classroom overlap
        if (s.salle_id === other.salle_id) {
          conflicts.push({
            id: `c-room-${s.id}-${other.id}`,
            type: "classroom_double",
            severity: "high",
            message: `Conflit de Salle : La salle "${rName}" est réservée simultanément pour "${subName}" (${clName}) et "${otherSubName}" (${otherClName}) le ${s.jour} à ${s.heure_debut}.`,
            targetIds: [s.id, other.id]
          });
        }

        // Teacher overlap
        if (s.enseignant_id === other.enseignant_id) {
          conflicts.push({
            id: `c-teacher-${s.id}-${other.id}`,
            type: "teacher_double",
            severity: "high",
            message: `Conflit Enseignant : ${tName} est planifié(e) simultanément sur 2 cours à ${s.jour} de ${s.heure_debut} à ${s.heure_fin} ("${subName}" et "${otherSubName}").`,
            targetIds: [s.id, other.id]
          });
        }

        // Class overlap
        if (s.classe_id === other.classe_id) {
          conflicts.push({
            id: `c-class-${s.id}-${other.id}`,
            type: "class_double",
            severity: "high",
            message: `Conflit Classe/Groupe : Les étudiants de "${clName}" ont deux cours simultanés le ${s.jour} à ${s.heure_debut} ("${subName}" et "${otherSubName}").`,
            targetIds: [s.id, other.id]
          });
        }
      }
    }
  });

  return conflicts;
}

// -----------------------------------------------------
// DATABASE CRUD & ACTIONS APIS
// -----------------------------------------------------

// Get complete database snapshot
app.get("/api/state", (req, res) => {
  const db = loadDB();
  res.json({
    state: db,
    conflicts: analyzeConflicts(db)
  });
});

// User Account Registration
app.post("/api/users/register", (req, res) => {
  const { nom, email, role, assocId, specialite, nomClasse } = req.body;
  
  if (!nom || !email || !role) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  const db = loadDB();
  
  // Check if email already exists
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Cette adresse e-mail est déjà utilisée." });
  }

  let finalAssocId = assocId;

  if (role === "teacher" && !finalAssocId) {
    // Create teacher profile
    const newId = `t-${Date.now()}`;
    db.teachers.push({
      id: newId,
      nom,
      specialite: specialite || "Général",
      email,
      disponibilites: ["Lundi-Matin", "Mardi-Matin", "Mercredi-Matin", "Jeudi-Matin", "Vendredi-Matin"]
    });
    finalAssocId = newId;
  } else if (role === "student" && !finalAssocId) {
    // Create a school class
    const newId = `c-${Date.now()}`;
    db.schoolClasses.push({
      id: newId,
      nom_classe: nomClasse || `Promo - ${nom}`,
      niveau: "Licence 1",
      effectif: 30
    });
    finalAssocId = newId;
  }

  const newUser: User = {
    id: `u-${Date.now()}`,
    nom,
    email,
    role,
    assocId: finalAssocId
  };

  db.users.push(newUser);
  saveDB(db);

  res.json({
    message: "Inscription réussie !",
    user: newUser,
    state: db,
    conflicts: analyzeConflicts(db)
  });
});

// User Password Recovery
app.post("/api/users/forgot-password", (req, res) => {
  const { email, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: "L'adresse e-mail est requise." });
  }

  const db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);

  if (!user) {
    return res.status(404).json({ error: "Aucun compte trouvé avec cet e-mail pour ce rôle." });
  }

  const tempPass = `Pass-${Math.floor(1000 + Math.random() * 9000)}`;
  res.json({
    message: `Réinitialisation demandée d'e-mail académique pour ${user.nom}.`,
    tempPassword: tempPass,
    instructions: `Un e-mail de récupération académique simulé a été envoyé pour relier ${email}. Utilisez le mot de passe provisoire [ ${tempPass} ] pour vous connecter.`
  });
});

// Update standard DB nodes (saving state directly)
app.post("/api/state/reset", (req, res) => {
  saveDB(DEFAULT_DB);
  res.json({ message: "Base de données réinitialisée aux valeurs par défaut", state: DEFAULT_DB, conflicts: analyzeConflicts(DEFAULT_DB) });
});

// Classrooms CRUD
app.get("/api/classrooms", (req, res) => {
  res.json(loadDB().classrooms);
});
app.post("/api/classrooms", (req, res) => {
  const db = loadDB();
  const newRm: Classroom = {
    id: `s-${Date.now()}`,
    nom_salle: req.body.nom_salle || "Nouvelle Salle",
    capacite: Number(req.body.capacite) || 30,
    type: req.body.type || "normale"
  };
  db.classrooms.push(newRm);
  saveDB(db);
  res.status(201).json(newRm);
});
app.put("/api/classrooms/:id", (req, res) => {
  const db = loadDB();
  const idx = db.classrooms.findIndex(r => r.id === req.params.id);
  if (idx !== -1) {
    db.classrooms[idx] = { ...db.classrooms[idx], ...req.body };
    saveDB(db);
    res.json(db.classrooms[idx]);
  } else {
    res.status(404).json({ error: "Salle non trouvée" });
  }
});
app.delete("/api/classrooms/:id", (req, res) => {
  const db = loadDB();
  db.classrooms = db.classrooms.filter(r => r.id !== req.params.id);
  db.schedules = db.schedules.filter(s => s.salle_id !== req.params.id); // clean references
  saveDB(db);
  res.json({ message: "Salle supprimée" });
});

// Teachers CRUD
app.get("/api/teachers", (req, res) => {
  res.json(loadDB().teachers);
});
app.post("/api/teachers", (req, res) => {
  const db = loadDB();
  const newT: Teacher = {
    id: `t-${Date.now()}`,
    nom: req.body.nom || "Nouvel Enseignant",
    specialite: req.body.specialite || "Informatique Générale",
    email: req.body.email || "teacher@smartschedule.edu",
    disponibilites: req.body.disponibilites || ["Lundi-Matin", "Mardi-Matin", "Jeudi-Matin"]
  };
  db.teachers.push(newT);
  saveDB(db);
  res.status(201).json(newT);
});
app.put("/api/teachers/:id", (req, res) => {
  const db = loadDB();
  const idx = db.teachers.findIndex(t => t.id === req.params.id);
  if (idx !== -1) {
    db.teachers[idx] = { ...db.teachers[idx], ...req.body };
    saveDB(db);
    res.json(db.teachers[idx]);
  } else {
    res.status(404).json({ error: "Enseignant non trouvé" });
  }
});
app.delete("/api/teachers/:id", (req, res) => {
  const db = loadDB();
  db.teachers = db.teachers.filter(t => t.id !== req.params.id);
  db.schedules = db.schedules.filter(s => s.enseignant_id !== req.params.id);
  saveDB(db);
  res.json({ message: "Enseignant supprimé" });
});

// Classes CRUD
app.get("/api/classes", (req, res) => {
  res.json(loadDB().schoolClasses);
});
app.post("/api/classes", (req, res) => {
  const db = loadDB();
  const newC: SchoolClass = {
    id: `c-${Date.now()}`,
    nom_classe: req.body.nom_classe || "Filière Nouvelle",
    niveau: req.body.niveau || "Licence 1",
    effectif: Number(req.body.effectif) || 25
  };
  db.schoolClasses.push(newC);
  saveDB(db);
  res.status(201).json(newC);
});
app.put("/api/classes/:id", (req, res) => {
  const db = loadDB();
  const idx = db.schoolClasses.findIndex(c => c.id === req.params.id);
  if (idx !== -1) {
    db.schoolClasses[idx] = { ...db.schoolClasses[idx], ...req.body };
    saveDB(db);
    res.json(db.schoolClasses[idx]);
  } else {
    res.status(404).json({ error: "Classe non trouvée" });
  }
});
app.delete("/api/classes/:id", (req, res) => {
  const db = loadDB();
  db.schoolClasses = db.schoolClasses.filter(c => c.id !== req.params.id);
  db.schedules = db.schedules.filter(s => s.classe_id !== req.params.id);
  saveDB(db);
  res.json({ message: "Classe supprimée" });
});

// Subjects CRUD (Matières)
app.get("/api/subjects", (req, res) => {
  res.json(loadDB().subjects);
});
app.post("/api/subjects", (req, res) => {
  const db = loadDB();
  const newSub: Subject = {
    id: `sub-${Date.now()}`,
    nom_matiere: req.body.nom_matiere || "Nouvelle Matière",
    volume_horaire: Number(req.body.volume_horaire) || 30,
    coefficient: Number(req.body.coefficient) || 2,
    enseignant_id: req.body.enseignant_id || (db.teachers[0]?.id || "")
  };
  db.subjects.push(newSub);
  saveDB(db);
  res.status(201).json(newSub);
});
app.put("/api/subjects/:id", (req, res) => {
  const db = loadDB();
  const idx = db.subjects.findIndex(s => s.id === req.params.id);
  if (idx !== -1) {
    db.subjects[idx] = { ...db.subjects[idx], ...req.body };
    saveDB(db);
    res.json(db.subjects[idx]);
  } else {
    res.status(404).json({ error: "Matière non trouvée" });
  }
});
app.delete("/api/subjects/:id", (req, res) => {
  const db = loadDB();
  db.subjects = db.subjects.filter(s => s.id !== req.params.id);
  db.schedules = db.schedules.filter(s => s.matiere_id !== req.params.id);
  saveDB(db);
  res.json({ message: "Matière supprimée" });
});

// Schedules CRUD
app.get("/api/schedules", (req, res) => {
  res.json(loadDB().schedules);
});

app.post("/api/schedules", (req, res) => {
  const db = loadDB();
  const { jour, heure_debut, heure_fin, enseignant_id, salle_id, matiere_id, classe_id } = req.body;
  
  if (!jour || !heure_debut || !heure_fin || !enseignant_id || !salle_id || !matiere_id || !classe_id) {
    return res.status(400).json({ error: "Tous les champs de planification sont requis." });
  }

  const newSchedule: Schedule = {
    id: `sch-${Date.now()}`,
    jour,
    heure_debut,
    heure_fin,
    enseignant_id,
    salle_id,
    matiere_id,
    classe_id
  };

  db.schedules.push(newSchedule);
  saveDB(db);

  // Return generated schedule along with conflict recalculations
  res.json({
    schedule: newSchedule,
    conflicts: analyzeConflicts(db),
    state: db
  });
});

app.put("/api/schedules/:id", (req, res) => {
  const db = loadDB();
  const idx = db.schedules.findIndex(s => s.id === req.params.id);
  if (idx !== -1) {
    db.schedules[idx] = { ...db.schedules[idx], ...req.body };
    saveDB(db);
    res.json({
      schedule: db.schedules[idx],
      conflicts: analyzeConflicts(db),
      state: db
    });
  } else {
    res.status(404).json({ error: "Cours planifié non trouvé" });
  }
});

app.delete("/api/schedules/:id", (req, res) => {
  const db = loadDB();
  db.schedules = db.schedules.filter(s => s.id !== req.params.id);
  saveDB(db);
  res.json({
    message: "Planification supprimée avec succès",
    conflicts: analyzeConflicts(db),
    state: db
  });
});

// Clears all currently planned schedules
app.post("/api/schedules/clear-all", (req, res) => {
  const db = loadDB();
  db.schedules = [];
  saveDB(db);
  res.json({
    state: db,
    conflicts: []
  });
});

// -----------------------------------------------------------------------------
// INTELLIGENT AUTO-SCHEDULING RESOLVER (SOLVER HEURISTIQUE)
// -----------------------------------------------------------------------------
// This tries to automatically schedule subjects for all classes based on constraints.
// It matches:
// Create an optimal schedule schedule matching:
// - Slot lists (Lundi - Samedi)
// - Simple hours (08:30 - 10:30, 10:30 - 12:30, 13:30 - 15:30, 15:30 - 17:30)
// - Capacity match, teacheravailability, room compatibility.
app.post("/api/schedules/generate-auto", (req, res) => {
  const db = loadDB();
  const classrooms = db.classrooms;
  const teachers = db.teachers;
  const classes = db.schoolClasses;
  const subjects = db.subjects;
  
  // Wipe current schedules first to perform true optimal generation or merge depending on user choice
  const keepCurrentValue = req.body.keepExisting === true;
  let currentSchedules = keepCurrentValue ? [...db.schedules] : [];

  const days: DayOfWeek[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const timeSlots = [
    { start: "08:30", end: "10:30", label: "Matin" },
    { start: "10:30", end: "12:30", label: "Matin" },
    { start: "13:30", end: "15:30", label: "ApresMidi" },
    { start: "15:30", end: "17:30", label: "ApresMidi" },
  ];

  // Map helpers
  const teachersMap = new Map(teachers.map(t => [t.id, t]));

  // Track constraints during generation simple checks
  const isRoomOccupied = (salleId: string, day: DayOfWeek, start: string) => {
    return currentSchedules.some(s => s.salle_id === salleId && s.jour === day && s.heure_debut === start);
  };

  const isTeacherBusy = (teacherId: string, day: DayOfWeek, start: string) => {
    return currentSchedules.some(s => s.enseignant_id === teacherId && s.jour === day && s.heure_debut === start);
  };

  const isClassBusy = (classId: string, day: DayOfWeek, start: string) => {
    return currentSchedules.some(s => s.classe_id === classId && s.jour === day && s.heure_debut === start);
  };

  const isTeacherAvailable = (teacherId: string, day: DayOfWeek, period: string) => {
    const t = teachersMap.get(teacherId);
    if (!t) return false;
    return t.disponibilites.includes(`${day}-${period}`);
  };

  let assignedCount = 0;
  let failuresCount = 0;

  // Let's attempt to schedule 2 sessions of 2 hours for every single subject in the curriculum!
  for (const schoolClass of classes) {
    // Find subjects taught
    // Each subject has a default associated teacher
    const classSubjects = subjects.filter(sub => {
      // For general simulation, subjects are schoolwide, but let's associate or assign sessions
      return true; // We can assign any of our university subjects to the classes
    });

    for (const sub of classSubjects) {
      // Attempt to schedule 1 session first for each subject to ensure balanced timetable
      const sessionsToSchedule = 1; 

      for (let sNum = 0; sNum < sessionsToSchedule; sNum++) {
        let placed = false;

        // Loop days & timeslots looking for a collision-free spot
        breakLabel:
        for (const day of days) {
          for (const slot of timeSlots) {
            // Check if teacher is busy
            if (isTeacherBusy(sub.enseignant_id, day, slot.start)) continue;
            // Check if class is busy
            if (isClassBusy(schoolClass.id, day, slot.start)) continue;
            // Check teacher availability
            if (!isTeacherAvailable(sub.enseignant_id, day, slot.label)) continue;

            // Find an accurate empty classroom that has capacity >= class effectif
            // Preferred match: computer labs for IT subjects if possible, amphitheatre for large groups
            const suitableRooms = classrooms
              .filter(r => r.capacite >= schoolClass.effectif)
              .sort((a, b) => a.capacite - b.capacite); // select smallest room that fits

            for (const room of suitableRooms) {
              if (isRoomOccupied(room.id, day, slot.start)) continue;

              // All clear! Schedule this course
              currentSchedules.push({
                id: `sch-auto-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                jour: day,
                heure_debut: slot.start,
                heure_fin: slot.end,
                enseignant_id: sub.enseignant_id,
                salle_id: room.id,
                matiere_id: sub.id,
                classe_id: schoolClass.id
              });
              assignedCount++;
              placed = true;
              break breakLabel;
            }
          }
        }
        if (!placed) {
          failuresCount++;
        }
      }
    }
  }

  db.schedules = currentSchedules;
  saveDB(db);

  res.json({
    success: true,
    assignedCount,
    failuresCount,
    state: db,
    conflicts: analyzeConflicts(db)
  });
});

// -----------------------------------------------------------------------------
// SERVER-SIDE AI ORBIT/AUDIT OPTIMIZER VIA GEMINI API
// -----------------------------------------------------------------------------
app.post("/api/ai/audit", async (req, res) => {
  const db = loadDB();
  const currentConflicts = analyzeConflicts(db);
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(200).json({
      success: false,
      errorMsg: "La clé API Gemini n'a pas encore été configurée. Vous pouvez l'ajouter dans l'onglet Settings > Secrets.",
      htmlFeedback: `<div class="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-sm">
        <strong>Clé API non disponible</strong>: L'assistant n'a pas pu s'initialiser. Veuillez déclarer une variable <strong>GEMINI_API_KEY</strong> dans le menu des secrets. Le système de résolution continue d'opérer avec la logique métier déterministe intégrée.
      </div>`
    });
  }

  try {
    // Construct rich context prompt mapping db statistics
    const prompt = `
Vous êtes un expert en logistique académique et planification universitaire de SmartSchedule. Analyser les données scolaires suivantes pour fournir un rapport d'audit ergonomique en français.

STATISTIQUES DE L'ÉTABLISSEMENT :
- Salles de classe définies: ${JSON.stringify(db.classrooms)}
- Enseignants et disponibilités déclarées: ${JSON.stringify(db.teachers)}
- Filières / Classes d'élèves: ${JSON.stringify(db.schoolClasses)}
- Matières et coefficients: ${JSON.stringify(db.subjects)}
- Emplacement d'horaires planifiés: ${JSON.stringify(db.schedules)}

CONFLITS ACTUELS DÉTECTÉS PAR LE MOTEUR ALGORITHMIQUE :
${JSON.stringify(currentConflicts.map(c => c.message))}

INSTRUCTIONS :
Générez un plan d'action de réorganisation didactique en 3 sections claires :
1. **Évaluation générale de la charge** : L'utilisation des salles (taux de remplissage des créneaux) et l'adéquation salle/classe (éviter gâchis de capacité).
2. **Recommandations de résolution des conflits actifs** : Pour chaque conflit critique listé ci-dessus, proposer un créneau de repli précis (jour, horaire, salle vacante alternative) en tenant compte des compétences de l'enseignant et de l'effectif étudiant.
3. **Optimisation Pédagogique Smart** : Suggérer des ajustements pour maximiser le confort de travail des enseignants et limiter les heures creuses pour les étudiants.

Important: Retournez la réponse au format Markdown propre, bien aéré, avec des icônes indicatrices et sans répéter d'informations techniques internes futiles.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const markdownText = response.text || "Aucune recommandation n'a pu être formulée par le modèle.";

    res.json({
      success: true,
      auditReport: markdownText
    });
  } catch (error: any) {
    console.error("Gemini Audit failed", error);
    res.status(500).json({
      success: false,
      errorMsg: "La requête d'assistance intelligente a échoué : " + (error.message || error)
    });
  }
});


// -----------------------------------------------------
// VITE OR STATIC BUILD MIDDLEWARE
// -----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartSchedule server running on port ${PORT}`);
  });
}

startServer();
