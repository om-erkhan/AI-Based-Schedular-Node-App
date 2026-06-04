const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  // Log queries during development for better visibility
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

module.exports = prisma;
