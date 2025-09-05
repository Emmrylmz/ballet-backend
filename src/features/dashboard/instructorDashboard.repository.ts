import { DatabaseService } from "../../services/DatabaseService.js";
import {
  InstructorDashboardStats,
  InstructorClassScheduleItem,
  InstructorRecentActivity,
  InstructorWeeklySummaryData,
  InstructorActivityFilters,
} from "./instructorDashboard.types.js";

export class InstructorDashboardRepository {
  constructor(private db: DatabaseService) {}

  /**
   * Verify user has instructor role in the specified establishment
   * This method is optimized for caching and can be easily unit tested
   */
  private async verifyInstructorAccess(
    userId: string,
    establishmentId: string
  ): Promise<void> {
    const result = await this.db.query(
      `
      SELECT 1 
      FROM users 
      WHERE id = $1 AND establishment_id = $2 AND role = 'instructor' AND status = 'active'
    `,
      [userId, establishmentId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "User does not have instructor access to this establishment"
      );
    }
  }

  /**
   * Get dashboard stats for a specific establishment using optimized views
   */
  async getStatsForEstablishment(
    establishmentId: string,
    userId: string
  ): Promise<InstructorDashboardStats> {
    try {
      // Fast auth check - can be cached by DB
      await this.verifyInstructorAccess(userId, establishmentId);

      // Optimized: Combine related queries using Promise.all for parallel execution
      const [statsResult, attendanceResult, targetResult] = await Promise.all([
        this.db.query(
          `
          SELECT 
            total_students,
            total_instructors,
            todays_classes,
            monthly_payments,
            monthly_revenue,
            overdue_payments
          FROM dashboard_stats 
          WHERE establishment_id = $1
        `,
          [establishmentId]
        ),

        this.db.query(
          `
          SELECT COALESCE(
            ROUND(
              COUNT(*) FILTER (WHERE ar.status IN ('present', 'late')) * 100.0 / 
              NULLIF(COUNT(*), 0), 1
            ), 0
          ) as weekly_attendance_rate
          FROM attendance_records ar
          JOIN class_sessions cs ON ar.session_id = cs.id
          WHERE cs.establishment_id = $1
            AND cs.session_date >= CURRENT_DATE - interval '7 days'
        `,
          [establishmentId]
        ),

        this.db.query(
          `
          SELECT value::numeric as target
          FROM settings 
          WHERE establishment_id = $1 AND key = 'monthly_revenue_target'
        `,
          [establishmentId]
        ),
      ]);

      const stats = statsResult.rows[0] || {};
      const attendanceRate =
        attendanceResult.rows[0]?.weekly_attendance_rate || 0;
      const revenueTarget = targetResult.rows[0]?.target || 5000;

      return {
        totalStudents: parseInt(stats.total_students) || 0,
        activeStudents: parseInt(stats.total_students) || 0,
        inactiveStudents: 0,
        monthlyRevenue: parseFloat(stats.monthly_revenue) || 0,
        revenueTarget: parseFloat(revenueTarget),
        weeklyAttendanceRate: parseFloat(attendanceRate),
        overduePayments: parseInt(stats.overdue_payments) || 0,
        overdueAmount: 0,
        todaysClasses: parseInt(stats.todays_classes) || 0,
        thisWeekClasses: 0,
        completedClassesThisWeek: 0,
        trends: {
          studentsGrowth: 0,
          revenueGrowth: 0,
          attendanceChange: 0,
          classesChange: 0,
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return this.getDefaultStats();
    }
  }

  private getDefaultStats(): InstructorDashboardStats {
    return {
      totalStudents: 0,
      activeStudents: 0,
      inactiveStudents: 0,
      monthlyRevenue: 0,
      revenueTarget: 5000,
      weeklyAttendanceRate: 0,
      overduePayments: 0,
      overdueAmount: 0,
      todaysClasses: 0,
      thisWeekClasses: 0,
      completedClassesThisWeek: 0,
      trends: {
        studentsGrowth: 0,
        revenueGrowth: 0,
        attendanceChange: 0,
        classesChange: 0,
      },
    };
  }

  /**
   * Get recent activities for a specific establishment using optimized view
   */
  async getRecentActivitiesForEstablishment(
    establishmentId: string,
    userId: string,
    filters: InstructorActivityFilters = {}
  ): Promise<InstructorRecentActivity[]> {
    // Fast auth check
    await this.verifyInstructorAccess(userId, establishmentId);

    const { limit = 10, type, priority, dateFrom, dateTo } = filters;

    let whereConditions = [`establishment_id = $1`];
    let params = [establishmentId];

    if (type) {
      whereConditions.push(`activity_type = $${params.length + 1}`);
      params.push(type);
    }

    if (priority) {
      whereConditions.push(`priority = $${params.length + 1}`);
      params.push(priority);
    }

    if (dateFrom) {
      whereConditions.push(`created_at >= $${params.length + 1}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`created_at <= $${params.length + 1}`);
      params.push(dateTo);
    }

    const query = `
      SELECT 
        id,
        activity_type as type,
        title as message,
        created_at as time,
        priority,
        student_name
      FROM dashboard_activities
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit.toString());

    const result = await this.db.query(query, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      message: row.message,
      time: row.time.toISOString(),
      priority: row.priority,
      avatar: undefined,
    }));
  }

  /**
   * Get weekly summary for a specific establishment using optimized view
   */
  async getWeeklySummaryForEstablishment(
    establishmentId: string,
    userId: string
  ): Promise<InstructorWeeklySummaryData> {
    // Fast auth check
    await this.verifyInstructorAccess(userId, establishmentId);

    // Parallel execution for better performance
    const [summaryResult, targetResult] = await Promise.all([
      this.db.query(
        `
        SELECT 
          weekly_classes,
          weekly_revenue,
          weekly_active_students
        FROM dashboard_weekly_summary
        WHERE establishment_id = $1
      `,
        [establishmentId]
      ),

      this.db.query(
        `
        SELECT value::numeric as target
        FROM settings 
        WHERE establishment_id = $1 AND key = 'weekly_revenue_target'
      `,
        [establishmentId]
      ),
    ]);

    const data = summaryResult.rows[0] || {};
    return {
      totalClasses: parseInt(data.weekly_classes) || 0,
      completedClasses: 0,
      attendanceRate: 0,
      income: parseFloat(data.weekly_revenue) || 0,
      incomeTarget: targetResult.rows[0]?.target || 1250,
    };
  }

  /**
   * Get today's classes for a specific establishment using optimized view
   */
  async getTodaysClassesForEstablishment(
    establishmentId: string,
    userId: string
  ): Promise<InstructorClassScheduleItem[]> {
    // Fast auth check
    await this.verifyInstructorAccess(userId, establishmentId);

    const result = await this.db.query(
      `
      SELECT 
        id,
        class_title as name,
        start_time as time,
        end_time,
        class_type as type,
        enrolled_count as students,
        capacity,
        status
      FROM dashboard_todays_classes
      WHERE establishment_id = $1
      ORDER BY start_time
    `,
      [establishmentId]
    );

    return result.rows.map((row: any) => {
      const currentTime = new Date();
      const classTime = new Date(`${new Date().toDateString()} ${row.time}`);
      const endTime = new Date(`${new Date().toDateString()} ${row.end_time}`);

      let status: "upcoming" | "ongoing" | "completed" = "upcoming";

      if (row.status === "completed") {
        status = "completed";
      } else if (currentTime >= classTime && currentTime <= endTime) {
        status = "ongoing";
      } else if (currentTime > endTime) {
        status = "completed";
      }

      return {
        id: row.id,
        name: row.name,
        time: row.time,
        type: row.type,
        students: parseInt(row.students) || 0,
        capacity: row.capacity,
        status,
      };
    });
  }

  // Legacy methods with deprecation warnings
  async getStats(): Promise<InstructorDashboardStats> {
    console.warn(
      "Using legacy getStats method - should use getStatsForEstablishment"
    );
    return this.getDefaultStats();
  }

  async getRecentActivities(
    filters: InstructorActivityFilters = {}
  ): Promise<InstructorRecentActivity[]> {
    console.warn(
      "Using legacy getRecentActivities method - should use getRecentActivitiesForEstablishment"
    );
    return [];
  }

  async getWeeklySummary(): Promise<InstructorWeeklySummaryData> {
    console.warn(
      "Using legacy getWeeklySummary method - should use getWeeklySummaryForEstablishment"
    );
    return {
      totalClasses: 0,
      completedClasses: 0,
      attendanceRate: 0,
      income: 0,
      incomeTarget: 1250,
    };
  }

  async getTodaysClasses(): Promise<InstructorClassScheduleItem[]> {
    console.warn(
      "Using legacy getTodaysClasses method - should use getTodaysClassesForEstablishment"
    );
    return [];
  }
}
