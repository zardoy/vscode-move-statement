import * as vscode from 'vscode'
import { getCommaHandledContent, getWhitespaceLines } from './shared'

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

    // always moved together
    const surroundedEmptyLines = getWhitespaceLines(direction === 1 ? curRange.end.line : curRange.start.line, direction, document)
    const surroundedEmptyLinesContent = surroundedEmptyLines.length > 0 ? `\n${surroundedEmptyLines.join('\n')}` : ''

    const currentLinesRange = new vscode.Range(curRange.start.with(undefined, 0), curRange.end.with(undefined, Number.POSITIVE_INFINITY))

    const currentLinesContent = document.getText(currentLinesRange)

    const { contentClean, endsComma } = getCommaHandledContent(currentLinesContent)

    const newContentHandled = (): string => {
        if (!endsComma || !builtinCommaHandling) return currentLinesContent
        // todo check also range end, end+1
        if (direction === 1 && match.isNextLast && endsComma)
            return currentLinesContent.slice(0, contentClean.length - 1) + currentLinesContent.slice(contentClean.length)
        if (direction === -1 && match.isCurrentLast && !endsComma)
            return `${currentLinesContent.slice(0, contentClean.length)},${currentLinesContent.slice(contentClean.length)}`

        return currentLinesContent
    }

    await editor.edit(edit => {
        if (direction === -1) edit.insert(curRange.start.with(undefined, 0), `${newContentHandled()}${surroundedEmptyLinesContent}\n`)
        else edit.insert(curRange.end.with(undefined, Number.POSITIVE_INFINITY), `\n${surroundedEmptyLinesContent}${newContentHandled()}`)
    })
    const lineDiff = (curRange.end.line - curRange.start.line) * direction
    if (direction === -1 && Math.abs(lineDiff) > curRange.start.line) return 0
    return lineDiff
}
