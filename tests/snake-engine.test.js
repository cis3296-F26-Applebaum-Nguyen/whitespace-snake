// Run with: node --test snake-engine.test.js
const test = require("node:test");
const assert = require("node:assert");
const SnakeEngine = require("../whitespace-snake-extension/scripts/snake-engine.js");
const open = () => true;

test("starts with the body trailing behind the head", () => {
    const s = new SnakeEngine({ x: 100, y: 50, segmentSize: 10, initialLength: 3, isPlayable: open });
    assert.deepStrictEqual(s.getSegments(), [
        { x: 100, y: 50 }, { x: 90, y: 50 }, { x: 80, y: 50 },
    ]);
});

test("moves one segment per tick and keeps its length", () => {
    const s = new SnakeEngine({ x: 100, y: 50, initialLength: 3, isPlayable: open });
    s.tick();
    assert.deepStrictEqual(s.getHead(), { x: 110, y: 50 });
    assert.strictEqual(s.length, 3);
});

test("ignores 180-degree turns and applies queued turns one per tick", () => {
    const s = new SnakeEngine({ x: 100, y: 100, isPlayable: open });
    assert.strictEqual(s.setDirection("left"), false);
    assert.strictEqual(s.setDirection("up"), true);
    assert.strictEqual(s.setDirection("left"), true);
    s.tick();
    assert.deepStrictEqual(s.getHead(), { x: 100, y: 90 });
    s.tick();
    assert.deepStrictEqual(s.getHead(), { x: 90, y: 90 });
});

test("grow adds segments over the next ticks", () => {
    const s = new SnakeEngine({ x: 100, y: 100, initialLength: 3, isPlayable: open });
    s.grow(2);
    s.tick(); s.tick(); s.tick();
    assert.strictEqual(s.length, 5);
});

test("dies when moving into a non-playable area", () => {
    const s = new SnakeEngine({ x: 100, y: 100, isPlayable: (x) => x < 110 });
    const r = s.tick();
    assert.deepStrictEqual([r.alive, r.reason], [false, "blocked"]);
    assert.strictEqual(s.tick().alive, false);
});

test("dies when running into itself", () => {
    const s = new SnakeEngine({ x: 100, y: 100, initialLength: 5, isPlayable: open });
    s.setDirection("down"); s.tick();
    s.setDirection("left"); s.tick();
    s.setDirection("up");
    const r = s.tick();
    assert.deepStrictEqual([r.alive, r.reason], [false, "self"]);
});

test("can move into the cell the tail is leaving", () => {
    const s = new SnakeEngine({ x: 100, y: 100, initialLength: 4, isPlayable: open });
    s.setDirection("down"); s.tick();
    s.setDirection("left"); s.tick();
    s.setDirection("up");
    assert.strictEqual(s.tick().alive, true);
});

test("hitsBody helps avoid spawning apples on the snake", () => {
    const s = new SnakeEngine({ x: 100, y: 100, initialLength: 3, isPlayable: open });
    assert.strictEqual(s.hitsBody(95, 100), true);
    assert.strictEqual(s.hitsBody(200, 200), false);
});

test("keyToDirection handles arrows and WASD", () => {
    assert.strictEqual(SnakeEngine.keyToDirection("ArrowUp"), "up");
    assert.strictEqual(SnakeEngine.keyToDirection("d"), "right");
    assert.strictEqual(SnakeEngine.keyToDirection("x"), null);
});

test("eating an apple grows the snake on that tick", () => {
    let apple = { x: 110, y: 100 };
    const s = new SnakeEngine({
        x: 100,
        y: 100,
        initialLength: 3,
        isPlayable: open,
        getApple: () => apple,
    });

    const firstTick = s.tick();
    assert.strictEqual(firstTick.ateApple, true);
    assert.strictEqual(s.length, 4);

    apple = { x: 120, y: 100 };
    const secondTick = s.tick();
    assert.strictEqual(secondTick.ateApple, true);
    assert.strictEqual(s.length, 5);
});
test("no apple in the way means no growth", () => {
    const s = new SnakeEngine({ x: 100, y: 100, initialLength: 3, isPlayable: open, getApple: () => ({ x: 500, y: 500 }) });
    const r = s.tick();
    assert.strictEqual(r.ateApple, false);
    assert.strictEqual(s.length, 3);
});

test("spawns an apple on a playable grid position", () => {
    const s = new SnakeEngine({
        x: 10,
        y: 10,
        initialLength: 1,
        segmentSize: 10,
        isPlayable: (x, y) => x === 20 && y === 0,
    });

    assert.deepStrictEqual(s.spawnApple({ width: 30, height: 20, random: () => 0 }), {
        x: 20, y: 0, size: 10,
    });
});

test("returns null when no playable apple position is available", () => {
    const s = new SnakeEngine({ x: 10, y: 10, isPlayable: () => false });
    assert.strictEqual(s.spawnApple({ width: 100, height: 100 }), null);
});
