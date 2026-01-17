// src/routes/emailRoutes.ts
import { Router } from 'express';
import { getUnprocessedEmails, reparseInboundEmail } from '../controllers/emailController';

const router = Router();

router.get('/inbound/unprocessed', getUnprocessedEmails);
router.post('/inbound/:id/reparse', reparseInboundEmail);

export default router;
