<div align="center">

# WhiteSpace Snake Game

Turn any webpage into a game board.

</div>

## Project Abstract

Browser games live in their own tabs or sites, which pulls users out of what they were doing and ignores the page in front of them. Short breaks during reading, research, or waiting on a page end up as a context switch to a separate app, even though most webpages have plenty of unused space that goes to waste.

The extension is built for everyday web users and students who want a quick, low-friction break while browsing. It’s also useful to developers and hobbyists interested in how browser extensions interact with a live DOM.

White Space Snake is a Chrome extension that runs a classic Snake game directly on the page the user is viewing. The extension analyzes the page’s layout to find empty regions, such as margins, sidebars, and gaps between content blocks, and uses them as the playable area. The host page’s own structure becomes the game board, so the snake moves through the white space around the content without covering it. Users start the game from the toolbar button or a keyboard shortcut and can close it at any time, which leaves the page as they found it.

## High-Level Requirements

What the current version does:

- **Game on top of any webpage:** A Snake board covers the page the user is viewing, with no need to open another tab or site. It runs on regular webpages through a Chrome content script.
- **Classic Snake controls:** The snake moves automatically on a grid. The user steers with the arrow keys or WASD, and an instant reversal into the snake's own body is ignored.
- **Apples and growth:** An apple appears on a random open square, never on the snake. Eating it grows the snake by one segment and a new apple appears.
- **Game over and respawn:** The game ends when the snake hits itself or the edge of the board. A GAME OVER screen offers a Respawn button.
- **Pause and resume:** The user can pause and resume with the on-screen button, the P key, or Esc.
- **HUD:** A bar at the top of the board shows the number of moves made and holds the Pause and Close buttons.
- **Open and close:** The ✕ button hides the game (and pauses it), and Alt + S shows or hides it from the keyboard.

Planned:

- **Page-aware board:** Use the page's empty space as the playable area, so the snake moves around the content instead of over it. Right now the board is a plain rectangle covering the page.
- **Toolbar start button:** Start the game from the extension's toolbar popup. The popup is currently a placeholder.

## Conceptual Design

White Space Snake is a Chrome extension (Manifest V3) written in JavaScript, HTML, and CSS. It runs entirely in the browser with no backend.

- **Game engine (`scripts/snake-engine.js`):** Holds the snake's movement rules, queued turns, growth, collision checks, and apple spawning. It knows nothing about the webpage. It asks an `isPlayable(x, y, size)` function whether a square is free, and a `getApple()` function where the apple is, so the board can change without touching the engine.
- **Game UI (`menu.js`, `style.css`):** A content script that builds the fullscreen overlay, HUD, and pause screen, draws the game on an HTML canvas, runs the game loop on a timer, and handles keyboard input. It sizes the canvas to the browser window, snapped to the 15px grid.
- **Manifest (`manifest.json`):** Injects the engine, UI script, and stylesheet into webpages, and registers the toolbar popup and icon.
- **Popup (`popup/popup.html`):** The toolbar button's menu, currently a placeholder. `menu.js` already listens for a `PLAY_GAME` message so the popup can start the game later.
- **Testing:** The engine's logic is unit tested with Node's built-in test runner (`tests/snake-engine.test.js`).

## Background

Snake has been around since the late 1990s, when it came preinstalled on Nokia phones, and it is a common first project for learning game development. Browsers already offer small built-in games, such as the offline dinosaur game in Chrome and the Snake game in Google Search, and many websites and extensions host games. All of these run in their own tab, page, or window, separate from what the user was doing.

White Space Snake differs in that the game happens on top of the page the user is already viewing instead of in a separate window. The long-term goal is for the page's own layout to define the board, so ordinary webpages become different levels without any extra content. The project also shows how an extension can inject and run code on a live webpage.

## Required Resources

- **Hardware:** A desktop or laptop computer that can run Google Chrome.
- **Software:**
  - Google Chrome, to load and run the extension
  - Node.js 18 or newer, to run the unit tests (`node --test`)
  - A code editor such as VS Code, plus Git and GitHub for version control and collaboration
- **Services and data:** None. The extension works offline and does not need any external services or data.
- **Specialist knowledge:**
  - JavaScript, HTML, and CSS
  - Chrome extension development (Manifest V3, content scripts, popup, message passing)
  - HTML canvas drawing and game-loop concepts


## Initial Set-up

1. Open Google Chrome and go to chrome://extensions/.
2. Toggle Developer mode on in the top-right corner.
3. Click the Load unpacked button.
4. Select your project folder.
5. Click your new extension icon in the toolbar to test it
