import * as vscode from 'vscode'
import { CommandHandler, registerAllExtensionCommands, Settings } from 'vscode-framework'
import moveStatement from './moveStatement'

// todo self-building postfixes!
export const activate = () => {
    const mainCommandHandler: CommandHandler = async ({ command }) => {
        const upDirectionCommandNames = new Set(['moveStatementUp', 'copyStatementUp'])
        const direction = upDirectionCommandNames.has(command) ? -1 : 1

        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return

        const { document, selections, selection } = editor
        const configuration = vscode.workspace.getConfiguration(process.env.IDS_PREFIX, document)
        const supportedKinds = configuration.get<Settings['supportedKinds']>('supportedKinds')!
        const rejectDifferentKinds = configuration.get<Settings['rejectDifferentKinds']>('rejectDifferentKinds')!

        const builtinCommaHandling = configuration.get<Settings['builtinCommaHandling.enabled']>('builtinCommaHandling.enabled')!
        if (supportedKinds.length === 0) return
        const outline: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri)
        const newSelections: vscode.Selection[] = []
        for (const selection of selections) {
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

            // eslint-disable-next-line no-await-in-loop
            const linesDiff = await moveStatement(editor, direction, match, { rejectDifferentKinds, builtinCommaHandling })

            newSelections.push(new vscode.Selection(startPos.translate(linesDiff), endPos.translate(linesDiff)))
        }

        editor.selections = newSelections
        editor.revealRange(selection)
    }

    registerAllExtensionCommands({
        moveStatementDown: mainCommandHandler,
        moveStatementUp: mainCommandHandler,
    })
}
