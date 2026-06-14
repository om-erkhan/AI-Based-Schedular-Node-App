const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const sections = await prisma.sections.findMany({
      include: {
        courses: true,
        _count: {
          select: { enrollments: true }
        }
      }
    });

    const courseEnrollments = {};
    sections.forEach(sec => {
      if (!sec.courses) return;
      const cid = sec.course_id.toString();
      if (!courseEnrollments[cid]) {
        courseEnrollments[cid] = {
          id: cid,
          code: sec.courses.code,
          name: sec.courses.name,
          enrollmentCount: 0
        };
      }
      courseEnrollments[cid].enrollmentCount += sec._count.enrollments;
    });

    const sorted = Object.values(courseEnrollments).sort((a,b) => b.enrollmentCount - a.enrollmentCount);
    console.log("=== Top 20 Courses by Enrollment ===");
    console.log(sorted.slice(0, 20));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
