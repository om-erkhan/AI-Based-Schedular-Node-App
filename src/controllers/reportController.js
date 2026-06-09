const prisma = require('../config/db');

// --- 1. CONFLICT REPORT ---
async function getConflictReport(req, res) {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const schedule = await prisma.exam_schedules.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Fetch all schedule entries for this schedule
    const entries = await prisma.schedule_entries.findMany({
      where: { schedule_id: scheduleId },
      include: {
        sections: {
          include: {
            teachers: true,
            courses: true
          }
        },
        venues: true,
        exam_slots: true
      }
    });

    // Fetch all student enrollments
    const enrollments = await prisma.enrollments.findMany({
      include: { students: true }
    });

    // Group student IDs by section_id
    const sectionStudentsMap = {};
    enrollments.forEach(e => {
      if (!sectionStudentsMap[e.section_id]) {
        sectionStudentsMap[e.section_id] = [];
      }
      // Push student ID
      sectionStudentsMap[e.section_id].push(e.student_id);
    });

    const teacherSlotMap = {};
    const venueSlotMap = {};
    const studentSlotMap = {};

    const teacherConflicts = [];
    const capacityViolations = [];
    const studentClashes = [];

    // Map which students are allocated to each specific schedule entry id
    const entryStudentsMap = {};

    for (const entry of entries) {
      const slotIndex = entry.exam_slots.slot_index;
      const venueId = entry.venue_id;
      const teacherId = entry.sections.teacher_id;
      const sectionId = entry.section_id;

      // 1. Map teacher busy status
      const tKey = `${teacherId}-${slotIndex}`;
      if (!teacherSlotMap[tKey]) teacherSlotMap[tKey] = [];
      teacherSlotMap[tKey].push(entry);

      // 2. Map venue slot occupancy
      const vKey = `${venueId}-${slotIndex}`;
      if (!venueSlotMap[vKey]) venueSlotMap[vKey] = [];
      venueSlotMap[vKey].push(entry);

      // Split the section's students into Part 1 and Part 2 consistently
      const allStudents = sectionStudentsMap[sectionId] || [];
      allStudents.sort((a, b) => Number(a) - Number(b)); // Order consistently
      const mid = Math.floor(allStudents.length / 2);
      const pStudents = entry.part === 'Part 1' ? allStudents.slice(0, mid) : allStudents.slice(mid);
      
      entryStudentsMap[entry.id] = pStudents;

      // 3. Map student clashes
      for (const stId of pStudents) {
        const sKey = `${stId}-${slotIndex}`;
        if (!studentSlotMap[sKey]) studentSlotMap[sKey] = [];
        studentSlotMap[sKey].push(entry);
      }
    }

    // Evaluate: Teacher Conflicts (multiple exams in same slot)
    for (const key in teacherSlotMap) {
      const shared = teacherSlotMap[key];
      if (shared.length > 1) {
        teacherConflicts.push({
          teacherId: shared[0].sections.teachers.id,
          teacherName: shared[0].sections.teachers.name,
          employeeId: shared[0].sections.teachers.employee_id,
          slotIndex: shared[0].exam_slots.slot_index,
          date: shared[0].exam_slots.date,
          examCount: shared.length,
          exams: shared.map(e => ({
            entryId: e.id,
            sectionName: e.sections.name,
            courseCode: e.sections.courses.code,
            courseName: e.sections.courses.name
          }))
        });
      }
    }

    // Evaluate: Venue Capacity Violations (social distancing: total_students * 2 > venue capacity)
    for (const key in venueSlotMap) {
      const shared = venueSlotMap[key];
      let totalStudents = 0;
      for (const e of shared) {
        const stIds = entryStudentsMap[e.id] || [];
        totalStudents += stIds.length;
      }
      
      const requiredCapacity = totalStudents * 2;
      const actualCapacity = shared[0].venues.capacity;
      if (requiredCapacity > actualCapacity) {
        capacityViolations.push({
          venueId: shared[0].venues.id,
          venueName: shared[0].venues.name,
          slotIndex: shared[0].exam_slots.slot_index,
          date: shared[0].exam_slots.date,
          requiredCapacity,
          actualCapacity,
          studentCount: totalStudents,
          exams: shared.map(e => ({
            course: e.sections.courses.code,
            section: e.sections.name,
            part: e.part
          }))
        });
      }
    }

    // Evaluate: Student Clashes (student has multiple exams in same slot)
    // Gather student details for readability
    const studentsDb = await prisma.students.findMany();
    const studentsMap = {};
    studentsDb.forEach(s => { studentsMap[s.id] = s; });

    for (const key in studentSlotMap) {
      const shared = studentSlotMap[key];
      if (shared.length > 1) {
        const [stId] = key.split('-');
        const student = studentsMap[stId];
        
        studentClashes.push({
          studentId: student ? student.student_id : stId,
          studentName: student ? student.name : 'Unknown Student',
          slotIndex: shared[0].exam_slots.slot_index,
          date: shared[0].exam_slots.date,
          examCount: shared.length,
          exams: shared.map(e => ({
            courseCode: e.sections.courses.code,
            sectionName: e.sections.name,
            part: e.part
          }))
        });
      }
    }

    return res.json({
      schedule: {
        id: schedule.id,
        name: schedule.name,
        createdAt: schedule.created_at
      },
      summary: {
        totalTeacherConflicts: teacherConflicts.length,
        totalCapacityViolations: capacityViolations.length,
        totalStudentClashes: studentClashes.length
      },
      teacherConflicts,
      capacityViolations,
      studentClashes
    });

  } catch (error) {
    console.error('Error generating conflict report:', error);
    return res.status(500).json({ error: error.message });
  }
}

// --- 2. GAP REPORT ---
async function getGapReport(req, res) {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const schedule = await prisma.exam_schedules.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Fetch all entries
    const entries = await prisma.schedule_entries.findMany({
      where: { schedule_id: scheduleId },
      include: {
        sections: true,
        exam_slots: true
      }
    });

    // Fetch all enrollments with student relation
    const enrollments = await prisma.enrollments.findMany({
      include: { students: true }
    });

    // Group enrollments by section_id
    const sectionStudentsMap = {};
    enrollments.forEach(e => {
      if (!sectionStudentsMap[e.section_id]) {
        sectionStudentsMap[e.section_id] = [];
      }
      sectionStudentsMap[e.section_id].push(e);
    });

    const studentSessions = {};

    for (const entry of entries) {
      const allEnrs = sectionStudentsMap[entry.section_id] || [];
      // Sort consistently
      allEnrs.sort((a, b) => Number(a.student_id) - Number(b.student_id));
      const mid = Math.floor(allEnrs.length / 2);
      const pEnrs = entry.part === 'Part 1' ? allEnrs.slice(0, mid) : allEnrs.slice(mid);

      for (const enr of pEnrs) {
        const studentId = enr.student_id;
        if (!studentSessions[studentId]) {
          studentSessions[studentId] = {
            student: enr.students,
            sessions: []
          };
        }
        studentSessions[studentId].sessions.push(entry);
      }
    }

    const gapIssues = [];

    for (const stId in studentSessions) {
      const { student, sessions } = studentSessions[stId];

      // Group student sessions by date
      const daySlots = {};
      sessions.forEach(sess => {
        const dateStr = sess.exam_slots.date.toISOString().split('T')[0];
        if (!daySlots[dateStr]) daySlots[dateStr] = [];
        daySlots[dateStr].push(sess.exam_slots);
      });

      for (const dateStr in daySlots) {
        const slots = daySlots[dateStr];
        if (slots.length > 1) {
          // Sort slots by start_time
          slots.sort((a, b) => {
            const timeA = new Date(a.start_time).getTime();
            const timeB = new Date(b.start_time).getTime();
            return timeA - timeB;
          });

          for (let i = 0; i < slots.length - 1; i++) {
            const end = new Date(slots[i].end_time);
            const startNext = new Date(slots[i + 1].start_time);

            const gapMs = startNext - end;
            const gapHours = gapMs / (1000 * 60 * 60);

            // Flag if the gap between exams is NOT exactly a 1-slot break (which is exactly 3 hours)
            // consecutive exams = 0.5 hours gap. 2-slot break = 5.5 hours gap.
            if (Math.abs(gapHours - 3) > 0.1) {
              const formatTime = (dateObj) => {
                return new Date(dateObj).toISOString().split('T')[1].substring(0, 5);
              };

              gapIssues.push({
                student: {
                  id: student.id,
                  studentId: student.student_id,
                  name: student.name
                },
                date: dateStr,
                gapHours: parseFloat(gapHours.toFixed(1)),
                firstExam: {
                  startTime: formatTime(slots[i].start_time),
                  endTime: formatTime(slots[i].end_time),
                  slotIndex: slots[i].slot_index
                },
                secondExam: {
                  startTime: formatTime(slots[i + 1].start_time),
                  endTime: formatTime(slots[i + 1].end_time),
                  slotIndex: slots[i + 1].slot_index
                }
              });
            }
          }
        }
      }
    }

    return res.json({
      schedule: {
        id: schedule.id,
        name: schedule.name
      },
      summary: {
        totalGapIssues: gapIssues.length
      },
      gapIssues
    });

  } catch (error) {
    console.error('Error generating gap report:', error);
    return res.status(500).json({ error: error.message });
  }
}

// --- 3. STUDENTS REGISTERED IN COURSE ---
async function getCourseStudents(req, res) {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await prisma.courses.findUnique({
      where: { id: courseId },
      include: { departments: true }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Find all sections for this course
    const sectionsList = await prisma.sections.findMany({
      where: { course_id: courseId }
    });

    const sectionIds = sectionsList.map(s => s.id);

    // Find all enrollments under these sections
    const enrollments = await prisma.enrollments.findMany({
      where: { section_id: { in: sectionIds } },
      include: {
        students: {
          include: { departments: true }
        },
        sections: true
      }
    });

    const registeredStudents = enrollments.map(enr => ({
      id: enr.students.id,
      studentId: enr.students.student_id,
      name: enr.students.name,
      department: enr.students.departments.name,
      status: enr.students.status,
      assignedSection: enr.sections.name,
      enrollmentDate: enr.enrollment_date
    }));

    return res.json({
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        creditHours: course.credit_hours,
        department: course.departments.name
      },
      summary: {
        totalStudentsCount: registeredStudents.length
      },
      registeredStudents
    });

  } catch (error) {
    console.error('Error getting registered students:', error);
    return res.status(500).json({ error: error.message });
  }
}

// --- 4. STUDENT REGISTERED COURSES AND TIMETABLE SCHEDULE ---
async function getStudentSchedule(req, res) {
  try {
    const studentIdParam = req.params.id;

    // 1. Retrieve Student
    let student;
    if (isNaN(studentIdParam)) {
      student = await prisma.students.findUnique({
        where: { student_id: studentIdParam },
        include: { departments: true }
      });
    } else {
      student = await prisma.students.findUnique({
        where: { id: parseInt(studentIdParam, 10) },
        include: { departments: true }
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 2. Fetch all section enrollments
    const studentEnrollments = await prisma.enrollments.findMany({
      where: { student_id: student.id },
      include: {
        sections: {
          include: {
            courses: {
              include: { departments: true }
            },
            teachers: true
          }
        }
      }
    });

    const registeredCourses = [];
    const schedule = [];

    // 3. For each section, find split details and fetch their schedule assignment
    for (const enr of studentEnrollments) {
      const sectionId = enr.section_id;

      // Find split index (sorted consistently by student DB primary key id)
      const allEnrs = await prisma.enrollments.findMany({
        where: { section_id: sectionId },
        orderBy: { student_id: 'asc' }
      });

      const studentIndex = allEnrs.findIndex(e => e.student_id === student.id);
      const mid = Math.floor(allEnrs.length / 2);
      const assignedPart = studentIndex < mid ? 'Part 1' : 'Part 2';

      registeredCourses.push({
        sectionId: enr.sections.id,
        sectionName: enr.sections.name,
        courseCode: enr.sections.courses.code,
        courseName: enr.sections.courses.name,
        creditHours: enr.sections.courses.credit_hours,
        teacher: enr.sections.teachers.name,
        assignedPart
      });

      // Find schedule entries matching the section & assigned part
      const entries = await prisma.schedule_entries.findMany({
        where: {
          section_id: sectionId,
          part: assignedPart
        },
        include: {
          exam_slots: true,
          venues: true,
          exam_schedules: true
        }
      });

      entries.forEach(entry => {
        const formatTime = (dateObj) => {
          return new Date(dateObj).toISOString().split('T')[1].substring(0, 5);
        };

        schedule.push({
          scheduleName: entry.exam_schedules.name,
          part: entry.part,
          slot: {
            id: entry.exam_slots.id,
            date: entry.exam_slots.date.toISOString().split('T')[0],
            startTime: formatTime(entry.exam_slots.start_time),
            endTime: formatTime(entry.exam_slots.end_time),
            slotIndex: entry.exam_slots.slot_index
          },
          venue: {
            id: entry.venues.id,
            name: entry.venues.name,
            capacity: entry.venues.capacity,
            building: entry.venues.building
          }
        });
      });
    }

    return res.json({
      student: {
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        department: student.departments.name,
        status: student.status
      },
      registeredCourses,
      schedule
    });

  } catch (error) {
    console.error('Error getting student schedule:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getConflictReport,
  getGapReport,
  getCourseStudents,
  getStudentSchedule
};
