/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  nom: string;
  email: string;
  role: UserRole;
  assocId?: string; // Teacher or Class ID associated if any
}

export type ClassroomType = "normale" | "amphitheatre" | "informatique";

export interface Classroom {
  id: string;
  nom_salle: string;
  capacite: number;
  type: ClassroomType;
}

export interface Teacher {
  id: string;
  nom: string;
  specialite: string;
  email: string;
  disponibilites: string[]; // List of slot keys like "Lundi-Matin", "Mardi-ApresMidi"
}

export interface Subject {
  id: string;
  nom_matiere: string;
  volume_horaire: number;
  coefficient: number;
  enseignant_id: string; // Associated teacher
}

export interface SchoolClass {
  id: string;
  nom_classe: string;
  niveau: string; // e.g., Licence 1, Licence 2, Master 1
  effectif: number;
}

export type DayOfWeek = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";

export interface TimeSlot {
  id: string; // uniq combo
  debut: string; // "08:30"
  fin: string; // "10:30"
  label: string; // "M9 (08:30 - 10:30)"
}

export interface Schedule {
  id: string;
  jour: DayOfWeek;
  heure_debut: string; // e.g., "08:30"
  heure_fin: string; // e.g., "10:30"
  enseignant_id: string;
  salle_id: string;
  matiere_id: string;
  classe_id: string;
}

export interface ScheduleConflict {
  id: string;
  type: "teacher_double" | "classroom_double" | "class_double" | "capacity_overflow" | "teacher_unav";
  severity: "high" | "warning";
  message: string;
  targetIds: string[]; // Schedule IDs involved
}

export interface DBState {
  users: User[];
  classrooms: Classroom[];
  teachers: Teacher[];
  subjects: Subject[];
  schoolClasses: SchoolClass[];
  schedules: Schedule[];
}
