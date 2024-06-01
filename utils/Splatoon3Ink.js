'use strict'

const schedule = require('node-schedule')
const axios = require('axios')
const { mkdirSync, writeFileSync, createWriteStream } = require('fs')
const { createCanvas, loadImage } = require('canvas')
const looksSame = require('looks-same')

const database = require('utils/Database.js')
const { log } = require('utils/Log.js')
const { findImg } = require('utils/ImgFinder.js')
const { rotation_api } = require('config.json')

class Splatoon3Ink {

    constructor () {
        this.apiBase = rotation_api.url.base
        this.dataOut = rotation_api.store_path.data
        this.imgOut = rotation_api.store_path.image
        this.imgSrc = `${__dirname}/../img/map/`
        this.rotationData = undefined
        this.salmonType = Object.freeze({ 'salmonRun': 'Coop', 'bigRun': 'CoopBigRun', 'teamContest': 'CoopTeamContest' })

        mkdirSync(this.imgOut, { recursive: true })
    }

    async fetchRotation (_rotation) {
        try {
            const url = rotation_api.url.path
            log.write('fetching', this.apiBase + url)

            const res = await axios.get(`${this.apiBase}${url}`)
            this.rotationData = res.data.data
        } catch (err) {
            log.write('fetching failed:', err)
        }
    }

    async parseBattle (_idx) {
        let rotation = []

        const isFest = this.rotationData.regularSchedules.nodes[_idx].festMatchSettings != null
        const matchObject = [
            isFest ? undefined : this.rotationData.regularSchedules.nodes[_idx].regularMatchSetting,
            isFest ? undefined : this.rotationData.bankaraSchedules.nodes[_idx].bankaraMatchSettings[0],
            isFest ? undefined : this.rotationData.bankaraSchedules.nodes[_idx].bankaraMatchSettings[1],
            isFest ? undefined : this.rotationData.xSchedules.nodes[_idx].xMatchSetting,
            isFest ? this.rotationData.festSchedules.nodes[_idx].festMatchSettings[0] : undefined,
            isFest ? this.rotationData.festSchedules.nodes[_idx].festMatchSettings[1] : undefined,
        ]

        const matchName = [
            'Regular',
            'Bankara',
            'BankaraOpen',
            'XMatch',
            'FestChallenge',
            'FestRegular'
        ]

        const period = {
            start: this.rotationData.xSchedules.nodes[_idx].startTime,
            ends:  this.rotationData.xSchedules.nodes[_idx].endTime
        }

        for (let i = 0; i < matchObject.length; ++i) {
            let maps = [], mode
            if (matchObject[i] === undefined) {
                maps = [ undefined, undefined ]
                mode = undefined
            } else {
                maps[0] = database.getListKey('VSStage', matchObject[i].vsStages[0].name)
                maps[1] = database.getListKey('VSStage', matchObject[i].vsStages[1].name)
                mode = database.getListKey('VSRule',matchObject[i].vsRule.name)

                await this.createImg(maps, matchName[i], _idx)
            }

            rotation.push({
                match: matchName[i],
                period: period,
                maps: maps,
                mode: mode
            })
        }

        return rotation
    }

    async parseEvent (_idx) {
        const eventSchedules = this.rotationData.eventSchedules.nodes[_idx]

        let maps = [
            eventSchedules.leagueMatchSetting.vsStages[0] ? database.getListKey('VSStage', eventSchedules.leagueMatchSetting.vsStages[0].name) : "???",
            eventSchedules.leagueMatchSetting.vsStages[1] ? database.getListKey('VSStage', eventSchedules.leagueMatchSetting.vsStages[1].name) : "???",
        ]

        let mode = eventSchedules.leagueMatchSetting.vsRule ? database.getListKey('VSRule', eventSchedules.leagueMatchSetting.vsRule.name) : "???"
        let rule = eventSchedules.leagueMatchSetting.leagueMatchEvent ? database.getListKey('EventMatch', eventSchedules.leagueMatchSetting.leagueMatchEvent.name) : "???"
        if (rule.indexOf('_Title') !== -1) {
            rule = rule.replace('_Title', '')
        }

        await this.createImg(maps, 'League', _idx)

        let periods = []
        for (let period of eventSchedules.timePeriods) {
            periods.push({
                start: period.startTime,
                ends:  period.endTime
            })
        }

        let rotation = {
            match: 'League',
            periods: periods,
            maps: maps,
            mode: mode,
            rule: rule
        }

        return rotation
    }

    async createImg (_maps, _match, _idx) {
        const imgOutPath = `${this.imgOut}${_match}_${_idx}.png`

        const imgPerSize = 500
        const canvas = createCanvas(imgPerSize * 2, imgPerSize)
        const ctx = canvas.getContext('2d')

        const map1Img = await loadImage(findImg('stage', _maps[0]))
        const map2Img = await loadImage(findImg('stage', _maps[1]))

        const padW = 15
        const innerImgW = imgPerSize - padW / 2
        const innerImgH = imgPerSize

        ctx.drawImage(map1Img, (map1Img.width - map1Img.height) / 2, 0, map1Img.height, map1Img.height, 0, 0, innerImgW, innerImgH)
        ctx.drawImage(map2Img, (map2Img.width - map2Img.height) / 2, 0, map2Img.height, map2Img.height, imgPerSize + padW / 2, 0, innerImgW, innerImgH)

        writeFileSync(imgOutPath, canvas.toBuffer())
    }

    async downloadImg (_url, _path) {
        const res = await axios.get(_url, {responseType: 'stream'})
        return new Promise(resolve => {
            let stm = createWriteStream(_path)
            res.data.pipe(stm)
            stm.on('finish', resolve)
        })
    }

    async parseSalmonRun (_type, _set) {
        const period = {
            start: _set.startTime,
            ends:  _set.endTime
        }

        let weapons = []
        for (let weapon of _set.setting.weapons) {
            if (weapon.name.indexOf('Random') !== -1) {
                const tmpImgPath = `${this.imgOut}${weapon.__splatoon3ink_id}.png`
                await this.downloadImg(weapon.image.url, tmpImgPath)

                const comp = await looksSame(findImg('coopWeapon', 'Random_Bear_Coop'), tmpImgPath)
                weapons.push(`Random_${comp.equal ? 'Bear_' : ''}Coop`) // Random_Coop or Random_Bear_Coop
            } else {
                weapons.push(database.getListKey('MainWeapon', weapon.name))
            }
        }

        let map
        if (_type === this.salmonType.bigRun && _set.setting.coopStage.name !== 'Multiple Sites') {
            map = database.getListKey('VSStage', _set.setting.coopStage.name)
        } else {
            map = database.getListKey('CoopStage', _set.setting.coopStage.name)
        }

        let rotation = {
            match: _type,
            bigRun: _type == this.salmonType.bigRun,
            period: period,
            map: map,
            boss: _set.__splatoon3ink_king_salmonid_guess,
            weapons: weapons
        }

        return rotation
    }

    async buildRotations () {
        await this.fetchRotation()

        let battles = []
        for (let i = 0; i < this.rotationData.regularSchedules.nodes.length; ++i) {
            battles.push(await this.parseBattle(i))
        }

        let events = []
        for (let i = 0; i < this.rotationData.eventSchedules.nodes.length; ++i) {
            events.push(await this.parseEvent(i))
        }

        let salmonRuns = []
        for (let set of this.rotationData.coopGroupingSchedule.regularSchedules.nodes) {
            salmonRuns.push(await this.parseSalmonRun(this.salmonType.salmonRun, set))
        }

        for (let set of this.rotationData.coopGroupingSchedule.bigRunSchedules.nodes) {
            salmonRuns.push(await this.parseSalmonRun(this.salmonType.bigRun, set))
        }

        salmonRuns.sort((r1, r2) => new Date(r1.period.start) - new Date(r2.period.start))

        let teamContests = []
        for (let set of this.rotationData.coopGroupingSchedule.teamContestSchedules.nodes) {
            teamContests.push(await this.parseSalmonRun(this.salmonType.teamContest, set))
        }

        let rotations = {
            battles: battles,
            events: events,
            salmonRuns: salmonRuns,
            teamContests: teamContests,
        }

        writeFileSync(this.dataOut, JSON.stringify(rotations, (k, v) => v === undefined ? null : v))
    }
}

module.exports.runFetch = () => {
    let splatoon3Ink = new Splatoon3Ink()
    splatoon3Ink.buildRotations()
}

module.exports.splatoon3InkScheduler = () => {
    let splatoon3Ink = new Splatoon3Ink()

    log.write('start fetch', splatoon3Ink.apiBase, 'every 2 hours')
    schedule.scheduleJob('1 */2 * * *', () => {
        splatoon3Ink.buildRotations()
            .catch( (err) => {
                console.log("build rotation failed, error:", err)
                // do nothing
            })
    })
}
