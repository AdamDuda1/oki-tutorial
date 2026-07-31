import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import encryption from '@adonisjs/core/services/encryption'
import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DateTime } from 'luxon'

export const USER_ROLES = ['user', 'editor1', 'editor2', 'admin'] as const

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @column({ serializeAs: null })
  declare szkopulToken: string | null

  get szkopulPolaczony() {
    return Boolean(this.szkopulToken)
  }

  get szkopulTokenJawny(): string | null {
    if (!this.szkopulToken) return null
    try {
      return encryption.decrypt<string>(this.szkopulToken)
    } catch {
      return null
    }
  }

  polaczSzkopul(token: string, username: string | null) {
    this.szkopulToken = encryption.encrypt(token)
    this.szkopulUsername = username
  }

  rozlaczSzkopul() {
    this.szkopulToken = null
    this.szkopulUsername = null
  }

  async recordLogin() {
    this.lastLoginAt = DateTime.now()
    await this.save()
  }

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }

  get isAdmin() {
    return this.role === 'admin'
  }

  get isEditor1() {
    return this.role === 'editor1'
  }

  get isEditor2() {
    return this.role === 'editor2'
  }

  get canAccessAdmin() {
    return this.isAdmin || this.isEditor1 || this.isEditor2
  }

  get canEditAllContent() {
    return this.isAdmin || this.isEditor2
  }
}
