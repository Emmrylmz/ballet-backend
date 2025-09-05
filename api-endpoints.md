 Here's the comprehensive list of API endpoints
  required by all the hooks with their input/output
  types:

  Students API (src/hooks/api/useStudents.ts)

  GET /students
  - Input: StudentFilters (search?, status?,
  packageType?, paymentStatus?, page?, limit?)
  - Output: PaginatedResponse<Student>

  GET /students/:id
  - Input: id: string
  - Output: Student

  POST /students
  - Input: CreateStudentData
  - Output: Student

  PUT /students/:id
  - Input: id: string, data: UpdateStudentData
  - Output: Student

  DELETE /students/:id
  - Input: id: string
  - Output: void

  GET /students/stats
  - Input: None
  - Output: StudentStats

  Payments API (src/hooks/api/usePayments.ts)

  GET /payments
  - Input: PaymentFilters (studentId?, paymentMethod?,
  paymentType?, status?, dateFrom?, dateTo?,
  amountMin?, amountMax?, page?, limit?)
  - Output: PaginatedResponse<PaymentRecord>

  GET /payments/:id
  - Input: id: string
  - Output: PaymentRecord

  GET /payments/student/:studentId
  - Input: studentId: string
  - Output: PaymentRecord[]

  GET /payments/stats
  - Input: { dateFrom?: string, dateTo?: string }
  - Output: PaymentStats

  GET /payments/reports
  - Input: { dateFrom: string, dateTo: string }
  - Output: PaymentReport

  GET /payments/student-summaries
  - Input: { status?: string }
  - Output: PaginatedResponse<StudentPaymentSummary>

  POST /payments
  - Input: CreatePaymentData
  - Output: PaymentRecord

  PUT /payments/:id
  - Input: id: string, data: UpdatePaymentData
  - Output: PaymentRecord

  DELETE /payments/:id
  - Input: id: string
  - Output: void

  POST /payments/reminders
  - Input: SendReminderData
  - Output: { sent: number; failed: number }

  POST /payments/bulk-update
  - Input: { updates: Array<{ id: string; data:
  UpdatePaymentData }> }
  - Output: void

  Classes API (src/hooks/api/useClasses.ts)

  GET /class-templates
  - Input: ClassTemplateFilters (search?, type?,
  level?, isActive?, page?, limit?)
  - Output: PaginatedResponse<ClassTemplate>

  GET /class-templates/:id
  - Input: id: string
  - Output: ClassTemplate

  GET /class-templates/stats
  - Input: None
  - Output: ClassStats

  POST /class-templates
  - Input: CreateClassTemplateData
  - Output: ClassTemplate

  PUT /class-templates/:id
  - Input: id: string, data: UpdateClassTemplateData
  - Output: ClassTemplate

  DELETE /class-templates/:id
  - Input: id: string
  - Output: void

  GET /sessions
  - Input: SessionFilters (classTemplateId?, dateFrom?,
   dateTo?, status?, page?, limit?)
  - Output: PaginatedResponse<ClassSession>

  GET /sessions/:id
  - Input: id: string
  - Output: ClassSession

  POST /sessions
  - Input: CreateSessionData
  - Output: ClassSession

  PUT /sessions/:id
  - Input: id: string, data: UpdateSessionData
  - Output: ClassSession

  DELETE /sessions/:id
  - Input: id: string
  - Output: void

  GET /sessions/today
  - Input: None
  - Output: ClassSession[]

  Attendance API (src/hooks/api/useAttendance.ts)

  GET /attendance/today
  - Input: None
  - Output: SessionAttendance[]

  GET /attendance/session/:sessionId
  - Input: sessionId: string
  - Output: AttendanceRecord[]

  GET /attendance/student/:studentId
  - Input: studentId: string, { dateFrom?: string,
  dateTo?: string }
  - Output: AttendanceRecord[]

  GET /attendance/stats
  - Input: { dateFrom?: string, dateTo?: string }
  - Output: AttendanceStats

  POST /attendance/record
  - Input: RecordAttendanceData
  - Output: { success: boolean; recordedCount: number }

  PUT /attendance/:id
  - Input: id: string, data: UpdateAttendanceData
  - Output: AttendanceRecord

  DELETE /attendance/:id
  - Input: id: string
  - Output: void

  POST /attendance/bulk-update
  - Input: { updates: Array<{ id: string; data:
  UpdateAttendanceData }> }
  - Output: void

  Key Type Definitions

  Student
  interface Student {
    id: string;
    name: string;
    email?: string;
    phone: string;
    emergencyContact: string;
    registrationDate: string;
    packageType: "monthly" | "8-class" | "drop-in";
    remainingClasses?: number;
    lastPayment: string;
    paymentStatus: "current" | "due" | "overdue";
    attendanceRate: number;
    isActive: boolean;
    medicalNotes?: string;
  }

  PaymentRecord
  interface PaymentRecord {
    id: string;
    studentId: string;
    studentName: string;
    studentPackageId?: string;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer';
    paymentType: 'monthly' | '8-class' | 'drop-in' |
  'makeup';
    paymentDate: string;
    dueDate?: string;
    description?: string;
    recordedBy: string;
    createdAt: string;
  }

  SessionAttendance
  interface SessionAttendance {
    sessionId: string;
    sessionName: string;
    sessionTime: string;
    sessionDate: string;
    classType: string;
    instructor: string;
    isMarked: boolean;
    studentsEnrolled: number;
    studentsPresent?: number;
    studentsAbsent?: number;
  }

  PaginatedResponse
  interface PaginatedResponse<T> {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  All endpoints use standard HTTP status codes and
  return JSON responses. Authentication/authorization
  headers should be included as needed.