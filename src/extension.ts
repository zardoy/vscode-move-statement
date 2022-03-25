/* eslint-disable no-await-in-loop */
import * as vscode from 'vscode'
import { CommandHandler, registerAllExtensionCommands } from 'vscode-framework'

export const activate = () => {
    const mainCommandHandler: CommandHandler = async ({ command }) => {
        const activeEditor = vscode.window.activeTextEditor
        if (activeEditor === undefined || activeEditor.viewColumn === undefined) return
        console.time('Get outline')
        const outline: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', activeEditor.document.uri)
        console.timeEnd('Get outline')
        for (const { start: startPos } of activeEditor.selections) {
            const findMe = (
                items: vscode.DocumentSymbol[],
            ): (Record<'prev' | 'current' | 'next', vscode.DocumentSymbol | undefined> & { current: vscode.DocumentSymbol }) | undefined => {
                let itemIndex = -1
                items.sort((a, b) => a.range.end.compareTo(b.range.end))
                for (const [i, item] of items.entries()) {
                    if (item.children.length > 0) {
                        const tryToFindMe = findMe(item.children)
                        if (tryToFindMe) return tryToFindMe
                    }

                    if (item.range.contains(startPos)) itemIndex = i
                }

                if (itemIndex === -1) return
                return {
                    prev: items[itemIndex - 1],
                    current: items[itemIndex]!,
                    next: items[itemIndex + 1],
                }
            }

            const match = findMe(outline)
            if (!match) continue
            const { prev, next, current } = match
            console.log('match', match)
            const line = activeEditor.document.lineAt(current.range.start)
            const lineStartPos = new vscode.Position(line.lineNumber, 0)
            const whitespace = activeEditor.document.getText(
                new vscode.Range(lineStartPos, lineStartPos.with({ character: line.firstNonWhitespaceCharacterIndex })),
            )
            if (command === 'moveStatementUp' && prev) {
                const lineDiff = startPos.line - prev.range.start.line
                await activeEditor.edit(edit => {
                    // edit.replace(location, value)
                    edit.insert(prev.range.start.translate(-1, Number.POSITIVE_INFINITY), `\n${whitespace}${activeEditor.document.getText(current.range)}`)
                    const delRange = current.range.with({
                        start: current.range.end.with({ character: 0 }),
                        end: current.range.end.translate(1).with({ character: 0 }),
                    })
                    edit.delete(delRange)
                })
                // TODO move to bottom
                const newPos = startPos.translate(-lineDiff)
                activeEditor.selections = [new vscode.Selection(newPos, newPos)]
            } else if (command === 'moveStatementDown' && next) {
                await activeEditor.edit(edit => {
                    // edit.insert(prev.range.start.translate(-1, Number.POSITIVE_INFINITY), activeEditor.document.getText(current.range))
                    // edit.delete(current.range)
                })
            }
        }
    }

    registerAllExtensionCommands({
        moveStatementDown: mainCommandHandler,
        moveStatementUp: mainCommandHandler,
    })
}
