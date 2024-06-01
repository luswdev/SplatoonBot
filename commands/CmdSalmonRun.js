'use strict'

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { readFileSync } = require('fs')
const { basename } = require('path')

const CmdBase = require('commands/CmdBase.js')
const database = require('utils/Database.js')
const { findImg } = require('utils/ImgFinder.js')
const { rotation_api } = require('config.json')

class CmdSalmonRun extends CmdBase {

    constructor () {
        super('sr')

        this.dataPath = rotation_api.store_path.data
    }

    doCmd (_interaction) {
        const rotation = _interaction.options.getInteger('rotation') ?? 0
        const lang = this.locale2Lang(_interaction.locale) ?? 'en-US'
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
        const salmon = rotation.salmonRuns[_idx] ?? undefined
        const team = rotation.teamContests[0] ?? undefined  // always get idx 0
        return { salmon: salmon, team: team }
    }

    defaultEmbed (_lang, _interaction) {
        const match = database.getListObject('Match', 'Coop')
        const embed = new EmbedBuilder()
            .setColor(match.color)
            .setTitle(`${match.icon} ${match[_lang]}`)
            .setDescription(`No ${match[_lang]} now.`)
            .setFooter({ text: `Requested by ${_interaction.user.username}`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        return embed
    }

    getImage (_rotation) {
        let map, thumb
        if (_rotation.bigRun && _rotation.map !== 'Random') {
            map = database.getListObject('VSStage', _rotation.map)
            thumb = findImg('stage', _rotation.map)
        } else {
            map = database.getListObject('CoopStage', _rotation.map)
            thumb = findImg('coopStage', _rotation.map)
        }

        return {...map, thumb: thumb}
    }

    checkTeamContestInPeriod(_team, _salmon) {
        if (!_team || !_salmon) {
            return false
        }

        const teamEnd = new Date(_team.period.ends).getTime()
        const salmonStart = new Date(_salmon.period.start).getTime()

        return (teamEnd >= salmonStart)
    }

    doButton (_btn, _interaction) {
        const lang = _btn.lang
        const start = parseInt(_btn.res)
        const reply = this.buildMessage(lang, start, _interaction)
        return reply
    }

    buildEmbed(_rotation, _idx, _lang, _interaction) {
        const match = database.getListObject('Match', _rotation.match)
        let map = this.getImage(_rotation)
        let bossThumb = findImg('coopBoss', _rotation.boss)

        let weapons = ''
        for (let weapon of _rotation.weapons) {
            if (weapon.indexOf('Random') !== -1) {
                const weaponObj = database.getListObject('CoopWeapon', weapon)
                weapons += `${weaponObj.icon} ${weaponObj[_lang]}\n`
            } else {
                const weaponObj = database.getListObject('MainWeapon', weapon)
                weapons += `${weaponObj.icon} ${weaponObj[_lang]}\n`
            }
        }

        const start = new Date(_rotation.period.start).getTime() / 1000
        const ends = new Date(_rotation.period.ends).getTime() / 1000
        const embed = new EmbedBuilder()
            .setColor(match.color)
            .setTitle(`${match.icon} ${match[_lang]}`)
            .setDescription(`<t:${start}> ~ <t:${ends}> (<t:${ends}:R>)`)
            .addFields(
                { name: database.getListObject('Label', 'Weapon')[_lang], value: weapons },
                { name: database.getListObject('Label', 'Stage')[_lang], value: map[_lang] },
            )
            .setImage(`attachment://${basename(map.thumb)}`)
            .setFooter({ text: `/${this.cmdKey}.${_idx} (${_interaction.user.username})`, iconURL: _interaction.user.avatarURL()})
            .setTimestamp()

        if (bossThumb.indexOf('Unknown') === -1 && bossThumb.indexOf('Random') === -1) {
            embed.setThumbnail(`attachment://${basename(bossThumb)}`)
        }

        return embed
    }

    buildMessage (_lang, _rotation, _interaction) {
        const embeds = []
        const rotation = this.fetchRotation(_rotation)
        let thumb = []

        if (rotation.salmon) {
            thumb.push(this.getImage(rotation.salmon).thumb)
            embeds.push(this.buildEmbed(rotation.salmon, _rotation, _lang, _interaction))

            if (rotation.salmon.boss.indexOf('Unknown') === -1 && rotation.salmon.boss.indexOf('Random') === -1) {
                thumb.push(findImg('coopBoss', rotation.salmon.boss))
            }
        } else {
            embeds.push(this.defaultEmbed(_lang, _interaction))
        }

        if (rotation.team && this.checkTeamContestInPeriod(rotation.team, rotation.salmon)) {
            thumb.push(this.getImage(rotation.team).thumb)
            embeds.push(this.buildEmbed(rotation.team, _rotation, _lang, _interaction))
        }

        const langSelect = this.buildLangSelect({rotation: _rotation}, _lang)

        const btnNext =    {cmd: this.cmdKey, res: _rotation + 1, lang: _lang}
        const btnPrev =    {cmd: this.cmdKey, res: _rotation - 1, lang: _lang}
        const btnRefresh = {cmd: this.cmdKey, res: _rotation,     lang: _lang}
        const pager = new ActionRowBuilder()
            .addComponents( new ButtonBuilder()
                .setCustomId(JSON.stringify(btnPrev))
                .setEmoji('<:leftarrow:1127627896094212206>')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(_rotation === 0),
            )
            .addComponents( new ButtonBuilder()
                .setCustomId(JSON.stringify(btnRefresh))
                .setEmoji('<:reload:1127627899080544356>')
                .setStyle(ButtonStyle.Secondary),
            )
            .addComponents( new ButtonBuilder()
                .setCustomId(JSON.stringify(btnNext))
                .setEmoji('<:rightarrow:1127627892692627598>')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(_rotation === (this.options[0].max)),
            )

        const link = new ActionRowBuilder()
            .addComponents( new ButtonBuilder()
                .setURL('https://splatoon3.ink/salmonrun')
                .setLabel('Splatoon3.ink')
                .setStyle(ButtonStyle.Link)
                .setEmoji('<:splatoon3ink:1128347285403734126>'),
            )

        return { embeds: embeds, components: [langSelect, pager, link], files: thumb }
    }
}

module.exports = CmdSalmonRun
