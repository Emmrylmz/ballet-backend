import { DatabaseService } from "../../services/DatabaseService.js";
import { Student, StudentProfile, StudentSearchFilters, StudentSearchResult, CreateStudentRequest, UpdateStudentRequest, StudentRosterEntry, StudentStats } from "./students.types.js";
export declare class StudentsRepository {
    private db;
    constructor(db: DatabaseService);
    searchStudents(establishmentId: string, filters: StudentSearchFilters): Promise<{
        students: StudentSearchResult[];
        total: number;
    }>;
    getStudentProfile(establishmentId: string, studentId: string): Promise<StudentProfile | null>;
    createStudent(establishmentId: string, studentData: CreateStudentRequest, userId?: string): Promise<Student>;
    updateStudent(establishmentId: string, studentId: string, updates: UpdateStudentRequest): Promise<Student | null>;
    getStudentById(establishmentId: string, studentId: string): Promise<Student | null>;
    getSessionRoster(establishmentId: string, sessionId: string): Promise<StudentRosterEntry[]>;
    getStudentsStats(establishmentId: string): Promise<StudentStats>;
    private mapStudentRow;
    private mapProfileRow;
    private mapSearchResultRow;
    private mapRosterRow;
}
