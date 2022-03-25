import * as vscode from 'vscode'

type SymbolKind = keyof typeof vscode.SymbolKind | number

// const d: SnippetType = ''

export type Configuration = {
    /**
     * Map: language - supported kinds (leave empty to enable for all)
     * @default { "js": ["Property"] }
     * */
    supportedLanguages: { [language: string]: SymbolKind[] }
}
