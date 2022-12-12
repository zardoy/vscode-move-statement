import * as vscode from 'vscode'
import { offsetPosition } from '@zardoy/vscode-utils/build/position'
import { expandPosWithEol, getCommaHandledContent, getWhitespaceLines } from './shared'

export default async (
    editor: vscode.TextEditor,
    direction: -1 | 1,
    match:
        | Record<'prev' | 'current' | 'next', vscode.DocumentSymbol | undefined> & {
              current: vscode.DocumentSymbol
              isCurrentLast: boolean
              isNextLast: boolean
          },
    relatedSettings: { rejectDifferentKinds?: boolean; builtinCommaHandling?: boolean },
) => {
    // const { current } = match
    const curRange = match.current.range
    const { rejectDifferentKinds = false, builtinCommaHandling = false } = relatedSettings
    const { document } = editor

    const swap = direction === 1 ? match.next : match.prev

    if (!swap || (rejectDifferentKinds && swap.kind !== match.current.kind)) return
    const swapRange = swap.range

    // always moved together
    const surroundedEmptyLines = getWhitespaceLines(
        direction === 1 ? curRange.end.line : curRange.start.line /* todo swapRange.end.line */,
        direction,
        document,
    )
    const surroundedEmptyLinesCount = surroundedEmptyLines.length
    const surroundedEmptyLinesContent = surroundedEmptyLines.length > 0 ? `\n${surroundedEmptyLines.join('\n')}` : ''

    const currentLinesRange = new vscode.Range(curRange.start.with(undefined, 0), curRange.end.with(undefined, Number.POSITIVE_INFINITY))

    const currentLinesContent = document.getText(currentLinesRange)
    // if (moveDirection === 1) currentLinesContent = `${surroundedEmptyLinesContent}${currentLinesContent}`
    // else currentLinesContent += surroundedEmptyLinesContent
    const currentLinesRemoveRange =
        direction === -1
            ? currentLinesRange.with({
                  start: currentLinesRange.start.translate(-surroundedEmptyLinesCount),
                  end: expandPosWithEol(1, currentLinesRange.end, document),
              })
            : currentLinesRange.with(expandPosWithEol(-1, currentLinesRange.start, document), currentLinesRange.end.translate(surroundedEmptyLinesCount))

    const linesBetween = direction === 1 ? swapRange.start.line - curRange.end.line : curRange.start.line - swapRange.end.line

    const { contentClean, endsComma } = getCommaHandledContent(currentLinesContent)

    const swapLinesRange = swapRange.with({ end: swapRange.end.with(undefined, Number.POSITIVE_INFINITY) })
    const swapContent = document.getText(swapLinesRange)
    const { contentClean: swapContentClean, endsComma: swapEndsComma } = getCommaHandledContent(swapContent)
    const handlePrevContentComma = (edit: vscode.TextEditorEdit) => {
        if (!builtinCommaHandling) return
        // todo check also range end
        const endPos = offsetPosition(document, swapRange.start, swapContentClean.length)
        if (direction === 1 && match.isNextLast && !swapEndsComma) edit.insert(endPos, ',')
        if (direction === -1 && match.isCurrentLast && swapEndsComma) edit.delete(new vscode.Range(endPos.translate(0, -1), endPos))
        return swapEndsComma
    }

    const newContentHandled = (): string => {
        if ((!endsComma && !swapEndsComma) || !builtinCommaHandling) return currentLinesContent
        // todo check also range end, end+1
        if (direction === 1 && match.isNextLast && endsComma)
            return currentLinesContent.slice(0, contentClean.length - 1) + currentLinesContent.slice(contentClean.length)
        if (direction === -1 && match.isCurrentLast && !endsComma)
            return `${currentLinesContent.slice(0, contentClean.length)},${currentLinesContent.slice(contentClean.length)}`

        return currentLinesContent
    }

    await editor.edit(edit => {
        if (endsComma || swapEndsComma) handlePrevContentComma(edit)

        edit.delete(currentLinesRemoveRange)

        if (direction === -1) edit.insert(swapRange.start.with(undefined, 0), `${newContentHandled()}\n${surroundedEmptyLinesContent}`)
        else edit.insert(swapRange.end.with(undefined, Number.POSITIVE_INFINITY), `\n${surroundedEmptyLinesContent}${newContentHandled()}`)
    })
    return (swapRange.end.line - swapRange.start.line + linesBetween) * direction
}
