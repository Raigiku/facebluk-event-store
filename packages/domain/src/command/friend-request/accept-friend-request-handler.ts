import Joi from 'joi'
import { BusinessRuleError, ES, INT, Uuid } from '../../modules'

export const handle = async (req: Request, deps: Dependencies) => {
  validator.validate(req)

  const friendRequest = await deps.es_findFriendRequest(req.friendRequestId)
  if (friendRequest === undefined)
    throw new BusinessRuleError(req.id, 'the friend request does not exist')

  if (!ES.FriendRequest.isPending(friendRequest))
    throw new BusinessRuleError(req.id, 'the friend request is not pending')

  if (friendRequest.toUserId !== req.userId)
    throw new BusinessRuleError(req.id, 'the user is not the receiver of the friend request')

  const userRelationship = await deps.es_findUserRelationshipBetween(
    friendRequest.fromUserId,
    friendRequest.toUserId
  )

  const isNewFriendRelationship = userRelationship === undefined
  const [, acceptedFriendRequestEvent] = ES.FriendRequest.accept(friendRequest)
  const [, friendedRelationshipEvent] = isNewFriendRelationship
    ? ES.UserRelationship.newFriend(friendRequest.fromUserId, friendRequest.toUserId)
    : ES.UserRelationship.friend(userRelationship, friendRequest.fromUserId, friendRequest.toUserId)

  await deps.es_transaction(async () => {
    await deps.es_acceptFriendRequest(acceptedFriendRequestEvent)
    await deps.es_friendUser(isNewFriendRelationship, friendedRelationshipEvent)
  })
  await deps.int_processEvents(
    req.id,
    [acceptedFriendRequestEvent, friendedRelationshipEvent],
    req.userId
  )
}

export type Dependencies = {
  es_findFriendRequest: ES.FriendRequest.FnFindOneById
  es_findUserRelationshipBetween: ES.UserRelationship.FnFindOneBetweenUsers
  es_acceptFriendRequest: ES.FriendRequest.FnAccept
  es_friendUser: ES.UserRelationship.FnFriend
  es_transaction: ES.FnTransaction

  int_processEvents: INT.Event.FnProcessEvents
}

export type Request = {
  readonly id: string
  readonly userId: string
  readonly friendRequestId: string
}

export const validator = Joi.object<Request, true>({
  id: Uuid.validator.required(),
  userId: Uuid.validator.required(),
  friendRequestId: Uuid.validator.required(),
})
