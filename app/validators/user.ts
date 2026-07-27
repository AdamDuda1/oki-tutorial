import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password().confirmed({
    confirmationField: 'passwordConfirmation',
  }),
})

/**
 * Validator for a user editing their own profile. The email uniqueness
 * check excludes the current user (passed via `meta.userId`) so keeping
 * the same email is not flagged as taken.
 */
export const updateProfileValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique(async (db, value, field) => {
    const row = await db
      .from('users')
      .whereNot('id', field.meta.userId)
      .where('email', value)
      .first()
    return !row
  }),
})
