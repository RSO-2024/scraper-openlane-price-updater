import { Router } from 'express';
import Jabber from 'jabber';

const router = Router();
const jabber = new Jabber();
/**
 * @swagger
 * /example:
 *   get:
 *     summary: Example API
 *     responses:
 *       200:
 *         description: Returns an example response
 */
router.get('/example', (req, res) => {
    
  res.json({ message: jabber.createParagraph(30) });
});

export default router;
