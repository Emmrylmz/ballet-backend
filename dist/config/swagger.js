import swaggerJsdoc from 'swagger-jsdoc';
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Ballet Neli API Documentation',
            version: '1.0.0',
            description: 'API documentation for the Ballet Neli application',
        },
        servers: [
            {
                url: 'http://localhost:8000/api/v1',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token',
                },
            },
            schemas: {
                RegisterRequest: {
                    type: 'object',
                    required: [
                        'email',
                        'password',
                        'firstName',
                        'lastName',
                        'role',
                        'establishmentId'
                    ],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address'
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\|,.<>\\/?]).*$',
                            description: 'Password with at least 8 characters, including uppercase, lowercase, number, and special character'
                        },
                        firstName: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 50,
                            description: 'User first name'
                        },
                        lastName: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 50,
                            description: 'User last name'
                        },
                        phone: {
                            type: 'string',
                            pattern: '^[\\+]?[1-9][\\d]{0,15}$',
                            description: 'Phone number (optional)'
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'instructor', 'student', 'parent'],
                            description: 'User role'
                        },
                        establishmentId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Establishment UUID'
                        },
                        invitedBy: {
                            type: 'string',
                            format: 'uuid',
                            description: 'UUID of user who sent invitation (optional)'
                        }
                    },
                    example: {
                        email: 'user@example.com',
                        password: 'SecurePass123!',
                        firstName: 'John',
                        lastName: 'Doe',
                        phone: '+1234567890',
                        role: 'student',
                        establishmentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: [
                        'email',
                        'password'
                    ],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address'
                        },
                        password: {
                            type: 'string',
                            description: 'User password'
                        },
                        establishmentId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Establishment UUID (optional for super_admin)'
                        },
                        rememberMe: {
                            type: 'boolean',
                            default: false,
                            description: 'Remember user session'
                        }
                    },
                    example: {
                        email: 'user@example.com',
                        password: 'SecurePass123!',
                        establishmentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        rememberMe: true
                    }
                },
                ActivateAccountRequest: {
                    type: 'object',
                    required: ['token'],
                    properties: {
                        token: {
                            type: 'string',
                            description: 'Activation token from email'
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\|,.<>\\/?]).*$',
                            description: 'New password (optional if not set during registration)'
                        }
                    },
                    example: {
                        token: 'activation-token-from-email',
                        password: 'NewSecurePass123!'
                    }
                },
                ForgotPasswordRequest: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address'
                        },
                        establishmentId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Establishment UUID (optional)'
                        }
                    },
                    example: {
                        email: 'user@example.com',
                        establishmentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
                    }
                },
                ResetPasswordRequest: {
                    type: 'object',
                    required: ['token', 'newPassword'],
                    properties: {
                        token: {
                            type: 'string',
                            description: 'Password reset token from email'
                        },
                        newPassword: {
                            type: 'string',
                            minLength: 8,
                            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\|,.<>\\/?]).*$',
                            description: 'New secure password'
                        }
                    },
                    example: {
                        token: 'reset-token-from-email',
                        newPassword: 'NewSecurePass123!'
                    }
                },
                ChangePasswordRequest: {
                    type: 'object',
                    required: ['currentPassword', 'newPassword'],
                    properties: {
                        currentPassword: {
                            type: 'string',
                            description: 'Current password'
                        },
                        newPassword: {
                            type: 'string',
                            minLength: 8,
                            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\|,.<>\\/?]).*$',
                            description: 'New secure password'
                        }
                    },
                    example: {
                        currentPassword: 'CurrentPass123!',
                        newPassword: 'NewSecurePass123!'
                    }
                },
                RefreshTokenRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: {
                        refreshToken: {
                            type: 'string',
                            description: 'Valid refresh token'
                        }
                    },
                    example: {
                        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                },
                LogoutRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: {
                        refreshToken: {
                            type: 'string',
                            description: 'Refresh token to revoke'
                        }
                    },
                    example: {
                        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                },
                PasswordStrengthRequest: {
                    type: 'object',
                    required: ['password'],
                    properties: {
                        password: {
                            type: 'string',
                            description: 'Password to check strength'
                        }
                    },
                    example: {
                        password: 'TestPassword123!'
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'object',
                            properties: {
                                user: {
                                    $ref: '#/components/schemas/AuthUser'
                                },
                                tokens: {
                                    type: 'object',
                                    properties: {
                                        accessToken: {
                                            type: 'string',
                                            description: 'JWT access token'
                                        },
                                        refreshToken: {
                                            type: 'string',
                                            description: 'JWT refresh token'
                                        }
                                    }
                                },
                                expiresIn: {
                                    type: 'number',
                                    description: 'Token expiry time in seconds'
                                },
                                establishmentInfo: {
                                    type: 'object',
                                    properties: {
                                        id: {
                                            type: 'string',
                                            format: 'uuid'
                                        },
                                        name: {
                                            type: 'string'
                                        },
                                        businessName: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        },
                        message: {
                            type: 'string',
                            example: 'Login successful'
                        }
                    }
                },
                AuthUser: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        establishmentId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        email: {
                            type: 'string',
                            format: 'email'
                        },
                        firstName: {
                            type: 'string'
                        },
                        lastName: {
                            type: 'string'
                        },
                        role: {
                            type: 'string',
                            enum: ['super_admin', 'admin', 'instructor', 'student', 'parent']
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'inactive', 'pending', 'suspended']
                        },
                        emailVerified: {
                            type: 'boolean'
                        },
                        lastLogin: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        permissions: {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean'
                        },
                        data: {
                            type: 'object'
                        },
                        message: {
                            type: 'string'
                        }
                    }
                },
                AuthError: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Authentication failed'
                        },
                        code: {
                            type: 'string',
                            example: 'INVALID_CREDENTIALS'
                        },
                        details: {
                            type: 'object'
                        }
                    }
                },
                PasswordStrengthResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'object',
                            properties: {
                                strength: {
                                    type: 'string',
                                    enum: ['very_weak', 'weak', 'fair', 'good', 'strong'],
                                    example: 'strong'
                                },
                                score: {
                                    type: 'number',
                                    example: 5
                                },
                                maxScore: {
                                    type: 'number',
                                    example: 5
                                },
                                isValid: {
                                    type: 'boolean',
                                    example: true
                                },
                                feedback: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    },
                                    example: []
                                }
                            }
                        }
                    }
                },
                CreateStudent: {
                    type: 'object',
                    required: [
                        'name',
                        'phone_number',
                        'emergency_contact',
                    ],
                    properties: {
                        name: {
                            type: 'string',
                        },
                        student_email: {
                            type: 'string',
                            format: 'email',
                        },
                        phone_number: {
                            type: 'string',
                        },
                        emergency_contact: {
                            type: 'string',
                        },
                        emergency_contact_name: {
                            type: 'string',
                        },
                        parent_name: {
                            type: 'string',
                        },
                        parent_phone: {
                            type: 'string',
                        },
                        birth_date: {
                            type: 'string',
                            format: 'date',
                        },
                        medical_notes: {
                            type: 'string',
                        },
                    },
                    example: {
                        name: 'John Doe',
                        student_email: 'john.doe@example.com',
                        phone_number: '123-456-7890',
                        emergency_contact: '987-654-3210',
                        emergency_contact_name: 'Jane Doe',
                        parent_name: 'Richard Doe',
                        parent_phone: '111-222-3333',
                        birth_date: '2000-01-01',
                        medical_notes: 'Allergic to peanuts',
                    },
                },
                UpdateStudent: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string'
                        },
                        student_email: {
                            type: 'string',
                            format: 'email',
                        },
                        phone_number: {
                            type: 'string',
                        },
                        emergency_contact: {
                            type: 'string',
                        },
                        emergency_contact_name: {
                            type: 'string',
                        },
                        parent_name: {
                            type: 'string',
                        },
                        parent_phone: {
                            type: 'string',
                        },
                        birth_date: {
                            type: 'string',
                            format: 'date',
                        },
                        medical_notes: {
                            type: 'string',
                        },
                        is_active: {
                            type: 'boolean',
                        },
                    },
                    example: {
                        name: 'Jane Doe',
                        student_email: 'jane.doe@example.com',
                        phone_number: '999-888-7777',
                        is_active: true,
                    },
                },
                CreateInstructor: {
                    type: 'object',
                    required: [
                        'name',
                        'email',
                    ],
                    properties: {
                        name: {
                            type: 'string',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                        },
                        phone: {
                            type: 'string',
                        },
                        specialization: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                    example: {
                        name: 'Jane Doe',
                        email: 'jane.doe@example.com',
                        phone: '987-654-3210',
                        specialization: ['Ballet', 'Contemporary'],
                    },
                },
                UpdateInstructor: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                        },
                        phone: {
                            type: 'string',
                        },
                        specialization: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                        is_active: {
                            type: 'boolean',
                        },
                    },
                    example: {
                        name: 'Jane Smith',
                        email: 'jane.smith@example.com',
                        phone: '111-222-3333',
                        specialization: ['Jazz'],
                        is_active: true,
                    },
                },
                CreateClassTemplate: {
                    type: 'object',
                    required: [
                        'title',
                        'class_type',
                        'skill_level',
                        'capacity',
                        'duration_minutes',
                        'price',
                    ],
                    properties: {
                        title: {
                            type: 'string',
                        },
                        class_type: {
                            type: 'string',
                            enum: ['ballet', 'pilates'],
                        },
                        skill_level: {
                            type: 'string',
                            enum: ['kids', 'beginner', 'intermediate', 'advanced'],
                        },
                        instructor_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        capacity: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 1,
                        },
                        duration_minutes: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 1,
                        },
                        price: {
                            type: 'number',
                            format: 'float',
                            minimum: 0,
                        },
                        description: {
                            type: 'string',
                        },
                    },
                    example: {
                        title: 'Beginner Ballet',
                        class_type: 'ballet',
                        skill_level: 'beginner',
                        instructor_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        capacity: 15,
                        duration_minutes: 60,
                        price: 25.00,
                        description: 'A foundational ballet class.',
                    },
                },
                UpdateClassTemplate: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                        },
                        class_type: {
                            type: 'string',
                            enum: ['ballet', 'pilates'],
                        },
                        skill_level: {
                            type: 'string',
                            enum: ['kids', 'beginner', 'intermediate', 'advanced'],
                        },
                        instructor_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        capacity: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 1,
                        },
                        duration_minutes: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 1,
                        },
                        price: {
                            type: 'number',
                            format: 'float',
                            minimum: 0,
                        },
                        description: {
                            type: 'string',
                        },
                        is_active: {
                            type: 'boolean',
                        },
                    },
                    example: {
                        title: 'Intermediate Pilates',
                        class_type: 'pilates',
                        skill_level: 'intermediate',
                        capacity: 10,
                        duration_minutes: 45,
                        price: 30.00,
                        is_active: true,
                    },
                },
                CreateClassSession: {
                    type: 'object',
                    required: [
                        'class_template_id',
                        'session_date',
                        'start_time',
                        'end_time',
                        'capacity',
                    ],
                    properties: {
                        class_template_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        instructor_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        session_date: {
                            type: 'string',
                            format: 'date',
                        },
                        start_time: {
                            type: 'string',
                        },
                        end_time: {
                            type: 'string',
                        },
                        capacity: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 1,
                        },
                        notes: {
                            type: 'string',
                        },
                        is_recurring: {
                            type: 'boolean',
                        },
                        recurrence_frequency: {
                            type: 'string',
                            enum: ['weekly', 'monthly'],
                        },
                        recurrence_days_of_week: {
                            type: 'array',
                            items: {
                                type: 'integer',
                                format: 'int32',
                                minimum: 0,
                                maximum: 6,
                            },
                        },
                        recurrence_end_date: {
                            type: 'string',
                            format: 'date',
                        },
                        parent_session_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                    example: {
                        class_template_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        instructor_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        session_date: '2024-09-15',
                        start_time: '09:00',
                        end_time: '10:00',
                        capacity: 20,
                        notes: 'Focus on pirouettes',
                    },
                },
                UpdateClassSession: {
                    type: 'object',
                    properties: {
                        class_template_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        instructor_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        session_date: {
                            type: 'string',
                            format: 'date',
                        },
                        start_time: {
                            type: 'string',
                        },
                        end_time: {
                            type: 'string',
                        },
                        capacity: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 1,
                        },
                        status: {
                            type: 'string',
                            enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
                        },
                        notes: {
                            type: 'string',
                        },
                        is_recurring: {
                            type: 'boolean',
                        },
                        recurrence_frequency: {
                            type: 'string',
                            enum: ['weekly', 'monthly'],
                        },
                        recurrence_days_of_week: {
                            type: 'array',
                            items: {
                                type: 'integer',
                                format: 'int32',
                                minimum: 0,
                                maximum: 6,
                            },
                        },
                        recurrence_end_date: {
                            type: 'string',
                            format: 'date',
                        },
                        parent_session_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                    example: {
                        session_date: '2024-09-16',
                        start_time: '10:00',
                        status: 'completed',
                    },
                },
                CreateAttendanceRecord: {
                    type: 'object',
                    required: [
                        'session_id',
                        'student_id',
                        'status',
                    ],
                    properties: {
                        session_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        student_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        status: {
                            type: 'string',
                            enum: ['present', 'late', 'absent', 'excused'],
                        },
                        notes: {
                            type: 'string',
                        },
                        marked_by: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                    example: {
                        session_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        student_id: 'fedcba98-7654-3210-fedc-ba9876543210',
                        status: 'present',
                        notes: 'Arrived on time.',
                    },
                },
                UpdateAttendanceRecord: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['present', 'late', 'absent', 'excused'],
                        },
                        notes: {
                            type: 'string',
                        },
                    },
                    example: {
                        status: 'late',
                        notes: 'Arrived 15 minutes late.',
                    },
                },
                CreatePayment: {
                    type: 'object',
                    required: [
                        'amount',
                        'paymentMethod',
                        'paymentType',
                        'paymentDate',
                    ],
                    properties: {
                        studentId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Student ID (optional for establishment-wide payments)'
                        },
                        studentPackageId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Student package ID if payment is for a specific package'
                        },
                        amount: {
                            type: 'number',
                            format: 'float',
                            minimum: 0.01,
                            description: 'Payment amount'
                        },
                        paymentMethod: {
                            type: 'string',
                            enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online'],
                            description: 'Method of payment'
                        },
                        paymentType: {
                            type: 'string',
                            enum: ['class_package', 'monthly_fee', 'registration', 'late_fee', 'refund', 'other'],
                            description: 'Type/purpose of payment'
                        },
                        paymentDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Date when payment was made'
                        },
                        dueDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Payment due date (optional)'
                        },
                        description: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Additional payment description'
                        },
                        transactionId: {
                            type: 'string',
                            maxLength: 100,
                            description: 'External transaction ID for reference'
                        }
                    },
                    example: {
                        studentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        amount: 150.00,
                        paymentMethod: 'credit_card',
                        paymentType: 'monthly_fee',
                        paymentDate: '2024-09-25',
                        description: 'Monthly payment for October classes'
                    },
                },
                UpdatePayment: {
                    type: 'object',
                    properties: {
                        amount: {
                            type: 'number',
                            format: 'float',
                            minimum: 0.01,
                            description: 'Updated payment amount'
                        },
                        paymentMethod: {
                            type: 'string',
                            enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online'],
                            description: 'Updated payment method'
                        },
                        paymentType: {
                            type: 'string',
                            enum: ['class_package', 'monthly_fee', 'registration', 'late_fee', 'refund', 'other'],
                            description: 'Updated payment type'
                        },
                        paymentDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Updated payment date'
                        },
                        dueDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Updated payment due date'
                        },
                        description: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Updated payment description'
                        },
                        transactionId: {
                            type: 'string',
                            maxLength: 100,
                            description: 'Updated transaction ID'
                        }
                    },
                    example: {
                        amount: 175.00,
                        paymentMethod: 'bank_transfer',
                        description: 'Updated monthly payment for October',
                    },
                },
                CreateStudentPackage: {
                    type: 'object',
                    required: [
                        'student_id',
                        'package_type',
                        'start_date',
                        'price',
                    ],
                    properties: {
                        student_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        package_type: {
                            type: 'string',
                            enum: ['monthly', '8-class', 'drop-in'],
                        },
                        remaining_classes: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 0,
                        },
                        start_date: {
                            type: 'string',
                            format: 'date',
                        },
                        end_date: {
                            type: 'string',
                            format: 'date',
                        },
                        last_payment_date: {
                            type: 'string',
                            format: 'date',
                        },
                        next_due_date: {
                            type: 'string',
                            format: 'date',
                        },
                        price: {
                            type: 'number',
                            format: 'float',
                            minimum: 0,
                        },
                    },
                    example: {
                        student_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        package_type: 'monthly',
                        remaining_classes: 8,
                        start_date: '2024-09-01',
                        end_date: '2024-09-30',
                        price: 150.00,
                    },
                },
                UpdateStudentPackage: {
                    type: 'object',
                    properties: {
                        package_type: {
                            type: 'string',
                            enum: ['monthly', '8-class', 'drop-in'],
                        },
                        remaining_classes: {
                            type: 'integer',
                            format: 'int32',
                            minimum: 0,
                        },
                        start_date: {
                            type: 'string',
                            format: 'date',
                        },
                        end_date: {
                            type: 'string',
                            format: 'date',
                        },
                        payment_status: {
                            type: 'string',
                            enum: ['current', 'due', 'overdue'],
                        },
                        last_payment_date: {
                            type: 'string',
                            format: 'date',
                        },
                        next_due_date: {
                            type: 'string',
                            format: 'date',
                        },
                        price: {
                            type: 'number',
                            format: 'float',
                            minimum: 0,
                        },
                        is_active: {
                            type: 'boolean',
                        },
                    },
                    example: {
                        package_type: '8-class',
                        remaining_classes: 5,
                        is_active: true,
                    },
                },
                CreateCohortInvitationRequest: {
                    type: 'object',
                    required: ['cohortId'],
                    properties: {
                        cohortId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the cohort to enroll students in'
                        },
                        message: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Welcome message for students'
                        },
                        expiryHours: {
                            type: 'number',
                            minimum: 0.1,
                            maximum: 24,
                            description: 'Hours until invitation expires (max 24)'
                        },
                        usageLimit: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 50,
                            description: 'Maximum number of students who can use this link'
                        }
                    },
                    example: {
                        cohortId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        message: 'Join our Tuesday Ballet Ages 10-12 class!',
                        expiryHours: 24,
                        usageLimit: 10
                    }
                },
                CreateStudentInvitationRequest: {
                    type: 'object',
                    properties: {
                        sessionId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Specific class session to enroll student in'
                        },
                        cohortId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Specific cohort to enroll student in (cannot be used with sessionId)'
                        },
                        message: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Welcome message for students'
                        },
                        expiryHours: {
                            type: 'number',
                            minimum: 0.1,
                            maximum: 24,
                            description: 'Hours until invitation expires (max 24)'
                        },
                        usageLimit: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 50,
                            description: 'Maximum number of students who can use this link'
                        }
                    },
                    example: {
                        cohortId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        message: 'Join our amazing dance class!',
                        expiryHours: 12,
                        usageLimit: 15
                    }
                },
                InvitationResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    format: 'uuid'
                                },
                                invitationUrl: {
                                    type: 'string',
                                    example: 'http://localhost:3000/invite/abc123def456'
                                },
                                cohortId: {
                                    type: 'string',
                                    format: 'uuid'
                                },
                                cohortName: {
                                    type: 'string',
                                    example: 'Tuesday Ballet Ages 10-12'
                                },
                                sessionId: {
                                    type: 'string',
                                    format: 'uuid'
                                },
                                sessionName: {
                                    type: 'string',
                                    example: 'Ballet Beginner Class'
                                },
                                type: {
                                    type: 'string',
                                    enum: ['instructor', 'student']
                                },
                                usageLimit: {
                                    type: 'integer',
                                    example: 10
                                },
                                usageCount: {
                                    type: 'integer',
                                    example: 0
                                },
                                expiresAt: {
                                    type: 'string',
                                    format: 'date-time'
                                },
                                createdAt: {
                                    type: 'string',
                                    format: 'date-time'
                                },
                                message: {
                                    type: 'string',
                                    example: 'Welcome to our dance studio!'
                                }
                            }
                        },
                        message: {
                            type: 'string',
                            example: 'Invitation created successfully'
                        }
                    }
                },
                InvitationValidationResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'object',
                            properties: {
                                establishmentName: {
                                    type: 'string',
                                    example: 'Ballet Neli Studio'
                                },
                                sessionName: {
                                    type: 'string',
                                    example: 'Ballet Beginner Class'
                                },
                                cohortName: {
                                    type: 'string',
                                    example: 'Tuesday Ballet Ages 10-12'
                                },
                                type: {
                                    type: 'string',
                                    enum: ['instructor', 'student']
                                },
                                message: {
                                    type: 'string',
                                    example: 'Welcome message'
                                },
                                expiresAt: {
                                    type: 'string',
                                    format: 'date-time'
                                },
                                usageLimit: {
                                    type: 'integer',
                                    example: 10
                                },
                                usageCount: {
                                    type: 'integer',
                                    example: 3
                                },
                                warningMessage: {
                                    type: 'string',
                                    example: 'You are already a member of this establishment'
                                },
                                cohortId: {
                                    type: 'string',
                                    format: 'uuid'
                                },
                                invitationType: {
                                    type: 'string',
                                    example: 'cohort'
                                },
                                enrollmentNote: {
                                    type: 'string',
                                    example: 'You will be automatically enrolled in this cohort and all its future sessions'
                                }
                            }
                        },
                        message: {
                            type: 'string',
                            example: 'Valid invitation'
                        }
                    }
                },
                CreatePaymentPlan: {
                    type: 'object',
                    required: [
                        'name',
                        'amount',
                        'planType',
                        'recurrenceType'
                    ],
                    properties: {
                        name: {
                            type: 'string',
                            maxLength: 100,
                            description: 'Name of the payment plan'
                        },
                        description: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Description of the payment plan'
                        },
                        amount: {
                            type: 'number',
                            format: 'float',
                            minimum: 0.01,
                            description: 'Amount for each payment'
                        },
                        planType: {
                            type: 'string',
                            enum: ['individual', 'cohort', 'establishment'],
                            description: 'Type of payment plan assignment'
                        },
                        recurrenceType: {
                            type: 'string',
                            enum: ['one_time', 'weekly', 'monthly', 'yearly'],
                            description: 'How often payments are generated'
                        }
                    },
                    example: {
                        name: 'Monthly Ballet Fees',
                        description: 'Monthly tuition for ballet classes',
                        amount: 150.00,
                        planType: 'cohort',
                        recurrenceType: 'monthly'
                    }
                },
                CreateAssignment: {
                    type: 'object',
                    required: [
                        'paymentPlanId',
                        'targetType',
                        'startDate'
                    ],
                    properties: {
                        paymentPlanId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the payment plan to assign'
                        },
                        targetType: {
                            type: 'string',
                            enum: ['student', 'cohort', 'establishment'],
                            description: 'Type of target to assign to'
                        },
                        targetId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the target (required for student/cohort, null for establishment)'
                        },
                        startDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Start date for the assignment'
                        },
                        endDate: {
                            type: 'string',
                            format: 'date',
                            description: 'End date for the assignment (optional)'
                        }
                    },
                    example: {
                        paymentPlanId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        targetType: 'cohort',
                        targetId: 'b2c3d4e5-f6a7-8901-2345-678901bcdef2',
                        startDate: '2024-10-01'
                    }
                },
                BulkPaymentRequest: {
                    type: 'object',
                    required: [
                        'paymentPlanId',
                        'targetIds',
                        'paymentDate',
                        'paymentMethod'
                    ],
                    properties: {
                        paymentPlanId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Payment plan to use for bulk processing'
                        },
                        targetIds: {
                            type: 'array',
                            items: {
                                type: 'string',
                                format: 'uuid'
                            },
                            description: 'Array of student IDs or cohort IDs to process'
                        },
                        paymentDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Date for all payments'
                        },
                        paymentMethod: {
                            type: 'string',
                            enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online'],
                            description: 'Payment method for all payments'
                        },
                        notes: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Additional notes for bulk payment'
                        }
                    },
                    example: {
                        paymentPlanId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        targetIds: ['student1-uuid', 'student2-uuid', 'student3-uuid'],
                        paymentDate: '2024-10-01',
                        paymentMethod: 'bank_transfer',
                        notes: 'Monthly payments for October'
                    }
                },
                RefundPaymentRequest: {
                    type: 'object',
                    required: [
                        'refundAmount',
                        'refundDate'
                    ],
                    properties: {
                        refundAmount: {
                            type: 'number',
                            format: 'float',
                            minimum: 0.01,
                            description: 'Amount to refund (must not exceed original payment)'
                        },
                        refundDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Date when refund was processed'
                        },
                        reason: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Reason for the refund'
                        }
                    },
                    example: {
                        refundAmount: 50.00,
                        refundDate: '2024-09-25',
                        reason: 'Student cancelled after first class'
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        establishmentId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        studentId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        studentName: {
                            type: 'string',
                            description: 'Student name (populated from join)'
                        },
                        studentPackageId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        amount: {
                            type: 'number',
                            format: 'float'
                        },
                        paymentMethod: {
                            type: 'string',
                            enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online']
                        },
                        paymentType: {
                            type: 'string',
                            enum: ['class_package', 'monthly_fee', 'registration', 'late_fee', 'refund', 'other']
                        },
                        paymentDate: {
                            type: 'string',
                            format: 'date'
                        },
                        dueDate: {
                            type: 'string',
                            format: 'date'
                        },
                        description: {
                            type: 'string'
                        },
                        recordedBy: {
                            type: 'string',
                            format: 'uuid'
                        },
                        recordedByName: {
                            type: 'string',
                            description: 'Name of user who recorded payment'
                        },
                        transactionId: {
                            type: 'string'
                        },
                        isRefunded: {
                            type: 'boolean'
                        },
                        refundAmount: {
                            type: 'number',
                            format: 'float'
                        },
                        refundDate: {
                            type: 'string',
                            format: 'date'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                PaymentPlan: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        establishmentId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        name: {
                            type: 'string'
                        },
                        description: {
                            type: 'string'
                        },
                        amount: {
                            type: 'number',
                            format: 'float'
                        },
                        planType: {
                            type: 'string',
                            enum: ['individual', 'cohort', 'establishment']
                        },
                        recurrenceType: {
                            type: 'string',
                            enum: ['one_time', 'weekly', 'monthly', 'yearly']
                        },
                        createdBy: {
                            type: 'string',
                            format: 'uuid'
                        },
                        createdByName: {
                            type: 'string',
                            description: 'Name of user who created the plan'
                        },
                        isActive: {
                            type: 'boolean'
                        },
                        totalAssignments: {
                            type: 'integer',
                            description: 'Total number of assignments'
                        },
                        activeAssignments: {
                            type: 'integer',
                            description: 'Number of active assignments'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                PaymentSummary: {
                    type: 'object',
                    properties: {
                        establishmentId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        totalRevenue: {
                            type: 'number',
                            format: 'float',
                            description: 'Total revenue for the period'
                        },
                        totalPayments: {
                            type: 'integer',
                            description: 'Number of payments made'
                        },
                        pendingAmount: {
                            type: 'number',
                            format: 'float',
                            description: 'Amount of pending payments'
                        },
                        refundedAmount: {
                            type: 'number',
                            format: 'float',
                            description: 'Total amount refunded'
                        },
                        paymentMethods: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    method: {
                                        type: 'string'
                                    },
                                    total: {
                                        type: 'number',
                                        format: 'float'
                                    },
                                    count: {
                                        type: 'integer'
                                    }
                                }
                            }
                        },
                        paymentTypes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: {
                                        type: 'string'
                                    },
                                    total: {
                                        type: 'number',
                                        format: 'float'
                                    },
                                    count: {
                                        type: 'integer'
                                    }
                                }
                            }
                        },
                        recentPayments: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Payment'
                            }
                        }
                    }
                },
                PaymentResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean'
                        },
                        data: {
                            type: 'object'
                        },
                        message: {
                            type: 'string'
                        },
                        error: {
                            type: 'object',
                            properties: {
                                code: {
                                    type: 'string'
                                },
                                message: {
                                    type: 'string'
                                },
                                details: {
                                    type: 'object'
                                }
                            }
                        }
                    }
                },
                PaginatedPaymentResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean'
                        },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object'
                            }
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                total: {
                                    type: 'integer'
                                },
                                page: {
                                    type: 'integer'
                                },
                                limit: {
                                    type: 'integer'
                                },
                                totalPages: {
                                    type: 'integer'
                                }
                            }
                        },
                        message: {
                            type: 'string'
                        },
                        error: {
                            type: 'object',
                            properties: {
                                code: {
                                    type: 'string'
                                },
                                message: {
                                    type: 'string'
                                },
                                details: {
                                    type: 'object'
                                }
                            }
                        }
                    }
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
            {
                cookieAuth: [],
            },
        ],
    },
    apis: ['./src/features/**/*.routes.ts', './src/features/**/*.model.ts'],
};
const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
