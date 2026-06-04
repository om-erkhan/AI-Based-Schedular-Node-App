const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');

async function register(req, res) {
  try {
    const { username, email, password, firstName, lastName, isStaff, isSuperuser } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.auth_user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.auth_user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        first_name: firstName || '',
        last_name: lastName || '',
        is_superuser: !!isSuperuser,
        is_staff: !!isStaff,
        is_active: true,
        date_joined: new Date()
      }
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isSuperuser: newUser.is_superuser,
        isStaff: newUser.is_staff
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.auth_user.findUnique({
      where: { username }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    await prisma.auth_user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'supersecretjwtkeyforexamscheduling',
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isSuperuser: user.is_superuser,
        isStaff: user.is_staff
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

module.exports = {
  register,
  login
};
