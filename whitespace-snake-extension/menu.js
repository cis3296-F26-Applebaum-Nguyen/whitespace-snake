(() => {
  // Prevent duplicate injection if script runs twice
  if (document.getElementById('snake-ext-root')) return;
  if (typeof window.SnakeEngine !== 'function') {
    console.warn('SnakeEngine not loaded before Menu.js');
    return;
  }

  const SEGMENT_SIZE = 15;
  const HUD_HEIGHT = 40; // px

  //Independent State
  const state = {
    gameStatus: 'RUNNING', // 'RUNNING' | 'PAUSED' | 'OVER'
    isVisible: true,
    tickCount: 0,
    loopId: null,
    fps: 4
  };

  //Build & Inject DOM
  const root = document.createElement('div');
  root.id = 'snake-ext-root';
  root.innerHTML = `
    <div id="snake-hud">
      <span>Ticks: <span id="snake-tick-val">0</span></span>
      <div class="snake-hud-actions">
        <button id="snake-toggle-pause-btn" class="snake-btn" type="button">Pause</button>
        <button id="snake-close-btn" class="snake-btn snake-btn-close" type="button" aria-label="Close">✕</button>
      </div>
    </div>
    <div id="snake-board-area">
      <canvas id="snake-canvas" width="300" height="300"></canvas>
      <div id="snake-pause-overlay" class="is-hidden">
        <h3 id="snake-pause-title">PAUSED</h3>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Cache references
  const tickEl = document.getElementById('snake-tick-val');
  const togglePauseBtn = document.getElementById('snake-toggle-pause-btn');
  const closeBtn = document.getElementById('snake-close-btn');
  const pauseOverlay = document.getElementById('snake-pause-overlay');
  const pauseTitleEl = document.getElementById('snake-pause-title');
  const canvas = document.getElementById('snake-canvas');
  const ctx = canvas.getContext('2d');

  //SnakeEngine Setup
  let apple = null;
  
  // Fill the viewport, snapped to the segment grid
  const boardSize = { width: 0, height: 0 };
  canvas.width = Math.floor(root.clientWidth / SEGMENT_SIZE) * SEGMENT_SIZE;
  canvas.height = Math.floor((root.clientHeight - HUD_HEIGHT) / SEGMENT_SIZE) * SEGMENT_SIZE;
  boardSize.width = canvas.width;
  boardSize.height = canvas.height;

  const snake = new window.SnakeEngine({
    x: SEGMENT_SIZE * 4,
    y: SEGMENT_SIZE * 6,
    segmentSize: SEGMENT_SIZE,
    initialLength: 4,
    direction: 'right',
    isPlayable: (x, y, size) =>
      x >= 0 && y >= 0 && x + size <= canvas.width && y + size <= canvas.height,
    getApple: () => apple
  });
  apple = snake.spawnApple(boardSize);

  //Lifecycle & Loop Management
  function startLoop() {
    if (state.loopId !== null) return;

    state.loopId = setInterval(() => {
      if (state.gameStatus !== 'RUNNING') return;
      tick();
      render();
    }, 1000 / state.fps);
  }

  function stopLoop() {
    if (state.loopId !== null) {
      clearInterval(state.loopId);
      state.loopId = null;
    }
  }

  function pauseGame() {
    if (state.gameStatus === 'OVER') return;
    state.gameStatus = 'PAUSED';
    stopLoop();
    syncUI();
  }

  function resumeGame() {
    if (state.gameStatus === 'OVER') return;
    state.gameStatus = 'RUNNING';
    syncUI();
    startLoop();
  }
  
  function respawnGame() {
    snake.reset();
    apple = snake.spawnApple(boardSize);
    state.tickCount = 0;
    state.gameStatus = 'RUNNING';
    stopLoop();
    syncUI();
    render();
    startLoop();
  }

  function hideContainer() {
    // Closing hides the UI and pauses an active game while preserving ticks & snake
    state.isVisible = false;
    pauseGame();
    syncUI();
  }

  function showContainer() {
    // Reopening shows the container in its PAUSED state; requires explicit resume
    state.isVisible = true;
    syncUI();
    render();
  }

  function toggleContainer() {
    state.isVisible ? hideContainer() : showContainer();
  }

  //UI & Canvas Rendering
  function syncUI() {
    root.classList.toggle('is-hidden', !state.isVisible);

    const isPaused = state.gameStatus === 'PAUSED';
    const isOver = state.gameStatus === 'OVER';
    const showOverlay = isPaused || isOver;

    pauseOverlay.classList.toggle('is-hidden', !showOverlay);

    if(isOver){
        pauseTitleEl.textContent ='Game Over';
        togglePauseBtn.textContent = 'Respawn';

    }else{
        pauseTitleEl.textContent ='Paused';  
        togglePauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    }
    tickEl.textContent = state.tickCount;
  }

  function tick() {
    const result = snake.tick();
    if (result.ateApple) apple = snake.spawnApple(boardSize);
    state.tickCount += 1;
    tickEl.textContent = state.tickCount;

    if (!result.alive) {
      state.gameStatus = 'OVER';
      stopLoop();
      syncUI();
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw snake segments (head slightly darker)
    const segments = snake.getSegments();
    segments.forEach((seg, index) => {
      ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e';
      ctx.fillRect(seg.x, seg.y, SEGMENT_SIZE - 1, SEGMENT_SIZE - 1);
    });
    if (apple) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(apple.x, apple.y, SEGMENT_SIZE - 1, SEGMENT_SIZE - 1);
    }

  }

  //Event Listeners
  togglePauseBtn.addEventListener('click', () => {
    if (state.gameStatus === 'OVER') {
      respawnGame();
    }else if (state.gameStatus === 'RUNNING') {
        pauseGame();
    }else{
        resumeGame();
    }
  });

  closeBtn.addEventListener('click', () => {
    hideContainer();
  });

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'PLAY_GAME') {
        state.isVisible = true;
        if (state.gameStatus === 'OVER') {
          respawnGame();
        } else if (state.gameStatus === 'PAUSED') {
          resumeGame();
        } else {
          syncUI();
          render();
          startLoop();
        }
      }
    });
  }

  window.addEventListener(
    'keydown',
    (e) => {
      // Shortcut to reopen when closed: Alt + S
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        e.stopPropagation();
        state.isVisible ? hideContainer() : showContainer();
        return;
      }


      if (!state.isVisible) return;

      const dir = window.SnakeEngine.keyToDirection(e.key);
      const isPauseKey = e.code === 'KeyP' || e.code === 'Escape';

      if (dir || isPauseKey) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (dir && state.gameStatus === 'RUNNING') {
        snake.setDirection(dir);
      } else if (isPauseKey) {
        if (state.gameStatus === 'RUNNING') {
          pauseGame();
        } else if (state.gameStatus === 'PAUSED') {
          resumeGame();
        }
      }
    },
    true
  );

  // Boot
  render();
  syncUI();
  startLoop();
})();