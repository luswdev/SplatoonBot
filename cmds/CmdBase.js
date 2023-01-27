'use strict'

const ConnDB = require('../pkg/mysql.js')
const { db } = require('../config.json')

class CmdBase {

    constructor (_key = '', _info = '', _options = []) {
        this.cmdKey = _key
        this.cmdInfo = _info
        this.infoUrlBase = 'https://splatoonwiki.org/wiki/'

        this.mysql = new ConnDB(db)

        this.langs = [
            { emoji: '🇹🇼', name: '正體中文', key: 'zhTW' },
            { emoji: '🇨🇳', name: '简体中文', key: 'zhCN' },
            { emoji: '🇯🇵', name: '日本語', key: 'ja' },
            { emoji: '🇰🇷', name: '한국어', key: 'ko' },
            { emoji: '🇺🇸', name: 'English', key: 'en' },
            { emoji: '🇩🇪', name: 'Deutsch', key: 'de' },
            { emoji: '🇪🇸', name: 'Español (ES)', key: 'esE' },
            { emoji: '🇲🇽', name: 'Español (MX)', key: 'esA' },
            { emoji: '🇫🇷', name: 'Français (FR)', key: 'frE' },
            { emoji: '🇨🇦', name: 'Français (CA)', key: 'frA' },
            { emoji: '🇮🇹', name: 'Italiano', key: 'it' },
            { emoji: '🇳🇱', name: 'Nederlands', key: 'nl' },
            { emoji: '🇷🇺', name: 'Русский', key: 'ru' },
        ]

        this.options = _options
    }

    infoUrl(_name) {
        if (typeof(_name) !== 'string') {
            return ''
        }

        let replaceSpace = _name.replace(' ', '_')
        return this.infoUrlBase + encodeURI(replaceSpace)
    }
}

module.exports = CmdBase
