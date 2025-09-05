import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './features/auth/auth.routes';
import studentRoutes from './features/students/students.routes';
import instructorRoutes from './features/instructors/instructors.routes';
import classTemplateRoutes from './features/class-templates/class-templates.routes';
import classSessionRoutes from './features/class-sessions/class-sessions.routes';
import attendanceRoutes from './features/attendance/attendance.routes';
import paymentRoutes from './features/payments/payments.routes';
import dashboardRoutes from './features/dashboard/dashboard.routes';
import reportRoutes from './features/reports/reports.routes';
import settingRoutes from './features/settings/settings.routes';
const app = express();
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://192.168.121.139:3000',
            'http://localhost:3001',
            'https://your-frontend-domain.com',
        ];
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
    ],
    maxAge: 86400,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/instructors', instructorRoutes);
app.use('/api/v1/class-templates', classTemplateRoutes);
app.use('/api/v1/sessions', classSessionRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use(errorHandler);
export default app;
const multiOriginCorsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://your-admin-panel.com',
        'https://your-mobile-app.com',
        /\.your-domain\.com$/,
    ],
    credentials: true,
    optionsSuccessStatus: 200,
};
