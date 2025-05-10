import express from 'express';
import {
  getAllNotifications,
  getUnreadNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications
} from '../controllers/notificationController.js';
import adminAuth from '../middleware/Auth.js';

const router = express.Router();

// All notification routes are protected
router.use(adminAuth);

router.get('/', getAllNotifications);
router.get('/unread', getUnreadNotifications);
router.get('/:id', getNotification);
router.post('/', createNotification);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/read', deleteReadNotifications);

export default router;