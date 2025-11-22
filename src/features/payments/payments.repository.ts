import { DatabaseService } from "../../services/DatabaseService.js";
import {
  Payment,
  PaymentPlan,
  PaymentPlanAssignment,
  StudentPackage,
  PaymentFilters,
  PaymentPlanFilters,
  CreatePaymentRequest,
  CreatePaymentPlanRequest,
  CreateAssignmentRequest,
  UpdatePaymentRequest,
  RefundPaymentRequest,
  PaymentSummary,
  StudentPaymentHistory,
  StudentPaymentSummary,
  CohortPaymentReport,
  RecurringPaymentSchedule
} from "./payments.types.js";

export class PaymentsRepository {
  constructor(private db: DatabaseService) {}

  // Payment CRUD operations
  async createPayment(establishmentId: string, paymentData: CreatePaymentRequest, recordedBy: string): Promise<Payment> {
    const query = `
      INSERT INTO payments (
        id, establishment_id, student_id, student_package_id, amount,
        payment_method, payment_type, payment_date, due_date, description,
        recorded_by, transaction_id, is_refunded, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, NOW())
      RETURNING *
    `;

    const values = [
      establishmentId,
      paymentData.studentId || null,
      paymentData.studentPackageId || null,
      paymentData.amount,
      paymentData.paymentMethod,
      paymentData.paymentType,
      paymentData.paymentDate,
      paymentData.dueDate || null,
      paymentData.description || null,
      recordedBy,
      paymentData.transactionId || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getPaymentById(establishmentId: string, paymentId: string): Promise<Payment | null> {
    const query = `
      SELECT
        p.*,
        s.name as student_name,
        u.first_name || ' ' || u.last_name as recorded_by_name
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.id = $1 AND p.establishment_id = $2
    `;

    const result = await this.db.query(query, [paymentId, establishmentId]);
    return result.rows[0] || null;
  }

  async getPayments(establishmentId: string, filters: PaymentFilters = {}): Promise<{ payments: Payment[], total: number }> {
    const conditions = ['p.establishment_id = $1'];
    const values: any[] = [establishmentId];
    let paramCount = 1;

    if (filters.studentId) {
      conditions.push(`p.student_id = $${++paramCount}`);
      values.push(filters.studentId);
    }

    if (filters.paymentMethod) {
      conditions.push(`p.payment_method = $${++paramCount}`);
      values.push(filters.paymentMethod);
    }

    if (filters.paymentType) {
      conditions.push(`p.payment_type = $${++paramCount}`);
      values.push(filters.paymentType);
    }

    if (filters.startDate) {
      conditions.push(`p.payment_date >= $${++paramCount}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`p.payment_date <= $${++paramCount}`);
      values.push(filters.endDate);
    }

    if (filters.minAmount !== undefined) {
      conditions.push(`p.amount >= $${++paramCount}`);
      values.push(filters.minAmount);
    }

    if (filters.maxAmount !== undefined) {
      conditions.push(`p.amount <= $${++paramCount}`);
      values.push(filters.maxAmount);
    }

    if (filters.recordedBy) {
      conditions.push(`p.recorded_by = $${++paramCount}`);
      values.push(filters.recordedBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT
        p.*,
        s.name as student_name,
        u.first_name || ' ' || u.last_name as recorded_by_name
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN users u ON p.recorded_by = u.id
      ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(filters.limit || 50, filters.offset || 0);
    const result = await this.db.query(query, values);

    return {
      payments: result.rows,
      total
    };
  }

  async updatePayment(establishmentId: string, paymentId: string, updateData: UpdatePaymentRequest): Promise<Payment> {
    const updates: string[] = [];
    const values: any[] = [paymentId, establishmentId];
    let paramCount = 2;

    if (updateData.amount !== undefined) {
      updates.push(`amount = $${++paramCount}`);
      values.push(updateData.amount);
    }

    if (updateData.paymentMethod) {
      updates.push(`payment_method = $${++paramCount}`);
      values.push(updateData.paymentMethod);
    }

    if (updateData.paymentType) {
      updates.push(`payment_type = $${++paramCount}`);
      values.push(updateData.paymentType);
    }

    if (updateData.paymentDate) {
      updates.push(`payment_date = $${++paramCount}`);
      values.push(updateData.paymentDate);
    }

    if (updateData.dueDate !== undefined) {
      updates.push(`due_date = $${++paramCount}`);
      values.push(updateData.dueDate);
    }

    if (updateData.description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(updateData.description);
    }

    if (updateData.transactionId !== undefined) {
      updates.push(`transaction_id = $${++paramCount}`);
      values.push(updateData.transactionId);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE payments
      SET ${updates.join(', ')}
      WHERE id = $1 AND establishment_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async refundPayment(establishmentId: string, paymentId: string, refundData: RefundPaymentRequest): Promise<Payment> {
    const query = `
      UPDATE payments
      SET
        is_refunded = true,
        refund_amount = $3,
        refund_date = $4
      WHERE id = $1 AND establishment_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [
      paymentId,
      establishmentId,
      refundData.refundAmount,
      refundData.refundDate
    ]);

    return result.rows[0];
  }

  async deletePayment(establishmentId: string, paymentId: string): Promise<boolean> {
    const query = `DELETE FROM payments WHERE id = $1 AND establishment_id = $2`;
    const result = await this.db.query(query, [paymentId, establishmentId]);
    return result.rowCount > 0;
  }

  // Payment Plan operations
  async createPaymentPlan(establishmentId: string, planData: CreatePaymentPlanRequest, createdBy: string): Promise<PaymentPlan> {
    const query = `
      INSERT INTO payment_plans (
        id, establishment_id, name, description, amount,
        plan_type, recurrence_type, created_by, is_active, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, NOW())
      RETURNING *
    `;

    const values = [
      establishmentId,
      planData.name,
      planData.description || null,
      planData.amount,
      planData.planType,
      planData.recurrenceType,
      createdBy
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getPaymentPlanById(establishmentId: string, planId: string): Promise<PaymentPlan | null> {
    const query = `
      SELECT
        pp.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        COUNT(ppa.id) as total_assignments,
        COUNT(CASE WHEN ppa.is_active THEN 1 END) as active_assignments
      FROM payment_plans pp
      LEFT JOIN users u ON pp.created_by = u.id
      LEFT JOIN payment_plan_assignments ppa ON pp.id = ppa.payment_plan_id
      WHERE pp.id = $1 AND pp.establishment_id = $2
      GROUP BY pp.id, u.first_name, u.last_name
    `;

    const result = await this.db.query(query, [planId, establishmentId]);
    return result.rows[0] || null;
  }

  async getPaymentPlans(establishmentId: string, filters: PaymentPlanFilters = {}): Promise<{ plans: PaymentPlan[], total: number }> {
    const conditions = ['pp.establishment_id = $1'];
    const values: any[] = [establishmentId];
    let paramCount = 1;

    if (filters.planType) {
      conditions.push(`pp.plan_type = $${++paramCount}`);
      values.push(filters.planType);
    }

    if (filters.recurrenceType) {
      conditions.push(`pp.recurrence_type = $${++paramCount}`);
      values.push(filters.recurrenceType);
    }

    if (filters.isActive !== undefined) {
      conditions.push(`pp.is_active = $${++paramCount}`);
      values.push(filters.isActive);
    }

    if (filters.createdBy) {
      conditions.push(`pp.created_by = $${++paramCount}`);
      values.push(filters.createdBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_plans pp
      ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT
        pp.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        COUNT(ppa.id) as total_assignments,
        COUNT(CASE WHEN ppa.is_active THEN 1 END) as active_assignments
      FROM payment_plans pp
      LEFT JOIN users u ON pp.created_by = u.id
      LEFT JOIN payment_plan_assignments ppa ON pp.id = ppa.payment_plan_id
      ${whereClause}
      GROUP BY pp.id, u.first_name, u.last_name
      ORDER BY pp.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(filters.limit || 50, filters.offset || 0);
    const result = await this.db.query(query, values);

    return {
      plans: result.rows,
      total
    };
  }

  async updatePaymentPlan(establishmentId: string, planId: string, updateData: Partial<CreatePaymentPlanRequest>): Promise<PaymentPlan> {
    const fields: string[] = [];
    const values: any[] = [planId, establishmentId];
    let paramCount = 2;

    if (updateData.name !== undefined) {
      fields.push(`name = $${++paramCount}`);
      values.push(updateData.name);
    }

    if (updateData.description !== undefined) {
      fields.push(`description = $${++paramCount}`);
      values.push(updateData.description || null);
    }

    if (updateData.amount !== undefined) {
      fields.push(`amount = $${++paramCount}`);
      values.push(updateData.amount);
    }

    if (updateData.planType !== undefined) {
      fields.push(`plan_type = $${++paramCount}`);
      values.push(updateData.planType);
    }

    if (updateData.recurrenceType !== undefined) {
      fields.push(`recurrence_type = $${++paramCount}`);
      values.push(updateData.recurrenceType);
    }

    if ((updateData as any).isActive !== undefined) {
      fields.push(`is_active = $${++paramCount}`);
      values.push((updateData as any).isActive);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE payment_plans
      SET ${fields.join(', ')}
      WHERE id = $1 AND establishment_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Payment plan not found');
    }
    return result.rows[0];
  }

  async deletePaymentPlan(establishmentId: string, planId: string): Promise<boolean> {
    // Delete all assignments first
    await this.db.query(
      'DELETE FROM payment_plan_assignments WHERE payment_plan_id = $1',
      [planId]
    );

    // Then delete the plan
    const query = 'DELETE FROM payment_plans WHERE id = $1 AND establishment_id = $2';
    const result = await this.db.query(query, [planId, establishmentId]);
    return result.rowCount > 0;
  }

  // Assignment operations
  async createAssignment(establishmentId: string, assignmentData: CreateAssignmentRequest): Promise<PaymentPlanAssignment> {
    const query = `
      INSERT INTO payment_plan_assignments (
        id, payment_plan_id, target_type, target_id, start_date, end_date, is_active, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW())
      RETURNING *
    `;

    const values = [
      assignmentData.paymentPlanId,
      assignmentData.targetType,
      assignmentData.targetId || null,
      assignmentData.startDate,
      assignmentData.endDate || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getAssignmentsByPlan(establishmentId: string, paymentPlanId: string): Promise<PaymentPlanAssignment[]> {
    const query = `
      SELECT
        ppa.*,
        pp.name as plan_name,
        CASE
          WHEN ppa.target_type = 'student' THEN s.name
          WHEN ppa.target_type = 'cohort' THEN c.name
          ELSE 'All Students'
        END as target_name
      FROM payment_plan_assignments ppa
      JOIN payment_plans pp ON ppa.payment_plan_id = pp.id
      LEFT JOIN students s ON ppa.target_type = 'student' AND ppa.target_id::text = s.id::text
      LEFT JOIN cohorts c ON ppa.target_type = 'cohort' AND ppa.target_id::text = c.id::text
      WHERE pp.establishment_id = $1 AND ppa.payment_plan_id = $2
      ORDER BY ppa.created_at DESC
    `;

    const result = await this.db.query(query, [establishmentId, paymentPlanId]);
    return result.rows;
  }

  // Reporting and analytics
  async getPaymentSummary(establishmentId: string, startDate?: string, endDate?: string): Promise<PaymentSummary> {
    const dateFilter = startDate && endDate ?
      `AND payment_date BETWEEN '${startDate}' AND '${endDate}'` : '';

    const summaryQuery = `
      SELECT
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN due_date > CURRENT_DATE THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(refund_amount), 0) as refunded_amount
      FROM payments
      WHERE establishment_id = $1 ${dateFilter}
    `;

    const methodQuery = `
      SELECT
        payment_method as method,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM payments
      WHERE establishment_id = $1 ${dateFilter}
      GROUP BY payment_method
      ORDER BY total DESC
    `;

    const typeQuery = `
      SELECT
        payment_type as type,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM payments
      WHERE establishment_id = $1 ${dateFilter}
      GROUP BY payment_type
      ORDER BY total DESC
    `;

    const recentQuery = `
      SELECT
        p.*,
        s.name as student_name,
        u.first_name || ' ' || u.last_name as recorded_by_name
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.establishment_id = $1 ${dateFilter}
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    const [summaryResult, methodResult, typeResult, recentResult] = await Promise.all([
      this.db.query(summaryQuery, [establishmentId]),
      this.db.query(methodQuery, [establishmentId]),
      this.db.query(typeQuery, [establishmentId]),
      this.db.query(recentQuery, [establishmentId])
    ]);

    const summary = summaryResult.rows[0];
    return {
      establishmentId,
      totalRevenue: parseFloat(summary.total_revenue),
      totalPayments: parseInt(summary.total_payments),
      pendingAmount: parseFloat(summary.pending_amount),
      refundedAmount: parseFloat(summary.refunded_amount),
      paymentMethods: methodResult.rows.map((row: any) => ({
        method: row.method,
        total: parseFloat(row.total),
        count: parseInt(row.count)
      })),
      paymentTypes: typeResult.rows.map((row: any) => ({
        type: row.type,
        total: parseFloat(row.total),
        count: parseInt(row.count)
      })),
      recentPayments: recentResult.rows
    };
  }

  async getStudentPaymentHistory(establishmentId: string, studentId: string): Promise<StudentPaymentHistory | null> {
    const studentQuery = `
      SELECT s.name
      FROM students s
      WHERE s.id = $1 AND s.establishment_id = $2
    `;

    const studentResult = await this.db.query(studentQuery, [studentId, establishmentId]);
    if (studentResult.rows.length === 0) {
      return null;
    }

    const paymentsQuery = `
      SELECT
        p.*,
        u.first_name || ' ' || u.last_name as recorded_by_name
      FROM payments p
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.student_id = $1 AND p.establishment_id = $2
      ORDER BY p.payment_date DESC
    `;

    const packagesQuery = `
      SELECT sp.*
      FROM student_packages sp
      WHERE sp.student_id = $1 AND sp.establishment_id = $2
      ORDER BY sp.created_at DESC
    `;

    const summaryQuery = `
      SELECT
        COALESCE(SUM(amount), 0) as total_paid,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND NOT is_refunded THEN amount ELSE 0 END), 0) as outstanding_amount,
        MAX(payment_date) as last_payment_date
      FROM payments
      WHERE student_id = $1 AND establishment_id = $2
    `;

    const [paymentsResult, packagesResult, summaryResult] = await Promise.all([
      this.db.query(paymentsQuery, [studentId, establishmentId]),
      this.db.query(packagesQuery, [studentId, establishmentId]),
      this.db.query(summaryQuery, [studentId, establishmentId])
    ]);

    const summary = summaryResult.rows[0];
    const studentName = studentResult.rows[0].name;

    return {
      studentId,
      studentName,
      totalPaid: parseFloat(summary.total_paid),
      outstandingAmount: parseFloat(summary.outstanding_amount),
      lastPaymentDate: summary.last_payment_date,
      nextDueDate: undefined, // Calculate from packages if needed
      payments: paymentsResult.rows,
      packages: packagesResult.rows,
      monthlyPayments: [] // Can be implemented if needed
    };
  }

  // Get student payment summaries for list view
  async getStudentPaymentSummaries(
    establishmentId: string,
    filters?: { status?: 'current' | 'due' | 'overdue' }
  ): Promise<StudentPaymentSummary[]> {
    const query = `
      WITH payment_totals AS (
        SELECT
          student_id,
          SUM(amount) as total_paid,
          MAX(payment_date) as last_payment_date,
          MAX(amount) FILTER (WHERE payment_date = (SELECT MAX(payment_date) FROM payments WHERE student_id = p.student_id)) as last_payment_amount
        FROM payments p
        WHERE establishment_id = $1 AND is_refunded = false
        GROUP BY student_id
      )
      SELECT
        s.id as student_id,
        s.name as student_name,
        s.email as student_email,
        s.phone,
        s.is_active,
        COALESCE(sp.package_type::text, 'none') as package_type,
        sp.remaining_classes,
        sp.next_due_date,
        sp.price as package_price,
        COALESCE(pt.total_paid, 0) as total_paid,
        pt.last_payment_date,
        pt.last_payment_amount,
        CASE
          WHEN sp.next_due_date IS NULL THEN 'current'
          WHEN sp.next_due_date < CURRENT_DATE THEN 'overdue'
          WHEN sp.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due'
          ELSE 'current'
        END as payment_status,
        CASE
          WHEN sp.next_due_date < CURRENT_DATE AND sp.price IS NOT NULL
          THEN sp.price
          ELSE 0
        END as overdue_amount,
        CASE
          WHEN sp.next_due_date IS NOT NULL AND sp.next_due_date >= CURRENT_DATE
          THEN sp.price
          ELSE 0
        END as total_owed
      FROM students s
      LEFT JOIN student_packages sp ON s.id = sp.student_id AND sp.is_active = true
      LEFT JOIN payment_totals pt ON s.id = pt.student_id
      WHERE s.establishment_id = $1
      ${filters?.status ? `AND (
        CASE
          WHEN sp.next_due_date IS NULL THEN 'current'
          WHEN sp.next_due_date < CURRENT_DATE THEN 'overdue'
          WHEN sp.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due'
          ELSE 'current'
        END = $2
      )` : ''}
      ORDER BY
        CASE
          WHEN sp.next_due_date IS NOT NULL AND sp.next_due_date < CURRENT_DATE THEN 1
          WHEN sp.next_due_date IS NOT NULL AND sp.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
          ELSE 3
        END,
        s.name
    `;

    const params = filters?.status ? [establishmentId, filters.status] : [establishmentId];
    const result = await this.db.query(query, params);

    return result.rows.map((row: any) => ({
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      phone: row.phone,
      packageType: row.package_type,
      remainingClasses: row.remaining_classes,
      lastPaymentDate: row.last_payment_date,
      lastPaymentAmount: row.last_payment_amount ? parseFloat(row.last_payment_amount) : undefined,
      nextDueDate: row.next_due_date,
      paymentStatus: row.payment_status,
      totalPaid: parseFloat(row.total_paid) || 0,
      totalOwed: parseFloat(row.total_owed) || 0,
      overdueAmount: parseFloat(row.overdue_amount) || 0,
      packagePrice: row.package_price ? parseFloat(row.package_price) : undefined,
      isActive: row.is_active
    }));
  }
}