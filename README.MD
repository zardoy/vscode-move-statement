# VS Code Move Statement

TL;DR:

1. Works almost with any language.
2. Two main commands: *Move Statement: Move Statement Up* & *Move Statement: Move Statement Down*.

> Experimental VS Code extension for moving statements using document outline (aka [breadcrumbs](https://code.visualstudio.com/docs/editor/editingevolved#_breadcrumbs)) knowledge. That's why it is language-independent (if your language has outline support), but it can't be 100% accurate in all cases.

This way mainly created as replacement for *Move Line* commands and works well for JSON, HTML/Vue and other declarative languages. And for literal properties in any language.

Also in JavaScript/TypeScript:

- const & type, interface and other declarations
- JSX elements (with [TypeScript Essential Plugins](https://marketplace.visualstudio.com/items?itemName=zardoy.ts-essential-plugins) & `"tsEssentialPlugins.patchOutline": true`)

## Bind Commands

There are no default keybindings, however you can (and probably should) set them:

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
