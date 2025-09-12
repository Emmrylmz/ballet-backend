# Attendance Module

The Attendance module provides comprehensive attendance tracking functionality for ballet school class sessions. It allows instructors to mark attendance, view session rosters, and generate attendance reports.

## Features

### Core Functionality
- **Session Roster Management**: Get detailed roster for class sessions with current enrollment and attendance status
- **Individual Attendance Marking**: Mark attendance for individual students (present, late, absent, excused)
- **Bulk Attendance Processing**: Mark attendance for multiple students simultaneously 
- **Attendance Updates**: Update existing attendance records with new status or notes
- **Comprehensive Reporting**: Generate attendance statistics and student history reports

### Security & Authorization
- **Instructor Authorization**: Ensures only authorized instructors can mark attendance for their sessions
- **Establishment Context**: All operations are scoped to the user's establishment
- **Session Validation**: Validates that students are enrolled before allowing attendance marking

## API Endpoints

### Session Management
```
GET    /api/v1/attendance/sessions/:sessionId/roster
GET    /api/v1/attendance/sessions/:sessionId/stats
GET    /api/v1/attendance/sessions/:sessionId
```

### Attendance Operations
```
POST   /api/v1/attendance/sessions/:sessionId/student/:studentId
PUT    /api/v1/attendance/sessions/:sessionId/bulk
PUT    /api/v1/attendance/:attendanceId
```

### Reporting & Analytics
```
GET    /api/v1/attendance/records
GET    /api/v1/attendance/students/:studentId/history
GET    /api/v1/attendance/trends
```

## Usage Examples

### Get Session Roster
```javascript
GET /api/v1/attendance/sessions/123e4567-e89b-12d3-a456-426614174000/roster
X-Establishment-ID: 987fcdeb-51a2-43d1-9f12-123456789abc
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "sessionDate": "2024-01-15",
    "startTime": "10:00:00",
    "endTime": "11:30:00",
    "sessionTitle": "Ballet Basics",
    "instructorName": "Jane Smith",
    "capacity": 15,
    "status": "scheduled",
    "enrollments": [
      {
        "enrollmentId": "...",
        "studentId": "...",
        "studentName": "Emma Johnson",
        "studentPhone": "555-0123",
        "hasAttendance": false,
        "medicalNotes": "No restrictions"
      }
    ],
    "attendanceStats": {
      "totalEnrolled": 12,
      "totalPresent": 0,
      "totalLate": 0,
      "totalAbsent": 0,
      "totalExcused": 0,
      "attendanceRate": 0
    }
  }
}
```

### Mark Individual Attendance
```javascript
POST /api/v1/attendance/sessions/123e4567-e89b-12d3-a456-426614174000/student/456e7890-e89b-12d3-a456-426614174000
X-Establishment-ID: 987fcdeb-51a2-43d1-9f12-123456789abc
Authorization: Bearer <token>

{
  "status": "present",
  "notes": "Participated well"
}

Response:
{
  "success": true,
  "data": {
    "id": "attendance-record-id",
    "establishmentId": "987fcdeb-51a2-43d1-9f12-123456789abc",
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "studentId": "456e7890-e89b-12d3-a456-426614174000",
    "status": "present",
    "notes": "Participated well",
    "markedAt": "2024-01-15T10:15:00Z",
    "markedBy": "instructor-user-id"
  },
  "message": "Attendance marked successfully"
}
```

### Bulk Mark Attendance
```javascript
PUT /api/v1/attendance/sessions/123e4567-e89b-12d3-a456-426614174000/bulk
X-Establishment-ID: 987fcdeb-51a2-43d1-9f12-123456789abc
Authorization: Bearer <token>

{
  "attendanceRecords": [
    {
      "studentId": "student-1-id",
      "status": "present"
    },
    {
      "studentId": "student-2-id", 
      "status": "late",
      "notes": "Arrived 10 minutes late"
    },
    {
      "studentId": "student-3-id",
      "status": "absent"
    }
  ]
}

Response:
{
  "success": true,
  "data": [
    // Array of attendance records created/updated
  ],
  "message": "Bulk attendance marked for 3 students"
}
```

## Database Schema

The attendance module interacts with several database tables:

### attendance_records
- Stores individual attendance records
- Links sessions, students, and attendance status
- Includes notes and timestamp information
- Unique constraint on (session_id, student_id)

### Related Tables
- **class_sessions**: Session information and scheduling
- **students**: Student profile information
- **session_enrollments**: Student enrollment in sessions
- **users**: Instructor information for authorization

## Architecture

### Repository Layer (`attendance.repository.ts`)
- Raw database queries and data access
- Complex joins for roster and reporting queries
- Bulk operations with transaction support
- Validation queries for authorization

### Service Layer (`attendance.service.ts`)  
- Business logic and validation
- Authorization checks for instructors
- Attendance analytics and calculations
- Error handling and logging

### Controller Layer (`attendance.controller.ts`)
- HTTP request/response handling
- Input validation and sanitization  
- Error response formatting
- Pagination support

### Factory Pattern (`attendance.factory.ts`)
- Dependency injection container
- Singleton pattern for service instances
- Route configuration and middleware setup

## Error Handling

The module includes comprehensive error handling:

- **SESSION_NOT_FOUND**: Session doesn't exist or not accessible
- **STUDENT_NOT_ENROLLED**: Student not enrolled in the session
- **UNAUTHORIZED_INSTRUCTOR**: Instructor not authorized for session
- **INVALID_ATTENDANCE_STATUS**: Invalid status provided
- **BULK_ATTENDANCE_FAILED**: Some records in bulk operation failed

## Integration

The attendance module integrates with:
- **Auth Module**: For user authentication and authorization
- **Classes Module**: For session information
- **Students Module**: For student data (when implemented)
- **Establishment Middleware**: For multi-tenant support

## Future Enhancements

- **Real-time Updates**: WebSocket support for live roster updates
- **Photo Attendance**: Image capture for attendance verification  
- **QR Code Check-in**: Student self-check-in functionality
- **Advanced Analytics**: Trend analysis and predictive insights
- **Integration with Payment**: Link attendance to billing cycles