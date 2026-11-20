/**
 * SnakeEngine — movement rules and snake state for White Space Snake.
 *
 * Coordinates are CSS viewport pixels (same space as a fixed full-screen overlay canvas).
 * The snake moves in fixed steps of `segmentSize` px per tick. Each segment is a square
 * whose top-left corner is {x, y}.
 *
 * The engine knows nothing about the page. It asks `isPlayable(x, y, size)` before moving,
 * so the pixel map / game board can be swapped without touching this file.
 *
 * Usage:
 *   const snake = new SnakeEngine({
 *     x: 200, y: 200,
 *     segmentSize: 10,
 *     isPlayable: (x, y, size) => pixelMap.isWhiteArea(x, y, size), // from the board/pixel-map code
 *   });
 *   document.addEventListener("keydown", (e) => {
 *     const dir = SnakeEngine.keyToDirection(e.key);
 *     if (dir) { snake.setDirection(dir); e.preventDefault(); }
 *   });
 *   const timer = setInterval(() => {
 *     const result = snake.tick();
 *     if (!result.alive) clearInterval(timer);   // result.reason: "blocked" | "self"
 *     draw(snake.getSegments());
 *   }, 100);
 */
(function (root) {
    "use strict";

    const DIRECTIONS = {
        up:    { dx: 0,  dy: -1 },
        down:  { dx: 0,  dy: 1 },
        left:  { dx: -1, dy: 0 },
        right: { dx: 1,  dy: 0 },
    };

    const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

    const KEY_MAP = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
        W: "up", S: "down", A: "left", D: "right",
    };

    const MAX_QUEUED_TURNS = 3;

    class SnakeEngine {
        /**
         * @param {object} opts
         * @param {number} opts.x            Head start x (px)
         * @param {number} opts.y            Head start y (px)
         * @param {number} [opts.segmentSize=10]   Size of one segment and one step (px)
         * @param {number} [opts.initialLength=4]  Number of segments at start
         * @param {"up"|"down"|"left"|"right"} [opts.direction="right"]
         * @param {(x:number, y:number, size:number) => boolean} [opts.isPlayable]
         *        Returns true if the square at (x, y) with side `size` is free to move into.
         *        Defaults to "everything inside the window is playable".
         */
        constructor(opts = {}) {
            this.segmentSize = opts.segmentSize ?? 10;
            this.isPlayable = opts.isPlayable ?? SnakeEngine.insideWindow;
            this.getApple = opts.getApple ?? (() => null);
            this.growthPerApple = Math.max(1, opts.growthPerApple ?? 1);
            this._start = {
                x: opts.x ?? 0,
                y: opts.y ?? 0,
                length: Math.max(1, opts.initialLength ?? 4),
                direction: opts.direction ?? "right",
            };
            if (!DIRECTIONS[this._start.direction]) {
                throw new Error(`Unknown direction: ${this._start.direction}`);
            }
            this.reset();
        }

        /** Put the snake back at its starting position and length. */
        reset() {
            const { x, y, length, direction } = this._start;
            const { dx, dy } = DIRECTIONS[direction];
            this.direction = direction;
            this.turnQueue = [];
            this.pendingGrowth = 0;
            this.alive = true;
            // Body trails behind the head, opposite to the direction of travel.
            this.segments = [];
            for (let i = 0; i < length; i++) {
                this.segments.push({
                    x: x - dx * i * this.segmentSize,
                    y: y - dy * i * this.segmentSize,
                });
            }
        }

        /**
         * Queue a turn. Turns are applied one per tick so fast key presses aren't lost,
         * and a turn straight back into the body (180°) is ignored.
         * @returns {boolean} true if the turn was queued
         */
        setDirection(dir) {
            if (!DIRECTIONS[dir] || !this.alive) return false;
            const last = this.turnQueue.length
                ? this.turnQueue[this.turnQueue.length - 1]
                : this.direction;
            if (dir === last || dir === OPPOSITE[last]) return false;
            if (this.turnQueue.length >= MAX_QUEUED_TURNS) return false;
            this.turnQueue.push(dir);
            return true;
        }

        /** Add `n` segments; they appear over the next `n` ticks. Call when an apple is eaten. */
        grow(n = 1) {
            this.pendingGrowth += Math.max(0, n);
        }

        /** Where the head would go next tick (after applying the next queued turn). */
        peekNextHead() {
            const dir = this.turnQueue.length ? this.turnQueue[0] : this.direction;
            const { dx, dy } = DIRECTIONS[dir];
            const head = this.segments[0];
            return { x: head.x + dx * this.segmentSize, y: head.y + dy * this.segmentSize };
        }

        /**
         * Advance one step.
         * @returns {{alive: boolean, reason: null|"blocked"|"self", head: {x:number,y:number}}}
         */
        tick() {
            if (!this.alive) {
                return { alive: false, reason: this.deathReason, ateApple: false, head: this.getHead() };
            }

            if (this.turnQueue.length) this.direction = this.turnQueue.shift();
            const { dx, dy } = DIRECTIONS[this.direction];
            const head = this.segments[0];
            const next = { x: head.x + dx * this.segmentSize, y: head.y + dy * this.segmentSize };

            if (!this.isPlayable(next.x, next.y, this.segmentSize)) {
                return this._die("blocked");
            }

            const apple = this.getApple();
            const ateApple = apple != null && SnakeEngine.overlaps(
                next.x, next.y, this.segmentSize,
                apple.x, apple.y, apple.size ?? this.segmentSize
            );

            // If not growing, the tail moves out of the way this tick, so it doesn't count.
            const growing = ateApple || this.pendingGrowth > 0;
            if (this.hitsBody(next.x, next.y, { ignoreTail: !growing })) {
                return this._die("self");
            }

            if (ateApple) this.pendingGrowth += this.growthPerApple;

            this.segments.unshift(next);
            if (this.pendingGrowth > 0) this.pendingGrowth--;
            else this.segments.pop();

            return { alive: true, reason: null, ateApple, head: { ...next } };
        }

        /**
         * True if the square at (x, y) overlaps any body segment.
         * Useful for collision detection and for not spawning apples on the snake.
         */
        hitsBody(x, y, { ignoreTail = false, size = this.segmentSize } = {}) {
            const end = ignoreTail ? this.segments.length - 1 : this.segments.length;
            for (let i = 0; i < end; i++) {
                const s = this.segments[i];
                if (SnakeEngine.overlaps(x, y, size, s.x, s.y, this.segmentSize)) return true;
            }
            return false;
        }

        getHead() {
            return { ...this.segments[0] };
        }

        /** Copy of all segments, head first. Safe to hand to rendering code. */
        getSegments() {
            return this.segments.map((s) => ({ ...s }));
        }

        get length() {
            return this.segments.length;
        }

        _die(reason) {
            this.alive = false;
            this.deathReason = reason;
            return { alive: false, reason, ateApple: false, head: this.getHead() };
        }

        // ---------- helpers ----------

        /** Map a KeyboardEvent.key to a direction (arrows and WASD), or null. */
        static keyToDirection(key) {
            return KEY_MAP[key] ?? null;
        }

        /** Axis-aligned square overlap test. */
        static overlaps(ax, ay, asize, bx, by, bsize) {
            return ax < bx + bsize && ax + asize > bx && ay < by + bsize && ay + asize > by;
        }

        /** Default isPlayable: the square must be fully inside the browser window. */
        static insideWindow(x, y, size) {
            const w = typeof window !== "undefined" ? window.innerWidth : Infinity;
            const h = typeof window !== "undefined" ? window.innerHeight : Infinity;
            return x >= 0 && y >= 0 && x + size <= w && y + size <= h;
        }
    }

    SnakeEngine.DIRECTIONS = Object.freeze(Object.keys(DIRECTIONS));

    // Works as a plain content script (global) and in Node/bundlers (module.exports).
    if (typeof module !== "undefined" && module.exports) module.exports = SnakeEngine;
    else root.SnakeEngine = SnakeEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);