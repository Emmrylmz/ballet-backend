-- Migration: Create Payment Plan and Discount Tables
-- Description: Extends payment system with plan management and discount features
-- Date: 2025-01-12

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment Plans Table
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plan_type VARCHAR(50) NOT NULL, -- 'monthly', 'per_class', 'package', 'custom'
  amount DECIMAL(10, 2) NOT NULL,
  recurrence_type VARCHAR(50), -- 'one_time', 'weekly', 'monthly', 'yearly'
  duration_months INTEGER,
  classes_included INTEGER, -- For package plans
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_plan_amount CHECK (amount >= 0)
);

-- Payment Plan Assignments (Individual Students)
CREATE TABLE IF NOT EXISTS payment_plan_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE,
  original_amount DECIMAL(10, 2) NOT NULL,
  final_amount DECIMAL(10, 2) NOT NULL,
  discount_id UUID, -- Will reference payment_discounts
  assignment_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, plan_id, start_date)
);

-- Payment Discounts Table
CREATE TABLE IF NOT EXISTS payment_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount'
  discount_value DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_discount_value CHECK (discount_value >= 0),
  CONSTRAINT check_percentage_value CHECK (
    discount_type != 'percentage' OR discount_value <= 100
  )
);

-- Add foreign key to payment_plan_assignments for discounts
ALTER TABLE payment_plan_assignments
ADD CONSTRAINT fk_discount FOREIGN KEY (discount_id)
REFERENCES payment_discounts(id) ON DELETE SET NULL;

-- Group Payment Plan Assignments (Cohort-level)
CREATE TABLE IF NOT EXISTS payment_plan_group_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cohort_id, plan_id, start_date)
);

-- Create indexes for performance
CREATE INDEX idx_payment_plans_establishment ON payment_plans(establishment_id);
CREATE INDEX idx_payment_plans_active ON payment_plans(is_active);
CREATE INDEX idx_payment_plans_type ON payment_plans(plan_type);

CREATE INDEX idx_plan_assignments_establishment ON payment_plan_assignments(establishment_id);
CREATE INDEX idx_plan_assignments_student ON payment_plan_assignments(student_id);
CREATE INDEX idx_plan_assignments_plan ON payment_plan_assignments(plan_id);
CREATE INDEX idx_plan_assignments_active ON payment_plan_assignments(is_active);

CREATE INDEX idx_discounts_establishment ON payment_discounts(establishment_id);
CREATE INDEX idx_discounts_active ON payment_discounts(is_active);

CREATE INDEX idx_group_assignments_establishment ON payment_plan_group_assignments(establishment_id);
CREATE INDEX idx_group_assignments_cohort ON payment_plan_group_assignments(cohort_id);
CREATE INDEX idx_group_assignments_plan ON payment_plan_group_assignments(plan_id);

-- Add comments to tables
COMMENT ON TABLE payment_plans IS 'Payment plan templates that can be assigned to students or cohorts';
COMMENT ON TABLE payment_plan_assignments IS 'Individual student assignments to payment plans with optional discounts';
COMMENT ON TABLE payment_discounts IS 'Discount definitions that can be applied to payment plans';
COMMENT ON TABLE payment_plan_group_assignments IS 'Cohort-level payment plan assignments';

-- Trigger to update timestamps
CREATE TRIGGER update_payment_plans_timestamp
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_plan_assignments_timestamp
  BEFORE UPDATE ON payment_plan_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_discounts_timestamp
  BEFORE UPDATE ON payment_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_group_assignments_timestamp
  BEFORE UPDATE ON payment_plan_group_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Enable Row Level Security for multi-tenancy
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_group_assignments ENABLE ROW LEVEL SECURITY;
