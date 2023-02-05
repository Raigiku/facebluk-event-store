import { Common } from '@facebluk/infra-common'
import { EventStore } from '@facebluk/infra-event-store'
import { MessageBroker } from '@facebluk/infra-message-broker'
import { UserAuth } from '@facebluk/infra-user-auth'
import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    msgBrokerConn: MessageBroker.amqp.Connection
    eventStoreConn: EventStore.pg.Pool
    userAuthConn: UserAuth.SupabaseClient
    commonConfig: Common.Config.Data
  }

  interface FastifyRequest {
    msgBrokerChannel: MessageBroker.amqp.Channel
  }
}

const msgBrokerConnPlugin: FastifyPluginCallback = async (fastify, options, done) => {
  const config = MessageBroker.Config.newA()
  const connection = await MessageBroker.amqp.connect(config.connectionString)

  fastify.addHook('onClose', async () => {
    await connection.close()
  })

  fastify.addHook('preHandler', async (request) => {
    request.msgBrokerChannel = await connection.createChannel()
  })

  fastify.addHook('onSend', async (request) => {
    if (request.msgBrokerChannel === undefined) {
      request.msgBrokerChannel = await connection.createChannel()
    }
    await request.msgBrokerChannel.close()
  })
  done()
}
export const fastifyMsgBrokerConn = fp(msgBrokerConnPlugin, {
  name: 'fastify-msg-broker-conn',
})

const eventStoreConnPlugin: FastifyPluginCallback = (fastify, options, done) => {
  if (!fastify.eventStoreConn) {
    const config = EventStore.Config.newA()

    fastify.decorate('eventStoreConn', new EventStore.pg.Pool(config))

    fastify.addHook('onClose', async () => {
      await fastify.eventStoreConn.end()
    })
  }
  done()
}
export const fastifyEventStoreConn = fp(eventStoreConnPlugin, {
  name: 'fastify-event-store-conn',
})

const userAuthConnPlugin: FastifyPluginCallback = (fastify, options, done) => {
  if (!fastify.userAuthConn) {
    const config = UserAuth.Config.newA()
    fastify.decorate('userAuthConn', UserAuth.createSupabaseClient(config))
  }
  done()
}
export const fastifyUserAuthConn = fp(userAuthConnPlugin, {
  name: 'fastify-user-auth-conn',
})

const commonConfigPlugin: FastifyPluginCallback<Common.Config.Data> = (fastify, options, done) => {
  if (!fastify.commonConfig) {
    fastify.decorate('commonConfig', options)
  }
  done()
}
export const fastifyCommonConfig = fp(commonConfigPlugin, {
  name: 'fastify-common-config',
})
