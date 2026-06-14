const xlsx = require('xlsx');
const prisma = require('../config/db');

async function importStudents(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    // Read the Excel workbook from the uploaded buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel file is empty' });
    }

    // Fetch all departments for quick in-memory code-to-id mapping
    const departments = await prisma.departments.findMany();
    const deptMap = {};
    departments.forEach(dept => {
      deptMap[dept.code.trim().toUpperCase()] = dept.id;
    });

    const imported = [];
    const skipped = [];

    // Process students row by row
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      
      // Support multiple variations of header column naming
      const studentId = String(row['student_id'] || row['Student ID'] || row['studentId'] || '').trim();
      const name = String(row['name'] || row['Name'] || row['Full Name'] || '').trim();
      const deptCode = String(row['department_code'] || row['Department Code'] || row['department'] || '').trim().toUpperCase();
      let status = String(row['status'] || row['Status'] || 'Active').trim();
      const semester = row['semester'] || row['Semester'] ? String(row['semester'] || row['Semester']).trim() : null;
      const email = row['email'] || row['Email'] || row['Email Address'] ? String(row['email'] || row['Email'] || row['Email Address']).trim() : null;
      const phone = row['phone'] || row['Phone'] || row['Phone Number'] ? String(row['phone'] || row['Phone'] || row['Phone Number']).trim() : null;

      // Basic row validation
      if (!studentId || !name || !deptCode) {
        skipped.push({
          rowNumber: index + 2,
          data: row,
          reason: 'Missing Student ID, Full Name, or Department Code'
        });
        continue;
      }

      const departmentId = deptMap[deptCode];
      if (!departmentId) {
        skipped.push({
          rowNumber: index + 2,
          data: row,
          reason: `Department code '${deptCode}' not found in database`
        });
        continue;
      }

      // Default status mapping
      const validStatuses = ['Active', 'Graduated', 'On Break'];
      if (!validStatuses.includes(status)) {
        status = 'Active';
      }

      try {
        // Upsert student based on unique student_id
        const student = await prisma.students.upsert({
          where: { student_id: studentId },
          update: {
            name,
            department_id: departmentId,
            status,
            semester,
            email,
            phone
          },
          create: {
            student_id: studentId,
            name,
            department_id: departmentId,
            status,
            semester,
            email,
            phone
          }
        });
        imported.push(student);
      } catch (err) {
        skipped.push({
          rowNumber: index + 2,
          data: row,
          reason: `Database error: ${err.message}`
        });
      }
    }

    return res.json({
      message: 'Student ingestion completed',
      summary: {
        totalRowsProcessed: rows.length,
        successfullyImported: imported.length,
        skippedCount: skipped.length
      },
      skipped
    });
  } catch (error) {
    console.error('Excel ingestion error:', error);
    return res.status(500).json({ error: 'Failed to process Excel file' });
  }
}

module.exports = {
  importStudents
};
