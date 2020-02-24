//Compiler.js
let path = require('path')
let fs = require('fs')
let babylon = require('babylon')
let t = require('@babel/types')
let traverse = require('@babel/traverse').default
let generator = require('@babel/generator').default
let ejs = require('ejs')
class Compiler {
    constructor(config) {
        //外部webpack配置文件
        this.config = config
        // 保存入口文件的路径 './src/index.js'
        this.entryId
        // 保存所有的模块依赖
        this.modules = {}
        this.entry = config.entry //入口路径
        this.root = process.cwd() //当前工作路径
    }
    /** 获取模块源码
     * @method getSource
     * @param{modulePath} 模块路径
     * @return {string} 模块源码字符串
     */
    getSource(modulePath) {
        let content = fs.readFileSync(modulePath, 'utf8')
        return content
    }
    /** 构建模块
     * @method bundleModule
     * @param{modulePath,isEntry} 模块路径,是否是入口文件
     * @return {返回值类型} 返回值说明
     */
    bundleModule(modulePath, isEntry) {
        // 拿到模块源码内容
        let source = this.getSource(modulePath)
        let moduleName = './' + path.relative(this.root, modulePath) //相对路径
        if (isEntry) {
            this.entryId = moduleName //保存入口名字
        }
        //解析把source源码进行改造 返回一个依赖列表
        let { sourceCode, dependencies } = this.parse(
            source,
            path.dirname(moduleName)
        ) // path.dirname(moduleName)  ./src
        //把相对路径和模块中的内容，进行关联起来
        this.modules[moduleName] = sourceCode
        dependencies.forEach(dep => {
            //依赖模块加载
            this.bundleModule(path.join(this.root, dep), false)
        })
    }
    /** 解析源码
     * @method parse
     * @param{source,farentPath} 源码,父级目录路径
     * @return {sourceCode,dependencies} 改造后源码,依赖列表
     */
    parse(source, parentPath) {
        let ast = babylon.parse(source)
        let dependencies = []
        traverse(ast, {
            CallExpression(p) {
                let node = p.node
                if (node.callee.name === 'require') {
                    node.callee.name = '__webpack_require__'
                    let moduleName = node.arguments[0].value
                    moduleName =
                        moduleName + (path.extname(moduleName) ? '' : '.js') // ./a.js
                    moduleName = './' + path.join(parentPath, moduleName) // ./src/a.js
                    dependencies.push(moduleName)
                    node.arguments = [t.stringLiteral(moduleName)]
                }
            }
        })
        let sourceCode = generator(ast).code
        //AST 解析语法树
        return {
            sourceCode,
            dependencies
        }
    }
    emitFile() {
        // 用数据 渲染我们的模板
        let main = path.join(
            this.config.output.path,
            this.config.output.filename
        )
        let templateStr = this.getSource(path.join(__dirname, 'main.ejs'))
        let code = ejs.render(templateStr, {
            entryId: this.entryId,
            modules: this.modules
        })
        this.assets = {}
        this.assets[main] = code
        //把生成的模板内容，放进出口文件中
        fs.writeFileSync(main, this.assets[main])
    }
    run() {
        //执行 并且创建模块的依赖关系
        this.bundleModule(path.resolve(this.root, this.entry), true) //G:\project\webpack-test\src\index.js
        //打包后的文件
        this.emitFile()
    }
}

module.exports = Compiler
