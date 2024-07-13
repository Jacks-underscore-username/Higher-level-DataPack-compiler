import realCompile from './compile.js'

//Used to ship a working highlightless version before a working highlighting version exists.
const disableHighlighting = false

document.addEventListener('DOMContentLoaded', async () => {

    const getSettings = () => {
        const data = {}
        const nameElement = document.getElementById('controls-packName')
        data.packName = nameElement.value === '' ? nameElement.placeholder : nameElement.value
        const prefixElement = document.getElementById('controls-packPrefix')
        data.packPrefix = prefixElement.value === '' ? prefixElement.placeholder : prefixElement.value
        data.functionLocation = document.getElementById('controls-functionLocation-flat').classList.contains('selected') ? 'flat' : 'layered'
        data.autoExpandFolders = document.getElementById('controls-autoExpandFolders-wrapper').classList.contains('on')
        data.writeToLocalFolder = document.getElementById('controls-writeToLocalFolder-wrapper').classList.contains('on')
        if (data.writeToLocalFolder)
            data.hasFolderHandle = document.getElementById('controls-folderLocation-current').classList.contains('selected')
        data.autoGenerateFolder = document.getElementById('controls-autoGenerateFolder-wrapper').classList.contains('on')
        return data
    }

    // let lastSettings = ''
    // setInterval(() => {
    //     if (JSON.stringify(getSettings()) !== lastSettings) {
    //         console.log(getSettings())
    //         lastSettings = JSON.stringify(getSettings())
    //     }
    // }, 100)

    const updateExplorer = () => {
        if (updateExplorer.openFolders === undefined)
            Object.defineProperty(updateExplorer, 'openFolders', {
                get: () => load('openFolders') ?? [],
                set: folders => save('openFolders', folders)
            })
        if (updateExplorer.closedFolders === undefined)
            Object.defineProperty(updateExplorer, 'closedFolders', {
                get: () => load('closedFolders') ?? [],
                set: folders => save('closedFolders', folders)
            })
        const currentFolders = []

        const wrapper = document.getElementById('explorer-content')
        wrapper.innerHTML = ''

        const addFile = (parent, name, path) => {
            const element = document.createElement('div')
            element.classList.add('file')
            element.textContent = name
            element.addEventListener('click', () => editor.open(path))
            parent.appendChild(element)
        }
        const addFolder = (parent, folderContents, name, path) => {
            currentFolders.push(path)
            const element = document.createElement('div')
            element.classList.add('folder')
            if (getSettings().autoExpandFolders) {
                if (updateExplorer.closedFolders.includes(path))
                    element.classList.add('closed')
                else
                    element.classList.add('open')
            }
            else {
                if (updateExplorer.openFolders.includes(path))
                    element.classList.add('open')
                else
                    element.classList.add('closed')
            }
            const titleWrapper = document.createElement('div')
            titleWrapper.classList.add('titleWrapper')
            titleWrapper.addEventListener('click', () => {
                element.classList.toggle('open')
                element.classList.toggle('closed')
                if (element.classList.contains('open') && !updateExplorer.openFolders.includes(path))
                    updateExplorer.openFolders = [...updateExplorer.openFolders, path]
                if (element.classList.contains('closed') && updateExplorer.openFolders.includes(path))
                    updateExplorer.openFolders = updateExplorer.openFolders.filter(item => item !== path)
                if (element.classList.contains('closed') && !updateExplorer.closedFolders.includes(path))
                    updateExplorer.closedFolders = [...updateExplorer.closedFolders, path]
                if (element.classList.contains('open') && updateExplorer.closedFolders.includes(path))
                    updateExplorer.closedFolders = updateExplorer.closedFolders.filter(item => item !== path)

            })
            const openIcon = document.createElement('div')
            openIcon.classList.add('openIcon')
            openIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640H447l-80-80H160v480l96-320h684L837-217q-8 26-29.5 41.5T760-160H160Zm84-80h516l72-240H316l-72 240Zm0 0 72-240-72 240Zm-84-400v-80 80Z"/></svg>'
            titleWrapper.appendChild(openIcon)
            const closedIcon = document.createElement('div')
            closedIcon.classList.add('closedIcon')
            closedIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>'
            titleWrapper.appendChild(closedIcon)
            const titleText = document.createElement('div')
            titleText.classList.add('titleText')
            titleText.textContent = name
            titleWrapper.appendChild(titleText)
            element.appendChild(titleWrapper)
            const content = document.createElement('div')
            content.classList.add('content')
            element.appendChild(content)
            parent.appendChild(element)
            for (const key of Object.keys(folderContents)) {
                if (typeof folderContents[key] === 'object')
                    addFolder(content, folderContents[key], key, path + '/' + key)
                else
                    addFile(content, key, path + '/' + key)
            }
        }
        const folderContents = folder.getFilesObject()
        for (const key of Object.keys(folderContents)) {
            if (typeof folderContents[key] === 'object')
                addFolder(wrapper, folderContents[key], key, key)
            else
                addFile(wrapper, key, key)
        }
        updateExplorer.openFolders = updateExplorer.openFolders.filter(path => currentFolders.includes(path))
        updateExplorer.closedFolders = updateExplorer.closedFolders.filter(path => currentFolders.includes(path))
    }

    //Acts like a folder that I can write / read / delete files with.
    const folder = {
        checkEditorFileExists() {
            if (this.read(editor.currentlyOpenFile) === undefined)
                editor.open('source.hdp')

        },
        write(path, value, skipExplorerUpdate = false) {
            path = path.split('/')
            let lastObject = this.files
            while (path.length > 1) {
                const key = path.splice(0, 1)[0]
                if (typeof lastObject[key] !== 'object')
                    lastObject[key] = {}
                lastObject = lastObject[key]
            }
            lastObject[path[0]] = value
            save('folder', this.files)
            if (!skipExplorerUpdate)
                updateExplorer()
        },
        read(path) {
            path = path.split('/')
            let lastObject = this.files
            while (path.length > 1)
                lastObject = lastObject[path.splice(0, 1)[0]] ?? {}
            return lastObject[path[0]]
        },
        delete(path, skipExplorerUpdate = false, skipEditorUpdate = false) {
            path = path.split('/')
            let lastObject = this.files
            while (path.length > 1)
                lastObject = lastObject[path.splice(0, 1)[0]] ?? {}
            delete lastObject[path[0]]
            save('folder', this.files)
            if (!skipExplorerUpdate)
                updateExplorer()
            if (!skipEditorUpdate)
                this.checkEditorFileExists()
        },
        clear(skipExplorerUpdate = false, skipEditorUpdate = false) {
            const source = this.read('source.hdp')
            const clearObject = obj => {
                for (const key of Object.keys(obj)) {
                    if (typeof obj[key] === 'object')
                        clearObject(obj[key])
                    delete obj[key]
                }
            }
            clearObject(this.files)
            this.write('source.hdp', source, true)
            save('folder', this.files)
            if (!skipExplorerUpdate)
                updateExplorer()
            if (!skipEditorUpdate)
                this.checkEditorFileExists()
        },
        add(folder, skipEditorUpdate = false) {
            for (const key of Object.keys(folder))
                this.write(key, folder[key], skipEditorUpdate)
        },
        getAllFiles() {
            const files = []
            const scanObject = (obj, path) => {
                for (const key of Object.keys(obj)) {
                    if (typeof obj[key] === 'object')
                        scanObject(obj[key], `${path}/${key}`)
                    else
                        files.push({ path: `${path}/${key}`, content: obj[key] })
                }
            }
            for (const key of Object.keys(this.files)) {
                if (typeof this.files[key] === 'object')
                    scanObject(this.files[key], key)
                else
                    files.push({ path: key, content: this.files[key] })
            }
            return files
        },
        getFilesObject() { return this.files },
        download() {
            compile(true)
            var zip = new JSZip()

            for (const file of this.getAllFiles())
                zip.file(file.path, file.content)

            zip.generateAsync({ type: "blob" })
                .then(function (content) {
                    let blobURL = URL.createObjectURL(content)
                    let link = document.createElement("a")
                    link.href = blobURL
                    link.download = `${getSettings().packName}.zip`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    URL.revokeObjectURL(blobURL)
                })

        },
        copyToLocalFolder: (() => {
            let queuedFolder, isCopying
            const tryToCopy = async folderToCopy => {
                folderToCopy = folderToCopy ?? JSON.parse(JSON.stringify(folder.getAllFiles()))
                if (isCopying)
                    queuedFolder = folderToCopy
                else try {
                    isCopying = true
                    for await (const entry of filesystemHandle.values())
                        await filesystemHandle.removeEntry(entry.name, { recursive: true })

                    for await (const item of folderToCopy) {
                        const path = item.path.split('/')
                        const fileName = path.pop()
                        let parentDirectoryHandle = filesystemHandle
                        for (const part of path)
                            parentDirectoryHandle = await parentDirectoryHandle.getDirectoryHandle(part, { create: true })
                        const fileHandle = await parentDirectoryHandle.getFileHandle(fileName, { create: true })
                        const writable = await fileHandle.createWritable()
                        await writable.write(item.content)
                        await writable.close()
                    }
                    isCopying = false
                    if (queuedFolder !== undefined)
                        tryToCopy(queuedFolder)
                    queuedFolder = undefined
                } catch (err) { console.error(err) }
            }
            return tryToCopy
        })(),
        files: load('folder') ?? {}
    }

    if (folder.read('source.hdp') === undefined)
        folder.write('source.hdp', [

            '#Example fibonacci program:',
            'function run {',
            '    var define a = 1',
            '    var define b = 0',
            '    var define c = 0',
            '',
            '    var define index = 0',
            '    function loop {',
            '        var index += 1',
            '        var c = var b',
            '        var b = var a',
            '        var a += var c',
            '        /tellraw @a {"text":"","extra":[{"score":{"name":"HDP","objective":"v{b}"}}]}',
            '        if index < 15 {',
            '            run loop',
            '        }',
            '    }',
            '    run loop'].join('\r\n'))

    const compile = (() => {
        return (fromButton) => {
            try {
                const settings = getSettings()

                if (settings.autoGenerateFolder || fromButton)
                    folder.clear(true, true)

                const result = realCompile(folder.read('source.hdp'), settings.packPrefix)
                editor.setHighlights(result.highlights)

                if (settings.autoGenerateFolder || fromButton) {
                    folder.add(result.files, true)
                    updateExplorer()
                    folder.checkEditorFileExists()

                    if (settings.writeToLocalFolder && settings.hasFolderHandle)
                        folder.copyToLocalFolder()
                }
            } catch (err) { console.error(err) }
        }
    })()

    document.getElementById('generatePack').addEventListener('click', () => {
        compile(true)
    })

    document.getElementById('downloadPack').addEventListener('click', () => {
        folder.download(getSettings().packName)
    })

    const editor = await (async () => {
        const obj = {}
        obj.editor = await new Promise(resolve => {

            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.49.0/min/vs' } })
            require(['vs/editor/editor.main'], () => {
                const highlightMatch = getComputedStyle(document.getElementById('editor-color-patch-highlight')).color.match(/srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
                const highlightColor = {
                    r: Math.round(parseFloat(highlightMatch[1]) * 255),
                    g: Math.round(parseFloat(highlightMatch[2]) * 255),
                    b: Math.round(parseFloat(highlightMatch[3]) * 255)
                }

                const borderMatch = getComputedStyle(document.getElementById('editor-color-patch-border')).color.match(/srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
                const borderColor = {
                    r: Math.round(parseFloat(borderMatch[1]) * 255),
                    g: Math.round(parseFloat(borderMatch[2]) * 255),
                    b: Math.round(parseFloat(borderMatch[3]) * 255)
                }

                function dampen(color, brightness, t, alpha = 1) {
                    brightness *= 2.55
                    alpha = Math.round(alpha * 255).toString(16).padStart(2, '0')
                    let r = Math.round(color.r + t * (brightness - color.r))
                    let g = Math.round(color.g + t * (brightness - color.g))
                    let b = Math.round(color.b + t * (brightness - color.b))
                    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}${alpha === 'ff' ? '' : alpha}`
                }

                monaco.languages.register({ id: 'dynamicSyntaxHighlighting' })

                obj.setTokenizer = tokenizer => monaco.languages.setMonarchTokensProvider('dynamicSyntaxHighlighting', { tokenizer })

                monaco.editor.defineTheme('transparentAccent', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                        'editor.background': dampen(borderColor, 0, 1, 0),
                        'editor.lineHighlightBackground': dampen(borderColor, 100, .5, .25),
                        'editorCursor.foreground': dampen(highlightColor, 0, 0, 1),
                        'editorLineNumber.foreground': dampen(highlightColor, 0, 0, .25),
                        'editorLineNumber.activeForeground': dampen(highlightColor, 0, 0),
                        'scrollbarSlider.background': dampen(borderColor, 0, .25),
                        'scrollbarSlider.hoverBackground': dampen(borderColor, 0, 0),
                        'scrollbarSlider.activeBackground': dampen(borderColor, 100, .25),
                        'editorIndentGuide.background': dampen(highlightColor, 0, 0, .25),
                        'editorOverviewRuler.border': dampen(borderColor, 0, 0),
                        'editorOverviewRuler.background': dampen(borderColor, 0, .5, .5),
                        'minimap.background': dampen(borderColor, 0, .5, .5)
                    }
                })

                const editor = monaco.editor.create(document.getElementById('editor-content'), {
                    fontFamily: 'Fira Code',
                    fontLigatures: true,
                    theme: 'transparentAccent'
                })

                const models = {}

                obj.open = filePath => {
                    const file = folder.read(filePath ?? '')
                    if (file === undefined)
                        obj.open('source.hdp')
                    else {
                        obj.currentlyOpenFile = undefined
                        if (models[filePath] === undefined)
                            models[filePath] = monaco.editor.createModel('', (!disableHighlighting && filePath === 'source.hdp') ? 'dynamicSyntaxHighlighting' : 'plaintext')
                        const model = models[filePath]
                        editor.setModel(model)
                        if (editor.getValue() !== file)
                            model.pushEditOperations([], [{
                                range: model.getFullModelRange(),
                                text: file
                            }], () => [])
                        obj.currentlyOpenFile = filePath
                        save('currentFile', filePath)
                        document.getElementById('editor-title').textContent = filePath
                    }
                }

                editor.onDidChangeModelContent(() => {
                    if (obj.currentlyOpenFile !== undefined) {
                        folder.write(obj.currentlyOpenFile, editor.getValue())
                        if (obj.currentlyOpenFile === 'source.hdp')
                            compile()
                    }
                })

                editor.layout()

                resolve(editor)
            })
        })
        obj.setHighlights = highlights => {
            if (highlights === undefined) {
                obj.setTokenizer({ inactive: [['.*', 'invalid']] })
                return
            }

            const codeLines = folder.read('source.hdp').split('\r\n')
            const maxLine = highlights.sort((a, b) => b.line - a.line)[0].line
            const patternMap = {
                symbol: 'delimiter',
                whitespace: 'white',
                ...Object.fromEntries(['keyword', 'comment', 'string', 'number', 'operator', 'identifier'].map(type => [type, type]))
            }
            const makeRegexSafe = string => string.replace(/[.*+?^${}()|[\]\\@]/g, '\\$&').replace(/@/g, '.')
            const states = {}
            let lineIndex = 1
            while (lineIndex <= maxLine) {
                const lineHighlights = highlights.filter(highlight => highlight.line === lineIndex).sort((a, b) => b.start - a.start)
                const line = codeLines[lineIndex - 1]
                const matchTypes = []
                let lineRegex = '^'
                let lastColumnIndex = 0
                while (lineHighlights.length > 0) {
                    const matchSegment = lineHighlights.pop()
                    if (matchSegment.start > lastColumnIndex + 1) {
                        const difference = matchSegment.start - lastColumnIndex - 1
                        lineRegex += `(${makeRegexSafe(line.slice(lastColumnIndex, lastColumnIndex + difference))})`
                        matchTypes.push('invalid')
                        lastColumnIndex += difference
                    }
                    lineRegex += `(${makeRegexSafe(line.slice(lastColumnIndex, lastColumnIndex + matchSegment.length))})`
                    lastColumnIndex += matchSegment.length
                    matchTypes.push(patternMap[matchSegment.type])
                }
                if (line.length > lastColumnIndex) {
                    const difference = line.length - lastColumnIndex
                    lineRegex += `(${makeRegexSafe(line.slice(lastColumnIndex, lastColumnIndex + difference))})`
                    matchTypes.push('invalid')
                }
                lineRegex += '$'

                const thisState = lineIndex === 1 ? 'root' : `line${lineIndex}`
                const nextState = lineIndex === maxLine ? 'inactive' : `line${lineIndex + 1}`

                if (lineRegex === '^$')
                    states[thisState] = [['^$', { token: 'white', next: `@${nextState}` }]]
                else
                    states[thisState] = [[lineRegex, [
                        ...matchTypes.map((type, index) => ({ token: type, group: index + 1, ...(index === matchTypes.length - 1 ? { next: `@${nextState}` } : {}) })),
                    ]]]
                lineIndex++
            }

            states.inactive = [['.*', 'invalid']]

            obj.setTokenizer(states)
        }
        obj.setHighlights()
        obj.layout = () => obj.editor.layout()
        obj.open(load('currentFile') ?? 'source.hdp')
        return obj
    })()

    compile()

    updateExplorer()

    //Detect the grid changing size to set the height of the resizer-x bar so it fills the space.
    new ResizeObserver(entries => {
        document.getElementById('resizer-x').style.height = `${entries[0].contentRect.height}px`
        editor.layout()
    }).observe(document.getElementById('wrapper'))

    const wrapper = document.getElementById('wrapper')
    const minPaneSize = .25
    const resizerSize = 15

    const updateResizer = (ratio, axis, saveRatio = true) => {
        wrapper.style['gridTemplate' + (axis === 'x' ? 'Columns' : 'Rows')] = `calc(${ratio * 100}% - ${resizerSize / 2}px) ${resizerSize}px calc(${100 - ratio * 100}% - ${resizerSize / 2}px)`
        if (saveRatio) save(`resizer.${axis}`, ratio)
    }

    updateResizer(load('resizer.x') !== undefined ? load('resizer.x') : .7, 'x', false)
    updateResizer(load('resizer.y') !== undefined ? load('resizer.y') : .5, 'y', false)

    //Handle resizer-x dragging.
    document.getElementById('resizer-x').addEventListener('mousedown', (() => {
        function onMouseMove(event, saveRatio) {
            const initialWidth = wrapper.getBoundingClientRect().width
            const ratio = Math.min(1 - minPaneSize, Math.max(minPaneSize, event.pageX / initialWidth))
            updateResizer(ratio, 'x', saveRatio)
            editor.layout()
        }
        onMouseMove({ pageX: document.getElementById('resizer-x').getBoundingClientRect().x }, false)
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
        return event => {
            event.preventDefault()
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
        }
    })())

    //Handle resizer-y dragging.
    document.getElementById('resizer-y').addEventListener('mousedown', (() => {
        function onMouseMove(event, saveRatio) {
            const initialHeight = wrapper.getBoundingClientRect().height
            const ratio = Math.min(1 - minPaneSize, Math.max(minPaneSize, event.pageY / initialHeight))
            updateResizer(ratio, 'y', saveRatio)
            editor.layout()
        }
        onMouseMove({ pageY: document.getElementById('resizer-y').getBoundingClientRect().y }, false)
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
        return event => {
            event.preventDefault()
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
        }
    })())
})