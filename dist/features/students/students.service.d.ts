import { StudentsRepository } from "./students.repository.js";
import { Student, StudentProfile, StudentSearchFilters, StudentSearchResult, CreateStudentRequest, UpdateStudentRequest, StudentRosterEntry, StudentStats, StudentResponse, PaginatedStudentResponse } from "./students.types.js";
import { LoggerService } from "../../services/LoggerService.js";
export declare class StudentsService {
    private studentsRepository;
    private logger;
    constructor(studentsRepository: StudentsRepository, logger: LoggerService);
    searchStudents(establishmentId: string, filters: StudentSearchFilters): Promise<PaginatedStudentResponse<StudentSearchResult>>;
    getStudentProfile(establishmentId: string, studentId: string): Promise<StudentResponse<StudentProfile>>;
    createStudent(establishmentId: string, studentData: CreateStudentRequest, userId?: string): Promise<StudentResponse<Student>>;
    updateStudent(establishmentId: string, studentId: string, updates: UpdateStudentRequest): Promise<StudentResponse<Student>>;
    getSessionRoster(establishmentId: string, sessionId: string): Promise<StudentResponse<StudentRosterEntry[]>>;
    getStudent(establishmentId: string, studentId: string): Promise<StudentResponse<Student>>;
    getStudentsStats(establishmentId: string): Promise<StudentResponse<StudentStats>>;
    deactivateStudent(establishmentId: string, studentId: string): Promise<StudentResponse<Student>>;
    reactivateStudent(establishmentId: string, studentId: string): Promise<StudentResponse<Student>>;
}
