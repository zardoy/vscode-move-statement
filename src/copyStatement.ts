import * as vscode from 'vscode'
import { getCommaHandledContent, getHandledContent, getWhitespaceLines } from './shared'

export default async (
    editor: vscode.TextEditor,
    direction: -1 | 1,
    match:
        | Record<'prev' | 'current' | 'next', vscode.DocumentSymbol | undefined> & {
              current: vscode.DocumentSymbol
              isCurrentLast: boolean
              isNextLast: boolean
          },
    relatedSettings: { builtinCommaHandling?: boolean },
) => {
    const curRange = match.current.range
    const { builtinCommaHandling = false } = relatedSettings
    const { document } = editor

    const surroundedEmptyLines = getWhitespaceLines(direction === 1 ? curRange.end.line : curRange.start.line, direction, document)
    const surroundedEmptyLinesContent = surroundedEmptyLines.length > 0 ? `\n${surroundedEmptyLines.join('\n')}` : ''

    const currentLinesRange = new vscode.Range(curRange.start.with(undefined, 0), curRange.end.with(undefined, Number.POSITIVE_INFINITY))

    const currentLinesContent = document.getText(currentLinesRange)

    const { endsComma } = getCommaHandledContent(currentLinesContent)

    const contentToInsert = !endsComma || !builtinCommaHandling ? currentLinesContent : getHandledContent(currentLinesContent, direction, match)
    await editor.edit(edit => {
        if (direction === -1) edit.insert(curRange.start.with(undefined, 0), `${contentToInsert}${surroundedEmptyLinesContent}\n`)
        else edit.insert(curRange.end.with(undefined, Number.POSITIVE_INFINITY), `\n${surroundedEmptyLinesContent}${contentToInsert}`)
    })
    if (direction === -1) return 0

    const lineDiff = curRange.end.line - curRange.start.line
    if (lineDiff === 0) return 1

    return lineDiff * 2 + 1
}
