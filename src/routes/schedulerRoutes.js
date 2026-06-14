const express = require('express');
const router = express.Router();
const scheduler = require('../controllers/schedulerController');
const reports = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

router.post('/generate', authenticate, requireAdmin, scheduler.triggerScheduleGeneration);
router.get('/status', authenticate, scheduler.getScheduleStatus);
router.get('/conflicts', authenticate, reports.getConflictReport);
router.get('/gaps', authenticate, reports.getGapReport);
router.get('/latest', authenticate, scheduler.getScheduleTimetable);
router.get('/download/timetable-pdf', authenticate, scheduler.downloadTimetablePdf);
router.get('/download/students-pdf', authenticate, scheduler.downloadStudentsPdf);
router.get('/', authenticate, scheduler.listSchedules);
router.get('/:id', authenticate, scheduler.getScheduleTimetable);
router.get('/:id/conflicts', authenticate, reports.getConflictReport);
router.get('/:id/gaps', authenticate, reports.getGapReport);

module.exports = router;
