export interface InstructorDashboardStats {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    monthlyRevenue: number;
    revenueTarget: number;
    weeklyAttendanceRate: number;
    overduePayments: number;
    overdueAmount: number;
    todaysClasses: number;
    thisWeekClasses: number;
    completedClassesThisWeek: number;
    trends: {
        studentsGrowth: number;
        revenueGrowth: number;
        attendanceChange: number;
        classesChange: number;
    };
}
export interface InstructorClassScheduleItem {
    id: string;
    name: string;
    time: string;
    type: "ballet" | "pilates";
    students: number;
    capacity: number;
    status: "upcoming" | "ongoing" | "completed";
}
export interface InstructorRecentActivity {
    id: string;
    type: "payment" | "registration" | "attendance" | "class" | "enrollment";
    message: string;
    time: string;
    avatar?: string;
    priority?: "high" | "medium" | "low";
}
export interface InstructorWeeklySummaryData {
    totalClasses: number;
    completedClasses: number;
    attendanceRate: number;
    income: number;
    incomeTarget: number;
}
export interface InstructorActivityFilters {
    limit?: number | undefined;
    type?: 'payment' | 'registration' | 'attendance' | 'class' | 'enrollment' | undefined;
    priority?: 'high' | 'medium' | 'low' | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}
