export * from './alias-exists'
export * from './find-auth-metadata'
export * from './find-one-by-id'
export * from './mark-as-registered'
export * from './register'
export * from './update-info'

import { User } from '@facebluk/domain'

// postgresql
export const eventTableName = 'user_event'
export const userTableName = '"user"'
export type UserTable = {
  readonly id: string
  readonly version: bigint
  readonly created_at: Date
  readonly alias: string
  readonly name: string
  readonly profile_picture_url: string | null
}
export const userTableKey = (k: keyof UserTable) => k
export const userTableToAggregate = (row: UserTable): User.Aggregate => ({
  aggregate: { id: row.id, version: row.version, createdAt: row.created_at },
  alias: row.alias,
  name: row.name,
  profilePictureUrl: row.profile_picture_url ?? undefined,
})

// supabase
export const bucketNames = {
  userProfilePicture: 'user-profile-picture',
}
export type JwtModel = {
  aud: string
  exp: number
  sub: string
  email: string
  phone: string
  app_metadata: {
    provider: string
    providers: string[]
  }
  user_metadata: {
    avatar_url: string
    email: string
    email_verified: boolean
    full_name: string
    iss: string
    name: string
    picture: string
    provider_id: string
    sub: string
    registeredAt?: Date
  }
  role: string
  aal: string
  amr: {
    method: string
    timestamp: number
  }[]
  session_id: string
}
