export default (code, prefix = 'PREFIX') => {

    const highlights = []

    const closureStack = []
    const closures = { '': { vars: [] } }

    const getLastFunction = () => closureStack.filter(closure => closure.type === 'function').sort(() => -1)[0]

    const getClosureName = stack => {
        if (stack === undefined) stack = closureStack
        let path = []
        for (const closure of stack)
            if (closure.type === 'function')
                path.push(closure.name)
            else if (closure.type === 'if')
                path.push(`if${closure.index}`)
        if (path.length === 0)
            return ''
        else
            return path.join('_')
    }

    const getVarClosure = name => {
        for (let layers = closureStack.length; layers > 0; layers--) {
            const closureName = getClosureName(closureStack.slice(0, layers))
            if (closures[closureName].vars.includes(name))
                return closureName
        }
    }

    //Compile the code line by line.
    const lines = code.split('\r\n')
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex]

        const highlight = (start, length, type) => {
            highlights.push({ line: lineIndex + 1, start, length, type })
        }    

        //Ignore comments.
        if (line.includes('#')) {
            const commentSplit = line.split('#')
            const comment = `#${commentSplit.slice(1).join('#')}`
            highlight(line.indexOf('#') + 1, comment.length, 'comment')
            line = commentSplit[0]
        }

        if (line === '') null

        //Function open
        else if (/^\s*function/.test(line)) {
            highlight(line.indexOf('f')+1,8,'keyword')
            const name = line.match(/^\s*function\s+([a-z0-9_]+)/)[1]
            highlight(line.indexOf(name)+1,name.length,'identifier')
            closures[getClosureName()].vars.push(name)
            closureStack.push({ type: 'function', name: name, ifs: 0 })
            closures[getClosureName()] = { lines: [], vars: [] }
        }

        //Closure close
        else if (/^\s*}/.test(line)) {
            closureStack.pop()
        }

        //Vars
        else if (/^\s*var\s+/.test(line)) {
            highlight(line.indexOf('v')+1,3,'keyword')

            //Defining
            if (/^\s*var\s+define\s+/.test(line)) {
                highlight(line.indexOf('d')+1,6,'keyword')
                const name = line.match(/^\s*var\s+define\s+([a-z0-9_]+)/)[1]
                const closureName = getClosureName()
                closures[closureName].vars.push(name)
                const scoreBoardName = `HDP_VAR_${closureName}_${prefix}`
                closures[closureName].lines.push(`scoreboard objectives add ${scoreBoardName} dummy`)
                //TODO allow non static values
                const value = line.match(/^\s*var\s+define\s+[a-z0-9_]+\s*=\s*(.+)/)[1]
                closures[closureName].lines.push(`scoreboard players set HDP ${scoreBoardName} ${value}`)
            }

            //Modifying
            else {
                let operationString, cleanUpTemp
                const leftSide = line.match(/^\s*var\s+([a-z0-9_]+)/)[1]
                const operation = line.match(/^\s*var\s+[a-z0-9_]+\s+(\S+)/)[1]
                const closureName = getClosureName()

                //Use a var as the right side
                if (/^\s*var\s+[a-z0-9_]+\s+\S+\s+var\s+/.test(line)) {
                    const rightSide = line.match(/^\s*var\s+[a-z0-9_]+\s+\S+\s+var\s+([a-z0-9_]+)/)[1]
                    operationString = `operation HDP HDP_VAR_${getVarClosure(leftSide)}_${leftSide} ${operation} HDP HDP_VAR_${getVarClosure(rightSide)}_${rightSide}`
                }
                else {
                    const value = line.match(/^\s*var\s+[a-z0-9_]+\s\S+\s*([0-9]+)/)[1]

                    //Addition
                    if (operation === '+=')
                        operationString = `add HDP HDP_VAR_${getVarClosure(leftSide)}_${leftSide} ${value}`

                    //Subtraction
                    else if (operation === '-=')
                        operationString = `remove HDP HDP_VAR_${getVarClosure(leftSide)}_${leftSide} ${value}`

                    else {
                        closures[closureName].lines.push('scoreboard objectives add HDP_TEMP_INT dummy')
                        closures[closureName].lines.push(`scoreboard players set HDP HDP_TEMP_INT ${value}`)
                        cleanUpTemp = true
                        operationString = `operation HDP HDP_VAR_${getVarClosure(leftSide)}_${leftSide} ${operation} HDP HDP_TEMP_INT`
                    }
                }

                closures[closureName].lines.push(`scoreboard players ${operationString}`)
                if (cleanUpTemp)
                    closures[closureName].lines.push('scoreboard objectives remove HDP_TEMP_INT')
            }
        }

        //If statements
        else if (/^\s*if\s+/.test(line)) {
            let condition
            const leftSideVarName = line.match(/^\s*if\s+([a-z0-9_]+)/)[1]
            const leftSide = `HDP_VAR_${getVarClosure(leftSideVarName)}_${leftSideVarName}`
            const comparison = line.match(/^\s*if\s+[a-z0-9_]+\s+(\S+)/)[1]
            if (/^\s*if\s+[a-z0-9_]+\s+\S+\s+var/.test(line)) {
                const rightSide = `HDP ${line.match(/^\s*if\s+[a-z0-9_]+\s+\S+\s+var\s+([a-z0-9_]+)/)[1]}`
                condition = `${leftSide} ${comparison} HDP ${rightSide}`
            }
            else {
                const number = Number(line.match(/^\s*if\s+[a-z0-9_]+\s+\S+\s+([0-9]+)/)[1])
                const target = {
                    '<': `..${number - 1}`,
                    '<=': `..${number}`,
                    '=': number,
                    '>': `${number + 1}..`,
                    '>=': `${number}..`,
                    'range': `${number}..${Number(line.match(/^\s*if\s+[a-z0-9_]+\s+\S+\s+[0-9]+\s+([0-9]+)/) ?? [][1])}`
                }[comparison]
                condition = `${leftSide} matches ${target}`
            }
            const oldClosureName = getClosureName()
            closureStack.push({ type: 'if', index: getLastFunction().ifs++ })
            const closureName = getClosureName()
            closures[closureName] = { lines: [], vars: [] }
            closures[oldClosureName].lines.push(`execute if score HDP ${condition} run function ${prefix}:${closureName}`)
        }

        //Calling functions
        else if (/^\s*run\s+/.test(line)) {
            const functionName = line.match(/^\s*run\s+([a-z0-9_]+)/)[1]
            closures[getClosureName()].lines.push(`function ${prefix}:${getVarClosure(functionName)}_${functionName}`)
        }

        //Regular commands
        else if (/^\s*\//.test(line)) {
            //Do command arg substitution here
            line = line.replace(/v\{([a-z0-9_]+)\}/g, (match, p1) => {
                return `HDP_VAR_${getVarClosure(p1)}_${p1}`
            })
            closures[getClosureName()].lines.push(line.match(/^\s*\/(.+)/)[1])
        }
    }

    return {
        files: {
            'pack.mcmeta': JSON.stringify({
                pack: {
                    pack_format: 48,
                    description: 'Built with HDP!'
                }
            }, undefined, 4),
            ...Object.fromEntries(Object.keys(closures).filter(key => key !== '').map(closureName => [`data/${prefix}/function/${closureName}.mcfunction`, closures[closureName].lines.join('\n')]))
        },
        highlights
    }
}