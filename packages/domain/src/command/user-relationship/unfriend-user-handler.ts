import { BusinessRuleError, ES, INT, UA, Uuid } from '../../modules'

export const handle = async (req: Request, deps: Dependencies) => {
  validateInputFields(req)

  const toUser = await deps.findUserById(req.toUserId)
  if (toUser === undefined) throw new BusinessRuleError(req.id, 'the to user does not exist')

  const userRelationship = await deps.findUserRelationshipBetween(req.userId, toUser.id)
  if (userRelationship?.friendStatus.tag !== 'friended')
    throw new BusinessRuleError(req.id, 'the users are not friends')

  const [, unfriendedEvent] = ES.UserRelationship.unfriend(
    userRelationship,
    req.userId,
    req.toUserId
  )

  await deps.processEvent(req.id, unfriendedEvent)
}

const validateInputFields = (req: Request) => {
  Uuid.validate(req.id, req.userId, 'userId')
  Uuid.validate(req.id, req.toUserId, 'toUserId')
}

export type Dependencies = {
  findUserRelationshipBetween: ES.UserRelationship.FnFindOneBetweenUsers
  findUserById: UA.User.FnFindOneById
  processEvent: INT.Event.FnProcessEvent
}

export type Request = {
  readonly id: string
  readonly userId: string
  readonly toUserId: string
}
