'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { readFileSync } = require('fs')

const CmdBase = require('commands/CmdBase.js')
const database = require('data/Database.js')

class CmdRotation extends CmdBase {

    constructor () {
        super('evt')

        this.imgPath = '/tmp/spl3/img/'
        this.dataPath = '/tmp/spl3/rotation.json'
    }

    doCmd (_interaction) {
        const rotation = _interaction.options.getInteger('rotation') ?? 0
        const lang = this.locale2Lang(_interaction.locale) ?? 'en'
        const reply = this.buildMessage(lang, rotation, _interaction)
        return reply
    }

    doSelect (_option, _interaction) {
        const rotation = _option.rotation
        const reply = this.buildMessage(_option.lang, rotation, _interaction)
        return reply
    }

    fetchRotation (_idx) {
        const rotationStr = readFileSync(this.dataPath, {encoding:'utf8', flag:'r'})
        const rotation = JSON.parse(rotationStr)
        return rotation.events[_idx]
    }

    defaultEmbed (_lang, _interaction) {
        const match = database.getListObject('Challenge', 'matches')
        const embed = new EmbedBuilder()
            .setColor(match.color)
            .setTitle(`${match.icon} ${match[_lang]}`)
            .setDescription(`No ${match[_lang]} now.`)
            .setFooter({ text: `Requested by ${_interaction.user.username}`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        return embed
    }

    buildEmbed(_rotation, _idx, _lang, _interaction) {
        const mode =  database.getListObject(_rotation.mode,     'modes')
        const match = database.getListObject(_rotation.match,    'matches')
        const rule = database.getListObject(_rotation.rule,      'rules')
        const desc = database.getListObject(_rotation.rule_desc, 'rule_descriptions')
        const map1 =  database.getListObject(_rotation.maps[0],  'maps')
        const map2 =  database.getListObject(_rotation.maps[1],  'maps')

        let periodString = ''
        for (let period of _rotation.periods) {
            const start = new Date(period.start).getTime() / 1000
            const ends = new Date(period.ends).getTime() / 1000

            periodString += `<t:${start}> ~ <t:${ends}> (<t:${ends}:R>)\n`
        }

        const timeLable = database.getListObject('Time', 'labels')
        const embed = new EmbedBuilder()
            .setColor(match.color)
            .setTitle(`${match.icon} ${rule[_lang]}`)
            .setDescription(desc[_lang])
            .addFields(
                {
                    name: `${mode.icon} ${mode[_lang]}`,
                    value: `${map1[_lang]} :arrow_left: :arrow_right: ${map2[_lang]}\n`
                },
                {
                    name: `${timeLable[_lang]}`,
                    value: periodString
                },
            )
            .setImage(`attachment://${match.en.replaceAll(' ', '_').replaceAll('(', '').replaceAll(')', '')}_${_idx}.png`)
            .setFooter({ text: `Requested by ${_interaction.user.username}`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        return embed
    }

    buildMessage (_lang, _rotation, _interaction) {
        const embeds = []
        const attachments = []
        const rotation = this.fetchRotation(_rotation)

        if (rotation) {
            embeds.push(this.buildEmbed(rotation, _rotation, _lang, _interaction))
            attachments.push(`${this.imgPath}${rotation.match}_${_rotation}.png`)
        } else {
            embeds.push(this.defaultEmbed(_lang, _interaction))
        }

        const row = this.buildLangSelect({rotation: _rotation}, _lang)

        const link = new ActionRowBuilder()
            .addComponents( new ButtonBuilder()
                .setURL('https://splatoon3.ink')
                .setLabel('More Information')
                .setStyle(ButtonStyle.Link)
                .setEmoji('<:squidgreen:568201618974048279>'),
            )

        return { embeds: embeds, components: [row, link], files: attachments }
    }
}

module.exports = CmdRotation
