import { ES } from '@facebluk/domain'
import { Pool } from 'pg'
import { registerEvent } from '../common'

export const eventTableName = 'user_event'
export const userTableName = 'user'

export const aliasExists =
  (pool: Pool): ES.User.FnAliasExists =>
  async (alias: string) => {
    const { rows } = await pool.query(
      `
      SELECT 1
      FROM ${userTableName} u
      WHERE u.${userTableKey('alias')} = $1
      `,
      [alias]
    )
    return rows.length !== 0
  }

export const findOneById =
  (pool: Pool): ES.User.FnFindOneById =>
  async (userId: string) => {
    const { rows } = await pool.query<UserTable>(
      `
      SELECT *
      FROM ${userTableName} u
      WHERE u.${userTableKey('id')} = $1
      `,
      [userId]
    )
    if (rows.length === 0) return undefined
    return userTableToAggregate(rows[0])
  }

export const register =
  (pool: Pool): ES.User.FnRegister =>
  async (user: ES.User.Aggregate, event: ES.User.RegisteredUserEvent) => {
    try {
      await pool.query('BEGIN')
      await pool.query(
        `
          INSERT INTO ${userTableName} (
            ${userTableKey('id')},
            ${userTableKey('version')},
            ${userTableKey('created_at')},
            ${userTableKey('alias')},
            ${userTableKey('name')},
            ${userTableKey('profile_picture_url')}
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          user.aggregate.id,
          user.aggregate.version,
          user.aggregate.createdAt,
          user.alias,
          user.name,
          user.profilePictureUrl,
        ]
      )
      await registerEvent(pool, eventTableName, event)
      await pool.query('COMMIT')
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }

type UserTable = {
  readonly id: string
  readonly version: bigint
  readonly created_at: Date
  readonly alias: string
  readonly name: string
  readonly profile_picture_url?: string
}

const userTableKey = (k: keyof UserTable) => k

const userTableToAggregate = (row: UserTable): ES.User.Aggregate => ({
  aggregate: { id: row.id, version: row.version, createdAt: row.created_at },
  alias: row.alias,
  name: row.name,
  profilePictureUrl: row.profile_picture_url,
})
