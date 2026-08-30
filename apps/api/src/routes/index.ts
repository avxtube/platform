import { Router } from 'express';
import { isConnected } from '@workspace/db/mongoose';
import pkg from '../../package.json' with { type: 'json' };

import usersRoutes from './users.routes';
import settingsRoutes from './settings.routes';

const router: Router = Router();

router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: pkg.name,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: isConnected() ? 'Connected' : 'Disconnected'
    });
});
// 404 handler - handle all unmatched routes
router.use((req, res, next) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: ['/v1/health', '/v1/settings', '/v1/users']
    });
});

export default router;
