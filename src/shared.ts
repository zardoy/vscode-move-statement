import * as vscode from 'vscode'

export const getHandledContent = (
    currentLinesContent: string,
    direction: -1 | 1,
    match:
        | Record<'prev' | 'current' | 'next', vscode.DocumentSymbol | undefined> & {
              current: vscode.DocumentSymbol
              isCurrentLast: boolean
              isNextLast: boolean
          },
): string => {
    const { contentClean, endsComma } = getCommaHandledContent(currentLinesContent)
    // todo check also range end, end+1
    if (direction === 1 && match.isNextLast && endsComma)
        return currentLinesContent.slice(0, contentClean.length - 1) + currentLinesContent.slice(contentClean.length)
    if (direction === -1 && match.isCurrentLast && !endsComma)
        return `${currentLinesContent.slice(0, contentClean.length)},${currentLinesContent.slice(contentClean.length)}`

    return currentLinesContent
}

export const getCommaHandledContent = (content: string) => {
    const contentClean = content.replace(/[\n\s]+$/, '')
    return {
        contentClean,
        endsComma: contentClean.endsWith(','),
    }
}

export const expandPosWithEol = (direction: -1 | 1, pos: vscode.Position, document: vscode.TextDocument) => {
    if (direction === -1) {
        const prevLine = getLineSafe(document, pos.line - 1)
        return prevLine?.range.end ?? pos
    }

    return document.lineAt(pos).rangeIncludingLineBreak.end
}

export const getWhitespaceLines = (lineNum: number, direction: 1 | -1, document: vscode.TextDocument) => {
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

const getLineSafe = (document: vscode.TextDocument, line: number) => {
    try {
        return document.lineAt(line)
    } catch {
        return null
    }
}
