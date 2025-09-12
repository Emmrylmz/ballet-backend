// Student interfaces
export interface Student {
  id: string;
  establishmentId: string;
  userId?: string; // Linked user account
  name: string;
  email?: string;
  phone: string;
  emergencyContact: string;
  emergencyContactName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  birthDate?: string;
  medicalNotes?: string;
  registrationDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extended student info for instructor view
export interface StudentProfile extends Student {
  userEmail?: string; // From linked user account
  activeCohorts: number;
  totalSessions: number;
  cohortNames: string[];
  lastAttendance?: Date;
  attendanceRate?: number;
}

// Search and filtering
export interface StudentSearchFilters {
  q?: string; // Name, email, phone search
  status?: 'active' | 'inactive' | 'all';
  cohortId?: string;
  available?: boolean; // Not in any active cohorts
  ageMin?: number;
  ageMax?: number;
  limit?: number;
  offset?: number;
}

export interface StudentSearchResult {
  id: string;
  name: string;
  email?: string;
  phone: string;
  userEmail?: string;
  isActive: boolean;
  activeCohorts: number;
  cohortNames: string[];
  registrationDate: string;
}

// Student creation and updates
export interface CreateStudentRequest {
  name: string;
  email?: string;
  phone: string;
  emergencyContact: string;
  emergencyContactName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  birthDate?: string;
  medicalNotes?: string;
}

export interface UpdateStudentRequest {
  name?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  birthDate?: string;
  medicalNotes?: string;
  isActive?: boolean;
}

// Roster and class management
export interface StudentRosterEntry {
  id: string;
  name: string;
  phone: string;
  emergencyContact: string;
  medicalNotes?: string;
  isPresent?: boolean;
  isLate?: boolean;
  notes?: string;
}

// Progress notes
export interface StudentNote {
  id: string;
  studentId: string;
  instructorId: string;
  instructorName: string;
  sessionId?: string;
  note: string;
  category: 'progress' | 'behavior' | 'medical' | 'general';
  createdAt: Date;
}

export interface CreateStudentNoteRequest {
  note: string;
  category: 'progress' | 'behavior' | 'medical' | 'general';
  sessionId?: string;
}

// Response interfaces
export interface StudentResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedStudentResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
  error?: {
    code: string;
    message: string;
  };
}

// Statistics and analytics
export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  newThisMonth: number;
  averageCohortsPerStudent: number;
  topCohorts: {
    cohortId: string;
    cohortName: string;
    studentCount: number;
  }[];
}