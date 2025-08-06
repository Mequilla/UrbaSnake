const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.querySelector('.score');
const highScoreElement = document.querySelector('.high-score');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

const gameConfig = {
    gridSize: 20,
    gameSpeed: 8,
    imagePaths: {
        snakeHead: 'img/img_urb.png',
        food: 'img/img_afro.jpg',
        backgrounds: [
            'img/bg1.jpg', 'img/bg2.jpg', 'img/bg3.jpg',
            'img/bg4.jpg', 'img/bg5.jpg', 'img/bg6.jpg', 'img/bg7.jpg'
        ]
    },
    soundPaths: {
        eat: 'sound/beep.mp3'
    },
    highScoreKey: 'snake-high-score-img-v3'
};

let snake, food, direction, score, highScore, isGameOver, isPaused;
let currentBgImage, snakeBodyGradient, gridCanvas;
let lastFrameTime = 0, animationFrameId;
const images = {};
let eatSound;

function loadAssets() {
    images.snakeHead = new Image();
    images.snakeHead.src = gameConfig.imagePaths.snakeHead;

    images.food = new Image();
    images.food.src = gameConfig.imagePaths.food;

    images.backgrounds = gameConfig.imagePaths.backgrounds.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });
    eatSound = new Audio(gameConfig.soundPaths.eat);
}

function createPreRenderedGrid() {
    gridCanvas = document.createElement('canvas');
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    const gridCtx = gridCanvas.getContext('2d');

    gridCtx.strokeStyle = "rgba(224, 216, 255, 0.35)";
    gridCtx.lineWidth = 1;
    for (let x = 0; x <= gridCanvas.width; x += gameConfig.gridSize) {
        gridCtx.beginPath();
        gridCtx.moveTo(x, 0);
        gridCtx.lineTo(x, gridCanvas.height);
        gridCtx.stroke();
    }
    for (let y = 0; y <= gridCanvas.height; y += gameConfig.gridSize) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, y);
        gridCtx.lineTo(gridCanvas.width, y);
        gridCtx.stroke();
    }
}

function setupGame() {
    snake = [{ x: 10, y: 10 }];
    direction = 'right';
    score = 0;
    highScore = localStorage.getItem(gameConfig.highScoreKey) || 0;
    isGameOver = false;
    isPaused = false;

    scoreElement.innerText = `СЧЕТ: ${score}`;
    highScoreElement.innerText = `РЕКОРД: ${highScore}`;
    gameOverScreen.classList.add('hidden');

    snakeBodyGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    snakeBodyGradient.addColorStop(0, '#00f260');
    snakeBodyGradient.addColorStop(1, '#0575e6');

    changeBackground();
    createFood();

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    animationFrameId = requestAnimationFrame(gameLoop);
    if (isGameOver) return;

    drawGame();

    if (isPaused) {
        drawPauseOverlay();
        return;
    }

    const secondsSinceLastFrame = (currentTime - lastFrameTime) / 1000;
    if (secondsSinceLastFrame < 1 / gameConfig.gameSpeed) {
        return;
    }

    lastFrameTime = currentTime;

    updateGameState();
}

function updateGameState() {
    const head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    snake.unshift(head);

    if (hasCollided()) {
        endGame();
        return;
    }

    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreElement.innerText = `СЧЕТ: ${score}`;
        if (eatSound) {
            eatSound.currentTime = 0;
            eatSound.play();
        }

        createFood();
        changeBackground();
    } else {
        snake.pop();
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentBgImage && currentBgImage.complete) {
        ctx.save();
        ctx.filter = 'blur(2px) brightness(0.6)';
        ctx.drawImage(currentBgImage, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    if (gridCanvas) ctx.drawImage(gridCanvas, 0, 0);

    drawDirectionArrow();
    drawFood();
    drawSnake();
}

function drawPauseOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '50px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
}

function drawDirectionArrow() {
    if (isPaused) return;

    const head = snake[0];
    let targetX = head.x;
    let targetY = head.y;

    switch (direction) {
        case 'up': targetY--; break;
        case 'down': targetY++; break;
        case 'left': targetX--; break;
        case 'right': targetX++; break;
    }

    const gridSize = gameConfig.gridSize;
    const centerX = targetX * gridSize + gridSize / 2;
    const centerY = targetY * gridSize + gridSize / 2;
    const arrowSize = gridSize * 0.4;

    let angle = 0;
    if (direction === 'right') angle = 0;
    if (direction === 'down') angle = Math.PI / 2;
    if (direction === 'left') angle = Math.PI;
    if (direction === 'up') angle = -Math.PI / 2;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    ctx.fillStyle = 'rgba(224, 216, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(arrowSize / 2, 0);
    ctx.lineTo(-arrowSize / 2, -arrowSize / 2);
    ctx.lineTo(-arrowSize / 2, arrowSize / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawFood() {
    const foodImg = images.food;
    if (foodImg && foodImg.complete) {
        const pulse = isPaused ? 2 : Math.sin(Date.now() * 0.01) * 2 + 2;
        const size = gameConfig.gridSize + pulse;
        ctx.drawImage(
            foodImg,
            food.x * gameConfig.gridSize - pulse / 2,
            food.y * gameConfig.gridSize - pulse / 2,
            size,
            size
        );
    }
}

function drawSnake() {
    const headImg = images.snakeHead;
    snake.forEach((segment, index) => {
        if (index === 0 && headImg && headImg.complete) {
            ctx.drawImage(headImg, segment.x * gameConfig.gridSize, segment.y * gameConfig.gridSize, gameConfig.gridSize, gameConfig.gridSize);
        } else {
            ctx.fillStyle = snakeBodyGradient;
            ctx.beginPath();
            ctx.roundRect(segment.x * gameConfig.gridSize, segment.y * gameConfig.gridSize, gameConfig.gridSize, gameConfig.gridSize, [5]);
            ctx.fill();
        }
    });
}

function changeBackground() {
    const bgImages = images.backgrounds;
    if (bgImages && bgImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * bgImages.length);
        currentBgImage = bgImages[randomIndex];
    }
}

function createFood() {
    food = {
        x: Math.floor(Math.random() * (canvas.width / gameConfig.gridSize)),
        y: Math.floor(Math.random() * (canvas.height / gameConfig.gridSize))
    };
    if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        createFood();
    }
}

function hasCollided() {
    const head = snake[0];
    const hitWall = head.x < 0 || head.x >= canvas.width / gameConfig.gridSize || head.y < 0 || head.y >= canvas.height / gameConfig.gridSize;
    const hitSelf = snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
    return hitWall || hitSelf;
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(animationFrameId);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem(gameConfig.highScoreKey, highScore);
        highScoreElement.innerText = `РЕКОРД: ${highScore}`;
    }
    finalScoreElement.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (!isPaused) {
        lastFrameTime = performance.now();
    }
}

function handleKeyPress(e) {
    if (e.key === ' ') {
        e.preventDefault();
        togglePause();
        return;
    }

    if (isPaused || isGameOver) return;

    const key = e.key;
    const keyLower = key.toLowerCase();

    if ((key === 'ArrowUp' || keyLower === 'w') && direction !== 'down') {
        direction = 'up';
    } else if ((key === 'ArrowDown' || keyLower === 's') && direction !== 'up') {
        direction = 'down';
    } else if ((key === 'ArrowLeft' || keyLower === 'a') && direction !== 'right') {
        direction = 'left';
    } else if ((key === 'ArrowRight' || keyLower === 'd') && direction !== 'left') {
        direction = 'right';
    }
}

document.addEventListener('keydown', handleKeyPress);
restartButton.addEventListener('click', setupGame);

document.addEventListener('visibilitychange', () => {
    if (document.hidden && !isGameOver && !isPaused) {
        togglePause();
    }
});

loadAssets();
createPreRenderedGrid();
setupGame();