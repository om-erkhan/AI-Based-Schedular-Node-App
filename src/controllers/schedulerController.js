const axios = require('axios');
const prisma = require('../config/db');

// In-Memory state tracker on Node.js side
let schedulingState = {
  is_running: false,
  step: 'Idle',
  schedule_id: null,
  error: null
};

let pollingInterval = null;

async function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);

  const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

  const poll = async () => {
    try {
      const response = await axios.get(`${pythonUrl}/api/schedule-status`);
      const data = response.data;

      // Update in-memory state
      schedulingState = {
        is_running: data.is_running,
        step: data.step,
        schedule_id: data.schedule_id,
        error: data.error
      };

      console.log(`[Scheduler Poll] is_running: ${data.is_running}, step: ${data.step}, id: ${data.schedule_id}`);

      // Stop polling when engine stops running
      if (!data.is_running) {
        console.log('[Scheduler Poll] Scheduling pipeline finished. Stopping background poll.');
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    } catch (error) {
      console.error('[Scheduler Poll Error] Failed to fetch status from Python engine:', error.message);
      schedulingState.error = `Polling Error: ${error.message}`;
    }
  };

  // Poll immediately and then every 30 seconds
  await poll();
  if (schedulingState.is_running) {
    pollingInterval = setInterval(poll, 30000);
  }
}

async function triggerScheduleGeneration(req, res) {
  try {
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

    // Call Python microservice with the body payload from the frontend
    const response = await axios.post(`${pythonUrl}/api/generate-schedule`, req.body);
    
    // Reset our local state and immediately start background polling
    schedulingState = {
      is_running: true,
      step: 'Initializing...',
      schedule_id: null,
      error: null
    };

    // Trigger polling in the background without blocking the HTTP response
    startPolling().catch(err => {
      console.error('Error starting polling:', err);
    });

    // Return 200 OK immediately
    return res.status(200).json({
      status: 'started',
      message: 'Scheduling engine has started processing in the background.'
    });
  } catch (error) {
    console.error('Failed to trigger schedule generation:', error.message);
    const statusCode = error.response ? error.response.status : 500;
    const detail = error.response && error.response.data 
      ? (error.response.data.detail || error.response.data.message || JSON.stringify(error.response.data)) 
      : error.message;
    return res.status(statusCode).json({ error: `FastAPI error: ${detail}` });
  }
}

async function getScheduleStatus(req, res) {
  // If we are not running but the python service might have status from previous runs, 
  // try to fetch it first to ensure accuracy.
  try {
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
    const response = await axios.get(`${pythonUrl}/api/schedule-status`);
    schedulingState = response.data;
  } catch (error) {
    console.warn('[Status Check] Python microservice unreachable, returning last cached state:', error.message);
  }
  return res.json(schedulingState);
}

async function getScheduleTimetable(req, res) {
  try {
    let scheduleId;
    if (!req.params.id || req.params.id === 'latest') {
      const latestSchedule = await prisma.exam_schedules.findFirst({
        orderBy: { created_at: 'desc' }
      });
      if (!latestSchedule) {
        return res.status(404).json({ error: 'No schedule has been generated yet.' });
      }
      scheduleId = Number(latestSchedule.id);
    } else {
      scheduleId = parseInt(req.params.id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({ error: 'Invalid schedule ID' });
      }
    }

    // Check if the schedule exists
    const schedule = await prisma.exam_schedules.findUnique({
      where: { id: scheduleId }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Query all entries assigned to this schedule
    const entries = await prisma.schedule_entries.findMany({
      where: { schedule_id: scheduleId },
      include: {
        venues: true,
        exam_slots: true,
        sections: {
          include: {
            courses: {
              include: {
                departments: true
              }
            },
            teachers: {
              include: {
                departments: true
              }
            }
          }
        }
      }
    });

    // Format the response for clean consumption by the frontend
    const timetable = entries.map(entry => ({
      id: entry.id,
      part: entry.part,
      section: {
        id: entry.sections.id,
        name: entry.sections.name,
        course: {
          id: entry.sections.courses.id,
          name: entry.sections.courses.name,
          code: entry.sections.courses.code,
          creditHours: entry.sections.courses.credit_hours,
          department: entry.sections.courses.departments.name
        },
        teacher: {
          id: entry.sections.teachers.id,
          name: entry.sections.teachers.name,
          employeeId: entry.sections.teachers.employee_id
        }
      },
      venue: {
        id: entry.venues.id,
        name: entry.venues.name,
        capacity: entry.venues.capacity,
        building: entry.venues.building
      },
      slot: {
        id: entry.exam_slots.id,
        date: entry.exam_slots.date,
        startTime: entry.exam_slots.start_time,
        endTime: entry.exam_slots.end_time,
        slotIndex: entry.exam_slots.slot_index
      }
    }));

    return res.json({
      schedule: {
        id: schedule.id,
        name: schedule.name,
        createdAt: schedule.created_at,
        fitnessScore: schedule.fitness_score,
        isActive: schedule.is_active
      },
      timetable
    });
  } catch (error) {
    console.error('Failed to retrieve timetable:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function listSchedules(req, res) {
  try {
    const list = await prisma.exam_schedules.findMany({
      orderBy: { created_at: 'desc' }
    });
    return res.json(list);
  } catch (error) {
    console.error('Failed to list schedules:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function downloadTimetablePdf(req, res) {
  try {
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
    const scheduleId = req.query.schedule_id || '';
    const response = await axios({
      method: 'get',
      url: `${pythonUrl}/api/reports/schedule-pdf?schedule_id=${scheduleId}`,
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="exam_schedule_${scheduleId || 'latest'}.pdf"`);
    response.data.pipe(res);
  } catch (error) {
    console.error('Failed to download schedule PDF:', error.message);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
}

async function downloadStudentsPdf(req, res) {
  try {
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
    const scheduleId = req.query.schedule_id || '';
    const response = await axios({
      method: 'get',
      url: `${pythonUrl}/api/reports/students-pdf?schedule_id=${scheduleId}`,
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="course_students_venue_${scheduleId || 'latest'}.pdf"`);
    response.data.pipe(res);
  } catch (error) {
    console.error('Failed to download students PDF:', error.message);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
}

module.exports = {
  triggerScheduleGeneration,
  getScheduleStatus,
  getScheduleTimetable,
  listSchedules,
  downloadTimetablePdf,
  downloadStudentsPdf
};
