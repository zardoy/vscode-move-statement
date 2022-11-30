# VS Code Move Statement

TL;DR:

1. Works almost with any language.
2. Two main commands: *Move Statement: Move Statement Up* & *Move Statement: Move Statement Down*.

> Experimental VS Code extension for moving statements using document outline (aka [breadcrumbs](https://code.visualstudio.com/docs/editor/editingevolved#_breadcrumbs)) knowledge. That's why it is language-independent (if your language has outline support), but it can't be 100% accurate in all cases.

This way mainly created (and works well) for JSON and HTML (including vue templates), properties in any language.

In JavaScript/TypeScript:

- properties
- const & type, interface and other declarations
- JSX elements (with [TypeScript Essential Plugins](https://marketplace.visualstudio.com/items?itemName=zardoy.ts-essential-plugins) & `"tsEssentialPlugins.patchOutline": true`)

## Bind Commands

There are not default keybindings, however you can (and probably should) add them:

In `keybindings.json` (`> Preferences: Open Keyboard Shortcuts (JSON)`):

```json
{
  "key": "alt+shift+d",
  "command": "moveStatement.moveStatementDown",
  "when": "editorTextFocus"
},
{
  "key": "alt+shift+u",
  "command": "moveStatement.moveStatementUp",
  "when": "editorTextFocus"
}
```

Alternatively, you can bind them to `alt+up`, `alt+down` respectively.
