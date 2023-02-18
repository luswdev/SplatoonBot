'use strict'

const { Client, GatewayIntentBits } = require('discord.js')
const { readdirSync } = require('fs')
const { join } = require('path')

const { bot } = require('./config.json')
const CmdList = require('./cmds/CmdList.js')

const { log } = require('./pkg/Log.js')
const depolyCmd = require('./pkg/deployCmds.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.events = readdirSync(join(__dirname, "./events"))
client.events.forEach( (event) => {
    const eventModule = require(`./events/${event}`);

    if (typeof eventModule !== "function") {
        log.write(`bad event: ${event}, skipped`)
        return
    }

    client.on(event.split(".")[0], (...args) => eventModule(client, ...args))
    log.write(`installed event: ${event}`)
})

client.cmdList = new CmdList()
const supports = readdirSync(join(__dirname, "./cmds"))
supports.forEach( (cmd) => {
    if (cmd === 'CmdList.js' || cmd === 'CmdBase.js' || cmd.indexOf('.json') !== -1) {
        return
    }

    const cmdModule = require(`./cmds/${cmd}`);

    if (typeof cmdModule !== "function") {
        log.write(`bad command: ${cmd}, skipped`)
        return
    }

    const cmdClass = new cmdModule()
    client.cmdList.installCmd(cmdClass)
})

depolyCmd(client.cmdList.cmdsBuilder.map(command => command.toJSON()))

client.login(bot.token)
