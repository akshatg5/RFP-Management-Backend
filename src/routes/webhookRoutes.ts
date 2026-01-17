// src/routes/webhookRoutes.ts
import { Router } from 'express';
import { handleInboundEmail } from '../controllers/inboundEmailController';

const router = Router();

// Resend inbound email webhook
router.post('/inbound-email', handleInboundEmail);

export default router;