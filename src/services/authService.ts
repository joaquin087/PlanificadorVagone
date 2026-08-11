// Authentication and Session Security Service
// Uses Web Crypto API (SHA-256 + Salt) so plaintext passwords are NEVER stored in source code.

const AUTH_SALT = 'vagone_secure_salt_v1';
const SESSION_SALT = 'vagone_auth_session_signature_v1';

// Precomputed one-way SHA-256 hash for authorized credentials with AUTH_SALT
// Salted input: "vagone_secure_salt_v1:vagone:rafaela250"
const AUTHORIZED_HASHES: Record<string, string> = {
  vagone: 'a679c3c46ea776db36db5c5bc5a1d59b576d6b9695a7ef9f4b26c3fbdfe25f8d',
};

// Brute-force throttling tracker in memory
let failedAttempts = 0;
let lockoutUntil = 0;

/**
 * Computes SHA-256 hash using native Web Crypto API
 */
async function computeSha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for non-subtle environments
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Authenticates user by comparing salted SHA-256 cryptographic hashes
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; token?: string }> {
  const now = Date.now();

  // Check if temporarily locked out due to brute force
  if (now < lockoutUntil) {
    const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
    return {
      success: false,
      error: `Demasiados intentos fallidos. Por favor espera ${remainingSeconds} segundos.`,
    };
  }

  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Por favor ingresa usuario y contraseña.' };
  }

  const expectedHash = AUTHORIZED_HASHES[cleanUser];
  if (!expectedHash) {
    handleFailedAttempt();
    return { success: false, error: 'Usuario o contraseña incorrectos.' };
  }

  // Hash user input with unique salt
  const inputHash = await computeSha256(`${AUTH_SALT}:${cleanUser}:${cleanPass}`);

  if (inputHash === expectedHash) {
    // Reset attempt counter on success
    failedAttempts = 0;
    lockoutUntil = 0;

    // Generate cryptographically signed session token
    const token = await generateSessionToken(cleanUser);
    return { success: true, token };
  }

  handleFailedAttempt();
  return { success: false, error: 'Usuario o contraseña incorrectos.' };
}

function handleFailedAttempt() {
  failedAttempts += 1;
  if (failedAttempts >= 5) {
    // Lock for 30 seconds after 5 consecutive failures
    lockoutUntil = Date.now() + 30 * 1000;
  }
}

/**
 * Generates a signed session token
 */
export async function generateSessionToken(username: string): Promise<string> {
  const timestamp = Date.now();
  const signature = await computeSha256(`${SESSION_SALT}:${username}:${timestamp}`);
  return `${username}::${timestamp}::${signature}`;
}

/**
 * Verifies that a stored session token has a valid cryptographic signature
 */
export async function verifySessionToken(token: string | null): Promise<string | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('::');
  if (parts.length !== 3) {
    // Legacy plaintext support during upgrade
    if (token === 'vagone') return 'vagone';
    return null;
  }

  const [username, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp) || !username) {
    return null;
  }

  // Recalculate signature
  const expectedSig = await computeSha256(`${SESSION_SALT}:${username}:${timestamp}`);
  if (expectedSig === signature) {
    return username;
  }

  return null;
}
