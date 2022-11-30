import * as vscode from 'vscode'

type SymbolKind = keyof typeof vscode.SymbolKind | number

export type Configuration = {
    // todo set default to [] (disabled by default for all langs)
    /**
     * Supported kinds to check on current item to move (leave empty to disable language support)
     * By default * - enabled for all
     * @default *
     * */
    supportedKinds: SymbolKind[] | '*'
    /**
     * Do not move statements if they have different symbol kinds. Recommended (at least for js)
     * @default false
     */
    rejectDifferentKinds: boolean
    // todo implement!
    /**
     * @default true
     */
    // pullSurroundedContent: boolean
    /**
     * @default false
     */
    'builtinCommaHandling.enabled': boolean
    /**
     * @uniqueItems
     * @default ["json", "javascript", "javascriptreact", "typescript", "typescriptreact"]
     */
    // 'builtinCommaHandling.languages': string[]
    /** @default true */
    // apiChangesImprovements: boolean,
}
