import { ES } from '@facebluk/domain'
import { Pool } from 'pg'
import { eventTableKey, FriendRequest, Post, User, UserRelationship } from '.'

const determineTableName = (event: ES.Event.AnyEvent) =>
  event.payload.tag.includes('post')
    ? Post.TABLE_NAME
    : event.payload.tag.includes('friend-request')
    ? FriendRequest.TABLE_NAME
    : event.payload.tag.includes('user-relationship')
    ? UserRelationship.TABLE_NAME
    : event.payload.tag.includes('user')
    ? User.TABLE_NAME
    : (() => {
        throw new Error('undefined table')
      })()

export const persistEvent =
  (pool: Pool): ES.Event.FnPersistEvent =>
  async (event: ES.Event.AnyEvent) => {
    const tableName = determineTableName(event)
    await pool.query(
      `
      INSERT INTO ${tableName} (
        ${eventTableKey('aggregate_id')},
        ${eventTableKey('aggregate_version')},
        ${eventTableKey('created_at')},
        ${eventTableKey('published')},
        ${eventTableKey('payload')}
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        event.data.aggregateId,
        event.data.aggregateVersion,
        event.data.createdAt,
        event.data.published,
        event.payload,
      ]
    )
  }

export const persistEvents =
  (pool: Pool): ES.Event.FnPersistEvents =>
  async (events: ES.Event.AnyEvent[]) => {
    try {
      await pool.query('BEGIN')
      for (const event of events) {
        const tableName = determineTableName(event)
        await pool.query(
          `
          INSERT INTO ${tableName} (
            ${eventTableKey('aggregate_id')},
            ${eventTableKey('aggregate_version')},
            ${eventTableKey('created_at')},
            ${eventTableKey('published')},
            ${eventTableKey('payload')}
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
          [
            event.data.aggregateId,
            event.data.aggregateVersion,
            event.data.createdAt,
            event.data.published,
            event.payload,
          ]
        )
      }
      await pool.query('COMMIT')
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }

export const markEventAsSent =
  (pool: Pool): ES.Event.FnMarkEventAsSent =>
  async (event: ES.Event.AnyEvent) => {
    const tableName = determineTableName(event)
    await pool.query(
      `
      UPDATE ${tableName}
      SET ${eventTableKey('published')} = true
      WHERE ${eventTableKey('aggregate_id')} = $1 AND
        ${eventTableKey('aggregate_version')} = $2
    `,
      [event.data.aggregateId, event.data.aggregateVersion]
    )
  }
