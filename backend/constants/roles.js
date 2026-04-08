/**
 * ROLES — single source of truth for all user role strings.
 *
 * Import this file anywhere a role string is needed:
 *   const ROLES = require('../constants/roles');
 *
 * Use ROLES.PATIENT, ROLES.NURSE, ROLES.ADMIN, ROLES.CARE_ASSISTANT
 * instead of bare string literals.
 *
 * The underlying values are never changed here — they must stay
 * identical to what is stored in MongoDB.
 */
const ROLES = {
  PATIENT:        'patient',
  NURSE:          'nurse',
  ADMIN:          'admin',
  CARE_ASSISTANT: 'care_assistant',
};

module.exports = ROLES;
