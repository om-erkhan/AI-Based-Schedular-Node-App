const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Verify a password against a hash (supports bcrypt and Django's pbkdf2_sha256).
 */
async function verifyPassword(password, hash) {
  if (!hash) return false;
  
  if (hash.startsWith('pbkdf2_sha256$')) {
    try {
      const parts = hash.split('$');
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const key = parts[3];
      
      return new Promise((resolve, reject) => {
        // Django's pbkdf2_sha256 uses the password, salt, and iterations to produce a 32-byte key
        crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, derivedKey) => {
          if (err) return reject(err);
          const derivedKeyBase64 = derivedKey.toString('base64');
          resolve(derivedKeyBase64 === key);
        });
      });
    } catch (error) {
      console.error('Django password verification error:', error);
      return false;
    }
  }
  
  // Fall back to bcrypt for Node.js-registered accounts
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Bcrypt password verification error:', error);
    return false;
  }
}

/**
 * Hash a password using bcrypt.
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

module.exports = {
  verifyPassword,
  hashPassword,
};
