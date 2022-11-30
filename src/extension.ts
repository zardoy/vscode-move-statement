/* eslint-disable no-await-in-loop */
import * as vscode from 'vscode'
import { offsetPosition } from '@zardoy/vscode-utils/build/position'
import { CommandHandler, registerAllExtensionCommands, Settings } from 'vscode-framework'

// todo self-building postfixes!
export const activate = () => {
    const mainCommandHandler: CommandHandler = async ({ command }) => {
        const moveDirection = command === 'moveStatementUp' ? -1 : 1

        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return

        const { document } = editor
        const configuration = vscode.workspace.getConfiguration(process.env.IDS_PREFIX, document)
        const supportedKinds = configuration.get<Settings['supportedKinds']>('supportedKinds')!
        const rejectDifferentKinds = configuration.get<Settings['rejectDifferentKinds']>('rejectDifferentKinds')!
        const builtinCommaHandling = configuration.get<Settings['builtinCommaHandling.enabled']>('builtinCommaHandling.enabled')!
        if (supportedKinds.length === 0) return
        const outline: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri)
        const newSelections: vscode.Selection[] = []
        for (const selection of editor.selections) {
            const { start: startPos, end: endPos } = selection
            const findMe = (
                items: vscode.DocumentSymbol[],
            ):
                | (Record<'prev' | 'current' | 'next', vscode.DocumentSymbol | undefined> & {
                      current: vscode.DocumentSymbol
                      isCurrentLast: boolean
                      isNextLast: boolean
                  })
                | undefined => {
                let itemIndex = -1
                items.sort((a, b) => a.range.end.compareTo(b.range.end))
                for (const [i, item] of items.entries()) {
                    if (item.children.length > 0) {
                        const tryToFindMe = findMe(item.children)
                        if (tryToFindMe) return tryToFindMe
                    }

                    // ensure both start & end selection within current moving item to avoid confusion
                    // we're grabbing parent item if selection overlaps a few children items
                    if (item.range.contains(startPos) && item.range.contains(endPos) && (supportedKinds === '*' || supportedKinds.includes(item.kind)))
                        itemIndex = i
                }

                if (itemIndex === -1) return
                return {
                    // todo stricter line checks!
                    prev: items[itemIndex - 1],
                    current: items[itemIndex]!,
                    next: items[itemIndex + 1],
                    isCurrentLast: itemIndex === items.length - 1,
                    isNextLast: itemIndex + 1 === items.length - 1,
                }
            }

            const match = findMe(outline)
            if (!match) continue
            // const { current } = match
            const curRange = match.current.range
            const swap = moveDirection === 1 ? match.next : match.prev
            if (!swap) return
            if (rejectDifferentKinds && swap.kind !== match.current.kind) return
            const swapRange = swap.range

            // always moved together
            const surroundedEmptyLines = getWhitespaceLines(
                moveDirection === 1 ? curRange.end.line : curRange.start.line /* todo swapRange.end.line */,
                moveDirection,
                document,
            )
            const surroundedEmptyLinesCount = surroundedEmptyLines.length
            const surroundedEmptyLinesContent = surroundedEmptyLines.length > 0 ? `\n${surroundedEmptyLines.join('\n')}` : ''

            const currentLinesRange = new vscode.Range(curRange.start.with(undefined, 0), curRange.end.with(undefined, Number.POSITIVE_INFINITY))

            const currentLinesContent = document.getText(currentLinesRange)
            // if (moveDirection === 1) currentLinesContent = `${surroundedEmptyLinesContent}${currentLinesContent}`
            // else currentLinesContent += surroundedEmptyLinesContent
            const currentLinesRemoveRange =
                moveDirection === -1
                    ? currentLinesRange.with({
                          start: currentLinesRange.start.translate(-surroundedEmptyLinesCount),
                          end: expandPosWithEol(1, currentLinesRange.end, document),
                      })
                    : currentLinesRange.with(
                          expandPosWithEol(-1, currentLinesRange.start, document),
                          currentLinesRange.end.translate(surroundedEmptyLinesCount),
                      )

            const linesBetween = moveDirection === 1 ? swapRange.start.line - curRange.end.line : curRange.start.line - swapRange.end.line
            const linesDiff = (swapRange.end.line - swapRange.start.line + linesBetween) * moveDirection

            const getCommaHandledContent = (content: string) => {
                const contentClean = content.replace(/[\n\s]+$/, '')
                return {
                    contentClean,
                    endsComma: contentClean.endsWith(','),
                }
            }

            const { contentClean, endsComma } = getCommaHandledContent(currentLinesContent)

            const swapLinesRange = swapRange.with({ end: swapRange.end.with(undefined, Number.POSITIVE_INFINITY) })
            const swapContent = document.getText(swapLinesRange)
            const { contentClean: swapContentClean, endsComma: swapEndsComma } = getCommaHandledContent(swapContent)
            const handlePrevContentComma = (edit: vscode.TextEditorEdit) => {
                if (!builtinCommaHandling) return
                // todo check also range end
                const endPos = offsetPosition(document, swapRange.start, swapContentClean.length)
                if (moveDirection === 1 && match.isNextLast && !swapEndsComma) edit.insert(endPos, ',')
                if (moveDirection === -1 && match.isCurrentLast && swapEndsComma) edit.delete(new vscode.Range(endPos.translate(0, -1), endPos))
                return swapEndsComma
            }

            const newContentHandled = (): string => {
                const content = currentLinesContent
                if (!endsComma && !swapEndsComma) return content
                if (!builtinCommaHandling) return content
                // todo check also range end, end+1
                if (moveDirection === 1 && match.isNextLast && endsComma) return content.slice(0, contentClean.length - 1) + content.slice(contentClean.length)
                if (moveDirection === -1 && match.isCurrentLast && !endsComma)
                    return `${content.slice(0, contentClean.length)},${content.slice(contentClean.length)}`

                return content
            }

            // const linesDiff = swapItem.range.start.line - curRange.start.line
            // const swapRange = new vscode.Range(swapRange.start.with(undefined, 0), swapRange.end.with(undefined, Number.POSITIVE_INFINITY))
            // const swapLinesText = document.getText(swapRange)
            await editor.edit(
                edit => {
                    // edit.insert(currentLinesRange.start, swapLinesText)
                    // edit.insert(swapRange.start, currentLinesContent)

                    if (endsComma || swapEndsComma) handlePrevContentComma(edit)

                    edit.delete(currentLinesRemoveRange)

                    if (moveDirection === -1) edit.insert(swapRange.start.with(undefined, 0), `${newContentHandled()}\n${surroundedEmptyLinesContent}`)
                    else edit.insert(swapRange.end.with(undefined, Number.POSITIVE_INFINITY), `\n${surroundedEmptyLinesContent}${newContentHandled()}`)
                },
                // {
                //     undoStopBefore: false,
                //     undoStopAfter: false,
                // },
            )
            // it doesn't work in naive way
            // await editor.edit(
            //     edit => {
            //         edit.delete(currentLinesRange)
            //         edit.delete(swapRange)
            //     },
            //     {
            //         undoStopBefore: false,
            //         undoStopAfter: true,
            //     },
            // )
            newSelections.push(new vscode.Selection(selection.start.translate(linesDiff), selection.end.translate(linesDiff)))
        }

        editor.selections = newSelections
        editor.revealRange(editor.selection)
    }

    registerAllExtensionCommands({
        moveStatementDown: mainCommandHandler,
        moveStatementUp: mainCommandHandler,
    })
}

function getLineSafe(document: vscode.TextDocument, line: number) {
    try {
        return document.lineAt(line)
    } catch {
        return null
    }
}

function expandPosWithEol(direction: -1 | 1, pos: vscode.Position, document: vscode.TextDocument) {
    if (direction === -1) {
        const prevLine = getLineSafe(document, pos.line - 1)
        return prevLine?.range.end ?? pos
    }

    return document.lineAt(pos).rangeIncludingLineBreak.end
}

function getWhitespaceLines(lineNum: number, direction: 1 | -1, document: vscode.TextDocument) {
    const lines: string[] = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
        lineNum += direction
        const line = getLineSafe(document, lineNum)
        if (!line || !line.isEmptyOrWhitespace) break
        // keep whitespaces as is, not our problem
        lines.push(line.text)
    }

    return lines
}
