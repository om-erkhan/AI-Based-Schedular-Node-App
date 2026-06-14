const prisma = require('../config/db');

// --- DEPARTMENTS ---
async function getDepartments(req, res) {
  try {
    const list = await prisma.departments.findMany();
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getDepartmentById(req, res) {
  try {
    const item = await prisma.departments.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });
    if (!item) return res.status(404).json({ error: 'Department not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createDepartment(req, res) {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and Code are required' });
    
    const existing = await prisma.departments.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ error: 'Department code already exists' });

    const newItem = await prisma.departments.create({
      data: { name, code }
    });
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateDepartment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, code } = req.body;
    
    const existing = await prisma.departments.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Department not found' });

    if (code && code !== existing.code) {
      const codeCheck = await prisma.departments.findUnique({ where: { code } });
      if (codeCheck) return res.status(400).json({ error: 'Department code already exists' });
    }

    const updated = await prisma.departments.update({
      where: { id },
      data: { name, code }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteDepartment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.departments.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Department not found' });

    await prisma.departments.delete({ where: { id } });
    return res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


// --- COURSES ---
async function getCourses(req, res) {
  try {
    const list = await prisma.courses.findMany({
      include: { departments: true }
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getCourseById(req, res) {
  try {
    const item = await prisma.courses.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { departments: true }
    });
    if (!item) return res.status(404).json({ error: 'Course not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createCourse(req, res) {
  try {
    const { name, code, credit_hours, department_id } = req.body;
    if (!name || !code || !credit_hours || !department_id) {
      return res.status(400).json({ error: 'Name, code, credit_hours, and department_id are required' });
    }

    const existing = await prisma.courses.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ error: 'Course code already exists' });

    const dept = await prisma.departments.findUnique({ where: { id: department_id } });
    if (!dept) return res.status(400).json({ error: 'Invalid department_id' });

    const newItem = await prisma.courses.create({
      data: {
        name,
        code,
        credit_hours: parseInt(credit_hours, 10),
        department_id: parseInt(department_id, 10)
      }
    });
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateCourse(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, code, credit_hours, department_id } = req.body;

    const existing = await prisma.courses.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Course not found' });

    if (code && code !== existing.code) {
      const codeCheck = await prisma.courses.findUnique({ where: { code } });
      if (codeCheck) return res.status(400).json({ error: 'Course code already exists' });
    }

    if (department_id) {
      const dept = await prisma.departments.findUnique({ where: { id: department_id } });
      if (!dept) return res.status(400).json({ error: 'Invalid department_id' });
    }

    const updated = await prisma.courses.update({
      where: { id },
      data: {
        name,
        code,
        credit_hours: credit_hours !== undefined ? parseInt(credit_hours, 10) : undefined,
        department_id: department_id !== undefined ? parseInt(department_id, 10) : undefined
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteCourse(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.courses.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Course not found' });

    await prisma.courses.delete({ where: { id } });
    return res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


// --- TEACHERS ---
async function getTeachers(req, res) {
  try {
    const list = await prisma.teachers.findMany({
      include: { departments: true }
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getTeacherById(req, res) {
  try {
    const item = await prisma.teachers.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { departments: true }
    });
    if (!item) return res.status(404).json({ error: 'Teacher not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createTeacher(req, res) {
  try {
    const { name, employee_id, department_id } = req.body;
    if (!name || !employee_id || !department_id) {
      return res.status(400).json({ error: 'Name, employee_id, and department_id are required' });
    }

    const existing = await prisma.teachers.findUnique({ where: { employee_id } });
    if (existing) return res.status(400).json({ error: 'Employee ID already exists' });

    const dept = await prisma.departments.findUnique({ where: { id: department_id } });
    if (!dept) return res.status(400).json({ error: 'Invalid department_id' });

    const newItem = await prisma.teachers.create({
      data: {
        name,
        employee_id,
        department_id: parseInt(department_id, 10)
      }
    });
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateTeacher(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, employee_id, department_id } = req.body;

    const existing = await prisma.teachers.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Teacher not found' });

    if (employee_id && employee_id !== existing.employee_id) {
      const check = await prisma.teachers.findUnique({ where: { employee_id } });
      if (check) return res.status(400).json({ error: 'Employee ID already exists' });
    }

    if (department_id) {
      const dept = await prisma.departments.findUnique({ where: { id: department_id } });
      if (!dept) return res.status(400).json({ error: 'Invalid department_id' });
    }

    const updated = await prisma.teachers.update({
      where: { id },
      data: {
        name,
        employee_id,
        department_id: department_id !== undefined ? parseInt(department_id, 10) : undefined
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteTeacher(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.teachers.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Teacher not found' });

    await prisma.teachers.delete({ where: { id } });
    return res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


// --- VENUES ---
async function getVenues(req, res) {
  try {
    const list = await prisma.venues.findMany();
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getVenueById(req, res) {
  try {
    const item = await prisma.venues.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });
    if (!item) return res.status(404).json({ error: 'Venue not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createVenue(req, res) {
  try {
    const { name, capacity, building } = req.body;
    if (!name || capacity === undefined) {
      return res.status(400).json({ error: 'Name and capacity are required' });
    }

    const capVal = parseInt(capacity, 10);
    const nameLower = name.toLowerCase();

    // Capacity validation: Main Auditorium = 300, others = 50
    if (nameLower.includes('main auditorium')) {
      if (capVal !== 300) {
        return res.status(400).json({ error: 'Main Auditorium capacity must be exactly 300' });
      }
    } else {
      if (capVal !== 50) {
        return res.status(400).json({ error: 'Normal rooms must have exactly 50 capacity' });
      }
    }

    const newItem = await prisma.venues.create({
      data: {
        name,
        capacity: capVal,
        building: building || null
      }
    });
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateVenue(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, capacity, building } = req.body;

    const existing = await prisma.venues.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Venue not found' });

    const updatedName = name !== undefined ? name : existing.name;
    const updatedCap = capacity !== undefined ? parseInt(capacity, 10) : existing.capacity;
    
    const nameLower = updatedName.toLowerCase();
    if (nameLower.includes('main auditorium')) {
      if (updatedCap !== 300) {
        return res.status(400).json({ error: 'Main Auditorium capacity must be exactly 300' });
      }
    } else {
      if (updatedCap !== 50) {
        return res.status(400).json({ error: 'Normal rooms must have exactly 50 capacity' });
      }
    }

    const updated = await prisma.venues.update({
      where: { id },
      data: {
        name: updatedName,
        capacity: updatedCap,
        building: building !== undefined ? building : existing.building
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteVenue(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.venues.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Venue not found' });

    await prisma.venues.delete({ where: { id } });
    return res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


// --- STUDENTS ---
async function getStudents(req, res) {
  try {
    const list = await prisma.students.findMany({
      include: { departments: true }
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getStudentById(req, res) {
  try {
    const item = await prisma.students.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { departments: true }
    });
    if (!item) return res.status(404).json({ error: 'Student not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createStudent(req, res) {
  try {
    const { student_id, name, department_id, status, semester, email, phone } = req.body;
    if (!student_id || !name || !department_id) {
      return res.status(400).json({ error: 'student_id, name, and department_id are required' });
    }

    const existing = await prisma.students.findUnique({ where: { student_id } });
    if (existing) return res.status(400).json({ error: 'Student ID already exists' });

    const dept = await prisma.departments.findUnique({ where: { id: department_id } });
    if (!dept) return res.status(400).json({ error: 'Invalid department_id' });

    // Validate Status values
    const validStatuses = ['Active', 'Graduated', 'On Break'];
    const finalStatus = status || 'Active';
    if (!validStatuses.includes(finalStatus)) {
      return res.status(400).json({ error: 'Status must be one of: Active, Graduated, On Break' });
    }

    const newItem = await prisma.students.create({
      data: {
        student_id,
        name,
        department_id: parseInt(department_id, 10),
        status: finalStatus,
        semester: semester || null,
        email: email || null,
        phone: phone || null
      }
    });
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateStudent(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { student_id, name, department_id, status, semester, email, phone } = req.body;

    const existing = await prisma.students.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Student not found' });

    if (student_id && student_id !== existing.student_id) {
      const check = await prisma.students.findUnique({ where: { student_id } });
      if (check) return res.status(400).json({ error: 'Student ID already exists' });
    }

    if (department_id) {
      const dept = await prisma.departments.findUnique({ where: { id: department_id } });
      if (!dept) return res.status(400).json({ error: 'Invalid department_id' });
    }

    if (status) {
      const validStatuses = ['Active', 'Graduated', 'On Break'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status must be one of: Active, Graduated, On Break' });
      }
    }

    const updated = await prisma.students.update({
      where: { id },
      data: {
        student_id,
        name,
        department_id: department_id !== undefined ? parseInt(department_id, 10) : undefined,
        status,
        semester: semester !== undefined ? semester : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteStudent(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.students.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Student not found' });

    await prisma.students.delete({ where: { id } });
    return res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


// --- SECTIONS ---
async function getSections(req, res) {
  try {
    const list = await prisma.sections.findMany({
      include: {
        courses: true,
        teachers: true
      }
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getSectionById(req, res) {
  try {
    const item = await prisma.sections.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        courses: true,
        teachers: true
      }
    });
    if (!item) return res.status(404).json({ error: 'Section not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createSection(req, res) {
  try {
    const { name, course_id, teacher_id } = req.body;
    if (!name || !course_id || !teacher_id) {
      return res.status(400).json({ error: 'Name, course_id, and teacher_id are required' });
    }

    const course = await prisma.courses.findUnique({ where: { id: course_id } });
    if (!course) return res.status(400).json({ error: 'Invalid course_id' });

    const teacher = await prisma.teachers.findUnique({ where: { id: teacher_id } });
    if (!teacher) return res.status(400).json({ error: 'Invalid teacher_id' });

    const newItem = await prisma.sections.create({
      data: {
        name,
        course_id: parseInt(course_id, 10),
        teacher_id: parseInt(teacher_id, 10)
      }
    });
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateSection(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, course_id, teacher_id } = req.body;

    const existing = await prisma.sections.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Section not found' });

    if (course_id) {
      const course = await prisma.courses.findUnique({ where: { id: course_id } });
      if (!course) return res.status(400).json({ error: 'Invalid course_id' });
    }

    if (teacher_id) {
      const teacher = await prisma.teachers.findUnique({ where: { id: teacher_id } });
      if (!teacher) return res.status(400).json({ error: 'Invalid teacher_id' });
    }

    const updated = await prisma.sections.update({
      where: { id },
      data: {
        name,
        course_id: course_id !== undefined ? parseInt(course_id, 10) : undefined,
        teacher_id: teacher_id !== undefined ? parseInt(teacher_id, 10) : undefined
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteSection(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.sections.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Section not found' });

    await prisma.sections.delete({ where: { id } });
    return res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


// --- ENROLLMENTS ---
async function getEnrollments(req, res) {
  try {
    const list = await prisma.enrollments.findMany({
      include: {
        students: true,
        sections: {
          include: { courses: true }
        }
      }
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getEnrollmentById(req, res) {
  try {
    const item = await prisma.enrollments.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        students: true,
        sections: {
          include: { courses: true }
        }
      }
    });
    if (!item) return res.status(404).json({ error: 'Enrollment not found' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createEnrollment(req, res) {
  try {
    const { student_id, section_id } = req.body;
    if (!student_id || !section_id) {
      return res.status(400).json({ error: 'student_id and section_id are required' });
    }

    const student = await prisma.students.findUnique({ where: { id: student_id } });
    if (!student) return res.status(400).json({ error: 'Invalid student_id' });

    const section = await prisma.sections.findUnique({ where: { id: section_id } });
    if (!section) return res.status(400).json({ error: 'Invalid section_id' });

    // Validate enrollment limit: max 55 students per course (across all sections)
    const courseEnrollmentCount = await prisma.enrollments.count({
      where: {
        sections: {
          course_id: section.course_id
        }
      }
    });
    if (courseEnrollmentCount >= 55) {
      return res.status(400).json({ error: 'This course has reached its maximum enrollment capacity of 55 students.' });
    }

    // Check unique constraint
    const existing = await prisma.enrollments.findUnique({
      where: {
        student_id_section_id: {
          student_id: parseInt(student_id, 10),
          section_id: parseInt(section_id, 10)
        }
      }
    });
    if (existing) return res.status(400).json({ error: 'Student is already enrolled in this section' });

    const newItem = await prisma.enrollments.create({
      data: {
        student_id: parseInt(student_id, 10),
        section_id: parseInt(section_id, 10),
        enrollment_date: new Date()
      }
    });
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateEnrollment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { student_id, section_id } = req.body;

    const existing = await prisma.enrollments.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Enrollment not found' });

    const finalStudentId = student_id !== undefined ? parseInt(student_id, 10) : existing.student_id;
    const finalSectionId = section_id !== undefined ? parseInt(section_id, 10) : existing.section_id;

    if (student_id) {
      const student = await prisma.students.findUnique({ where: { id: student_id } });
      if (!student) return res.status(400).json({ error: 'Invalid student_id' });
    }

    if (section_id) {
      const section = await prisma.sections.findUnique({ where: { id: section_id } });
      if (!section) return res.status(400).json({ error: 'Invalid section_id' });

      // Enforce the 55 limit if changing section (or if it wasn't validated previously)
      if (parseInt(section_id, 10) !== Number(existing.section_id)) {
        const courseEnrollmentCount = await prisma.enrollments.count({
          where: {
            sections: {
              course_id: section.course_id
            }
          }
        });
        if (courseEnrollmentCount >= 55) {
          return res.status(400).json({ error: 'This course has reached its maximum enrollment capacity of 55 students.' });
        }
      }
    }

    // Check unique constraint
    if (student_id || section_id) {
      const checkUnique = await prisma.enrollments.findUnique({
        where: {
          student_id_section_id: {
            student_id: finalStudentId,
            section_id: finalSectionId
          }
        }
      });
      if (checkUnique && checkUnique.id !== id) {
        return res.status(400).json({ error: 'This student-section enrollment already exists' });
      }
    }

    const updated = await prisma.enrollments.update({
      where: { id },
      data: {
        student_id: student_id !== undefined ? parseInt(student_id, 10) : undefined,
        section_id: section_id !== undefined ? parseInt(section_id, 10) : undefined
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteEnrollment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.enrollments.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Enrollment not found' });

    await prisma.enrollments.delete({ where: { id } });
    return res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  getEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment
};
