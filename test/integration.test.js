const axios = require('axios');
const xlsx = require('xlsx');
const prisma = require('../src/config/db');

const PORT = 3001; // Run tests on port 3001
const BASE_URL = `http://localhost:${PORT}`;

// Dynamically start the server for testing
let serverInstance;

function startTestServer() {
  const app = require('../src/server');
  // Since server.js calls app.listen directly, we can run server.js in another process 
  // or start a new express listener. Because server.js has `app.listen(PORT)`, 
  // importing server.js will start it on process.env.PORT or 3000.
  // To avoid conflict with the running server, we will set process.env.PORT = 3001
  // and load server.js.
}

async function runTests() {
  console.log('🧪 Starting Integration Tests on Port 3001...');
  
  let token = '';
  let deptId, courseId, teacherId, venueId, normalVenueId, studentId, sectionId, enrollmentId;

  // Set up clean environment state (delete test entries from DB)
  try {
    console.log('🧹 Cleaning test data from local database...');
    await prisma.enrollments.deleteMany({ where: { students: { student_id: { startsWith: 'TEST' } } } });
    await prisma.students.deleteMany({ where: { student_id: { startsWith: 'TEST' } } });
    await prisma.schedule_entries.deleteMany({
      where: {
        OR: [
          { sections: { name: { startsWith: 'TEST' } } },
          { venues: { name: { startsWith: 'TEST' } } }
        ]
      }
    });
    await prisma.sections.deleteMany({ where: { name: { startsWith: 'TEST' } } });
    await prisma.teachers.deleteMany({ where: { employee_id: { startsWith: 'TEST' } } });
    await prisma.courses.deleteMany({ where: { code: { startsWith: 'TEST' } } });
    await prisma.departments.deleteMany({ where: { code: { startsWith: 'TEST' } } });
    await prisma.venues.deleteMany({ where: { name: { startsWith: 'TEST' } } });
    await prisma.auth_user.deleteMany({ where: { username: 'testadmin' } });
  } catch (err) {
    console.warn('⚠️ Warning during DB cleanup:', err.message);
  }

  // Helper assertions
  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(`❌ Assertion Failed: ${message}`);
    }
    console.log(`✅ ${message}`);
  };

  try {
    // 1. REGISTER ADMIN USER
    console.log('\n--- 1. Testing User Registration ---');
    const registerRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'testadmin',
      email: 'testadmin@university.edu',
      password: 'adminpassword123',
      firstName: 'Test',
      lastName: 'Admin',
      isStaff: true,
      isSuperuser: true
    });
    assert(registerRes.status === 201, 'Admin user registered successfully');
    assert(registerRes.data.data.user.username === 'testadmin', 'Returned correct username');

    // 2. LOGIN USER
    console.log('\n--- 2. Testing User Login ---');
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testadmin',
      password: 'adminpassword123'
    });
    assert(loginRes.status === 200, 'Admin user logged in successfully');
    assert(loginRes.data.data.token !== undefined, 'Obtained JWT access token');
    token = loginRes.data.data.token;
    
    const headers = { 'Authorization': `Bearer ${token}` };

    // 3. CRUD - DEPARTMENTS
    console.log('\n--- 3. Testing Department CRUD ---');
    const deptRes = await axios.post(`${BASE_URL}/api/departments`, {
      name: 'Test Department of Computing',
      code: 'TEST'
    }, { headers });
    assert(deptRes.status === 201, 'Department created');
    deptId = deptRes.data.data.id;
    assert(deptRes.data.data.code === 'TEST', 'Department code match');

    // 4. CRUD - COURSES
    console.log('\n--- 4. Testing Course CRUD ---');
    const courseRes = await axios.post(`${BASE_URL}/api/courses`, {
      name: 'Testing Methodologies 101',
      code: 'TEST101',
      credit_hours: 3,
      department_id: deptId
    }, { headers });
    assert(courseRes.status === 201, 'Course created');
    courseId = courseRes.data.data.id;
    assert(courseRes.data.data.code === 'TEST101', 'Course code match');

    // 5. CRUD - TEACHERS
    console.log('\n--- 5. Testing Teacher CRUD ---');
    const teacherRes = await axios.post(`${BASE_URL}/api/teachers`, {
      name: 'Dr. John Tester',
      employee_id: 'TESTEMP001',
      department_id: deptId
    }, { headers });
    assert(teacherRes.status === 201, 'Teacher created');
    teacherId = teacherRes.data.data.id;
    assert(teacherRes.data.data.employee_id === 'TESTEMP001', 'Teacher employee ID match');

    // 6. CRUD - VENUE CAPACITY VALIDATION RULES
    console.log('\n--- 6. Testing Venue Capacity Validation Rules ---');
    
    // Rule A: Normal rooms must have exactly 50 capacity.
    // Try to create normal room with 60 capacity (Should Fail)
    try {
      await axios.post(`${BASE_URL}/api/venues`, {
        name: 'TEST Room 101',
        capacity: 60,
        building: 'Test Wing'
      }, { headers });
      assert(false, 'Should fail creating a regular room with capacity !== 50');
    } catch (err) {
      assert(err.response.status === 400, 'Successfully blocked normal room creation with capacity = 60');
    }

    // Create normal room with 50 capacity (Should Succeed)
    const normalVenueRes = await axios.post(`${BASE_URL}/api/venues`, {
      name: 'TEST Room 101',
      capacity: 50,
      building: 'Test Wing'
    }, { headers });
    assert(normalVenueRes.status === 201, 'Regular room created with capacity = 50');
    normalVenueId = normalVenueRes.data.data.id;

    // Rule B: Main Auditorium must have exactly 300 capacity.
    // Try to create Main Auditorium with 50 capacity (Should Fail)
    try {
      await axios.post(`${BASE_URL}/api/venues`, {
        name: 'TEST Main Auditorium',
        capacity: 50,
        building: 'Admin Block'
      }, { headers });
      assert(false, 'Should fail creating Main Auditorium with capacity !== 300');
    } catch (err) {
      assert(err.response.status === 400, 'Successfully blocked Main Auditorium creation with capacity = 50');
    }

    // Create Main Auditorium with 300 capacity (Should Succeed)
    const audVenueRes = await axios.post(`${BASE_URL}/api/venues`, {
      name: 'TEST Main Auditorium',
      capacity: 300,
      building: 'Admin Block'
    }, { headers });
    assert(audVenueRes.status === 201, 'Main Auditorium created with capacity = 300');
    venueId = audVenueRes.data.data.id;

    // 7. CRUD - STUDENTS
    console.log('\n--- 7. Testing Student CRUD ---');
    const studentRes = await axios.post(`${BASE_URL}/api/students`, {
      student_id: 'TESTSTUD999',
      name: 'Sam Tester',
      department_id: deptId,
      status: 'Active'
    }, { headers });
    assert(studentRes.status === 201, 'Student created manually');
    studentId = studentRes.data.data.id;
    assert(studentRes.data.data.status === 'Active', 'Student status match');

    // 8. CRUD - SECTIONS
    console.log('\n--- 8. Testing Section CRUD ---');
    const sectionRes = await axios.post(`${BASE_URL}/api/sections`, {
      name: 'TEST Section A',
      course_id: courseId,
      teacher_id: teacherId
    }, { headers });
    assert(sectionRes.status === 201, 'Course section created');
    sectionId = sectionRes.data.data.id;
    assert(sectionRes.data.data.name === 'TEST Section A', 'Section name match');

    // 9. CRUD - ENROLLMENTS
    console.log('\n--- 9. Testing Enrollment CRUD ---');
    const enrollRes = await axios.post(`${BASE_URL}/api/enrollments`, {
      student_id: studentId,
      section_id: sectionId
    }, { headers });
    assert(enrollRes.status === 201, 'Student enrolled into section');
    enrollmentId = enrollRes.data.data.id;

    // 10. EXCEL INGESTION (STUDENTS UPLOAD)
    console.log('\n--- 10. Testing Excel Student Ingestion ---');
    
    // Generate mock excel workbook buffer in memory using xlsx
    const wb = xlsx.utils.book_new();
    const mockStudents = [
      { 'Student ID': 'TESTSTUD001', 'Full Name': 'Alice Ingested', 'Department Code': 'TEST', 'Status': 'Active' },
      { 'Student ID': 'TESTSTUD002', 'Full Name': 'Bob Ingested', 'Department Code': 'TEST', 'Status': 'On Break' },
      { 'Student ID': 'TESTSTUD003', 'Full Name': 'Charlie Ingested', 'Department Code': 'TEST', 'Status': 'Graduated' }
    ];
    const ws = xlsx.utils.json_to_sheet(mockStudents);
    xlsx.utils.book_append_sheet(wb, ws, 'StudentsList');
    
    // Generate Buffer
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send multipart request manually using Axios boundary formatting
    const boundary = '------TestBoundaryString';
    const postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="students.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
      excelBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const uploadHeaders = {
      ...headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    };

    const uploadRes = await axios.post(`${BASE_URL}/api/students/upload`, postData, { headers: uploadHeaders });
    assert(uploadRes.status === 200, 'Excel file uploaded and processed successfully');
    assert(uploadRes.data.data.summary.totalRowsProcessed === 3, 'Processed 3 student rows');
    assert(uploadRes.data.data.summary.successfullyImported === 3, 'Imported 3 student rows');

    // 11. INTEGRATION WITH PYTHON SCHEDULING ENGINE
    console.log('\n--- 11. Testing Python Scheduling Engine Integration ---');
    
    const triggerRes = await axios.post(`${BASE_URL}/api/schedule/generate`, {}, { headers });
    assert(triggerRes.status === 200, 'Scheduler trigger returned 200 OK immediately');
    assert(triggerRes.data.data.status === 'started', 'State reports started');

    // Check polling status
    const statusRes = await axios.get(`${BASE_URL}/api/schedule/status`, { headers });
    assert(statusRes.status === 200, 'Fetched status successfully');
    console.log('Current Scheduling Step:', statusRes.data.data.step);

    console.log('\n🌟 Integration Test Suite Completed Successfully! All tests passed.');
    server.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test Suite Failed with Error:');
    if (error.response) {
      console.error(`HTTP Status: ${error.response.status}`);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
      if (error.stack) console.error(error.stack);
    }
    server.close();
    process.exit(1);
  }
}

// Start server on port 3001 and run tests
process.env.PORT = PORT;
process.env.NODE_ENV = 'test';

const server = require('http').createServer(require('../src/server'));
server.listen(PORT, () => {
  runTests();
});
