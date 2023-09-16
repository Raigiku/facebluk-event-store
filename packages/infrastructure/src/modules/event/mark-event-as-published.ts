import { PoolClient } from "pg"
import { determineTableName, eventTableKey } from "."
import { Event } from '@facebluk/domain'

export const markEventPublished = async (pgClient: PoolClient, event: Event.AnyEvent) => {
  await pgClient.query(
    `
    UPDATE ${determineTableName(event)}
    SET ${eventTableKey('published')} = true
    WHERE ${eventTableKey('aggregate_id')} = $1 AND
      ${eventTableKey('aggregate_version')} = $2
  `,
    [event.data.aggregateId, event.data.aggregateVersion]
  )
}
