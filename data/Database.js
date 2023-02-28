'use strict'

const _ = require('lodash')
const { readdirSync, readFileSync } = require('fs')
const { join } = require('path')

const { log } = require('utils/Log.js')
const dummy = require('data/dummy.json')

class Database {

    constructor () {
        this.dataList = {}

        const dataList = readdirSync(join(__dirname, './'), { withFileTypes: true })
            .filter( (dir) => dir.isDirectory() )

        for (let data of dataList) {
            this.buildList(data.name)
        }
    }

    buildList (_path) {
        let list = []

        const arrJson = readdirSync(`${__dirname}/${_path}`)
        for (let file of arrJson) {
            if (file.indexOf('.json') !== -1) {
                let obj = JSON.parse(readFileSync(`${__dirname}/${_path}/${file}`, 'utf8'))
                if (obj.en !== '') {
                    list.push(obj)
                }
            }
        }

        log.write('load', list.length, _path, '/ skip empty:', arrJson.length - list.length - 1)

        let obj = {}
        obj[_path] = list
        this.dataList = {...this.dataList, ...obj}
    }

    random (_range) {
        const list = _.range(_range)
        const slist = _.shuffle(list)
        const idx = _.random(_range - 1)
        return slist[idx]
    }

    randomList (_list) {
        const listIdx = database.random(_list.length)
        const listRes = _list[listIdx]
        return listRes
    }

    getListIdx (_target, _list) {
        const ret = database.dataList[_list].indexOf(_target)
        return ret
    }

    getListObject (_target, _list) {
        let ret = undefined
        if (typeof(_target) == 'string') {
            ret = database.dataList[_list].find( (e) => e.en == _target) ?? dummy
        } else {
            ret = database.dataList[_list][_target]
        }
        return ret
    }
}

const database = new Database()
module.exports = database
