'use strict'

const child_process = require('child_process')

const { ActivityType, Collection } = require('discord.js')
const EvtBase = require('events/EvtBase')

const { bot, hook, hook_github, rotation_api } = require('config.json')

const Hook = require('hook/Hook.js')

const BotInfo = require('utils/BotInfo.js')
const { log } = require('utils/Log.js')
const ErrorHandler = require('../utils/ErrorHandler')
const Analytics = require('utils/Analytics.js')
const RotationAncmt = require('utils/RotationAncmt.js')

class EvtReady extends EvtBase {

    constructor () {
        super('ready')
    }

    async eventCallback (_client) {
        _client.errHandler = new ErrorHandler(_client, bot.debug)

        _client.user.setActivity('Splatoon 3', { type: ActivityType.Playing })

        if (hook && hook_github) {
            _client.hooks = new Hook()
            _client.hooks.connect()
        }

        // run splatoon3.ink scheduler in child thread
        child_process.fork('workers/WkrSplatoon3Ink.js')

        _client.commands = new Collection()
        _client.commands = await _client.application.commands.fetch()

        if (bot.debug) {
            _client.startTimestamp = Date.now()
            _client.botInfo = new BotInfo(_client)

            _client.botInfo.update()
            _client.botInfo.schedule()

            _client.analytics = new Analytics(_client, bot.debug)
            _client.analytics.report()
            _client.analytics.schedule()
        }

        if (rotation_api.announcement) {
            _client.reporter = new RotationAncmt(_client, rotation_api.announcement)
            _client.reporter.schedule()
        }

        log.write('bot ready')
    }
}

module.exports = EvtReady
