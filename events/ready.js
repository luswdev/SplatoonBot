const { ActivityType, Collection } = require('discord.js')

const Hook = require('../hook/Hook.js')

const { splatoon3InkScheduler } = require('../pkg/Splatoon3Ink.js')
const BotInfo = require('../pkg/BotInfo.js')
const { log } = require('../pkg/Log.js')

module.exports = async (_client) => {
    log.write('bot ready')
    _client.user.setActivity('Splatoon 3', { type: ActivityType.Playing })

    const hooks = new Hook()
    hooks.connect()

    splatoon3InkScheduler()

    _client.commands = new Collection()
    _client.commands = await _client.application.commands.fetch()

    _client.startTimestamp = Date.now()
    _client.botInfo = new BotInfo(_client)

    _client.botInfo.update()
    _client.botInfo.schedule()
}