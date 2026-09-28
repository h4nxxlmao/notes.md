# Markdown Notes

A minimal, self-contained Markdown note-taking web app. Pure HTML, CSS, and vanilla JavaScript with zero dependencies and no build step. Notes are saved directly to your browser's `IndexedDB` with `localStorage` fallback.

## Features

- **Live Preview:** Side-by-side editing and rendering.
- **Custom View Modes:** Switch between split view, editor-only, and preview-only.
- **Fast Auto-save:** Asynchronous, non-blocking persistence using IndexedDB.
- **Search & Sort:** Filter notes instantly by title or content; sort by last modified, creation date, or alphabetical title.
- **Pinning:** Pin important notes to the top of the sidebar.
- **Resizable Split Pane:** Drag the divider to adjust editor vs. preview width.
- **Safe Parser:** Hand-rolled DOM-based Markdown parser without `innerHTML` injection.
- **Responsive:** Desktop two-pane layout with collapsible sidebar for mobile.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+S` / `Cmd+S` | Save immediately |
| `Ctrl+N` / `Cmd+N` | New note |
| `Tab` | Insert 2 spaces |
| `Esc` | Close modal / sidebar |

## Running Locally

No dependencies or node modules required. Open `index.html` directly in your browser, or serve it locally:

```bash
# Using Python
python -m http.server 8000

# Using Node / npx
npx serve .
```

## Structure

```
.
├── index.html      # Markup and modal dialogs
├── style.css       # CSS layout and theme variables
└── script.js       # Markdown parser, state management, and event handling
```

## Supported Markdown

- Headings (`#` to `######`)
- Emphasis (`**bold**`, `*italic*`, `***both***`)
- Inline code (`` `code` ``) and fenced blocks (```` ```code ``` ````)
- Blockquotes (`> quote`)
- Unordered (`-`, `*`, `+`) and ordered (`1.`) lists
- Links (`[title](url)`)
- Horizontal rules (`---`)

## License

[MIT](LICENSE) © [hanx](https://hanx.pro)
