import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DateTime } from 'luxon'

export const USER_ROLES = ['user', 'editor1', 'editor2', 'admin'] as const

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
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
