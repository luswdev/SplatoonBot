const { db } = require('../config.json')

const { log } = require('../pkg/Log.js')
const ConnDB = require('../pkg/ConnDB.js')

const mysql = new ConnDB(db)

module.exports = async (_client, _interaction) => {
    log.write(`get interaction from: ${_interaction.user.username ?? ''}, type: ${_interaction.type}`)

    if (_interaction.isChatInputCommand()) {
        const { commandName } = _interaction

        log.write(`parsing command: ${commandName}`)
        mysql.saveInteraction(commandName, _interaction.user.id, _interaction.type)

        await _interaction.deferReply()

        let reply = _client.cmdList.parseCmd(commandName, _interaction, _client)
        await _interaction.editReply(reply)

        log.write(`end of ${commandName}`)
    } else if (_interaction.isStringSelectMenu()) {
        const selected = JSON.parse(_interaction.values[0])

        log.write(`command ${selected.cmd} call select: ${JSON.stringify(selected)}`)
        mysql.saveInteraction(selected.cmd, _interaction.user.id, _interaction.type)

        if (selected.cmd === 'help') {
            await _interaction.deferReply( { ephemeral: true } )
        } else {
            await _interaction.deferUpdate()
        }

        let reply = _client.cmdList.parseSelect(selected, _interaction, _client)

        await _interaction.editReply(reply)

        log.write(`end of ${selected.cmd}`)
    }
}