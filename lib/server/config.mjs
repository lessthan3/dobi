 

const {
  DOBI_DEBUG,
  DOBI_ENABLE_DEV_ROUTES,
  DOBI_STRIP_SENSITIVE_CONFIG,
  DOBI_VERBOSE_ERRORS,
  DOBI_USE_COMPRESSION,
  HOME,
  HOMEPATH,
  USERPROFILE,
} = process.env;

export const USER_HOME = HOME || HOMEPATH || USERPROFILE;
export const USER_CONNECT_PATH = `${USER_HOME}/.dobi_connect`;

// Settings - all explicitly controlled via environment variables
export { DOBI_DEBUG };

// Enable dev-only routes like /connect, /partial (default: true)
export const ENABLE_DEV_ROUTES = DOBI_ENABLE_DEV_ROUTES !== 'false';

// Strip sensitive config like author, changelog (default: false)
export const STRIP_SENSITIVE_CONFIG = DOBI_STRIP_SENSITIVE_CONFIG === 'true';

// Show verbose error messages with file paths (default: true)
export const VERBOSE_ERRORS = DOBI_VERBOSE_ERRORS !== 'false';

// Use compression for JS/CSS output (default: false, enable for production)
export const USE_COMPRESSION = DOBI_USE_COMPRESSION === 'true';
