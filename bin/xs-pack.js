#! /usr/bin/env node //指定node环境编译
//1.需要找到当前执行命令的路径，webpack.config.js
let path = require('path')
//config配置文件
let config = require(path.resolve('webpack.config.js'))
//解析类

let Compiler = require('../lib/Compiler.js')
let compiler = new Compiler(config)
// 标识运行编译
compiler.run()
