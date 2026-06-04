const express = require('express');
const router = express.Router();
const crud = require('../controllers/crudControllers');
const { importStudents } = require('../controllers/ingestionController');
const reports = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const multer = require('multer');

// Configure multer for file uploads in-memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// --- Ingestion (Admin only) ---
router.post('/students/upload', authenticate, requireAdmin, upload.single('file'), importStudents);

// --- Custom Queries ---
router.get('/courses/:id/students', authenticate, reports.getCourseStudents);
router.get('/students/:id/schedule', authenticate, reports.getStudentSchedule);

// --- Departments ---
router.get('/departments', authenticate, crud.getDepartments);
router.get('/departments/:id', authenticate, crud.getDepartmentById);
router.post('/departments', authenticate, requireAdmin, crud.createDepartment);
router.put('/departments/:id', authenticate, requireAdmin, crud.updateDepartment);
router.patch('/departments/:id', authenticate, requireAdmin, crud.updateDepartment);
router.delete('/departments/:id', authenticate, requireAdmin, crud.deleteDepartment);

// --- Courses ---
router.get('/courses', authenticate, crud.getCourses);
router.get('/courses/:id', authenticate, crud.getCourseById);
router.post('/courses', authenticate, requireAdmin, crud.createCourse);
router.put('/courses/:id', authenticate, requireAdmin, crud.updateCourse);
router.patch('/courses/:id', authenticate, requireAdmin, crud.updateCourse);
router.delete('/courses/:id', authenticate, requireAdmin, crud.deleteCourse);

// --- Teachers ---
router.get('/teachers', authenticate, crud.getTeachers);
router.get('/teachers/:id', authenticate, crud.getTeacherById);
router.post('/teachers', authenticate, requireAdmin, crud.createTeacher);
router.put('/teachers/:id', authenticate, requireAdmin, crud.updateTeacher);
router.patch('/teachers/:id', authenticate, requireAdmin, crud.updateTeacher);
router.delete('/teachers/:id', authenticate, requireAdmin, crud.deleteTeacher);

// --- Venues ---
router.get('/venues', authenticate, crud.getVenues);
router.get('/venues/:id', authenticate, crud.getVenueById);
router.post('/venues', authenticate, requireAdmin, crud.createVenue);
router.put('/venues/:id', authenticate, requireAdmin, crud.updateVenue);
router.patch('/venues/:id', authenticate, requireAdmin, crud.updateVenue);
router.delete('/venues/:id', authenticate, requireAdmin, crud.deleteVenue);

// --- Students ---
router.get('/students', authenticate, crud.getStudents);
router.get('/students/:id', authenticate, crud.getStudentById);
router.post('/students', authenticate, requireAdmin, crud.createStudent);
router.put('/students/:id', authenticate, requireAdmin, crud.updateStudent);
router.patch('/students/:id', authenticate, requireAdmin, crud.updateStudent);
router.delete('/students/:id', authenticate, requireAdmin, crud.deleteStudent);

// --- Sections ---
router.get('/sections', authenticate, crud.getSections);
router.get('/sections/:id', authenticate, crud.getSectionById);
router.post('/sections', authenticate, requireAdmin, crud.createSection);
router.put('/sections/:id', authenticate, requireAdmin, crud.updateSection);
router.patch('/sections/:id', authenticate, requireAdmin, crud.updateSection);
router.delete('/sections/:id', authenticate, requireAdmin, crud.deleteSection);

// --- Enrollments ---
router.get('/enrollments', authenticate, crud.getEnrollments);
router.get('/enrollments/:id', authenticate, crud.getEnrollmentById);
router.post('/enrollments', authenticate, requireAdmin, crud.createEnrollment);
router.put('/enrollments/:id', authenticate, requireAdmin, crud.updateEnrollment);
router.patch('/enrollments/:id', authenticate, requireAdmin, crud.updateEnrollment);
router.delete('/enrollments/:id', authenticate, requireAdmin, crud.deleteEnrollment);

module.exports = router;
