
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const startBtn = document.getElementById("startBtn");

canvas.width = 800;
canvas.height = 450;

let score = 0;
let speed = 3;
let gameRunning = false;
let animationId;

let best = Number(localStorage.getItem("ballFallBest")) || 0;
bestElement.textContent = best;

const ball = {
    x: 400,
    y: 350,
    radius: 13,
    moveSpeed: 6
};

let obstacles = [];
let mouseX = null;
let driftDirection = 1;
let driftSpeed = 2;

const keys = {
    left: false,
    right: false
};

// KEYBOARD CONTROLS

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
});

// MOUSE CONTROLS

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
});

canvas.addEventListener("mouseleave", () => {
    mouseX = null;
});

// MOBILE TOUCH CONTROLS

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;

    mouseX = touchX * (canvas.width / rect.width);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;

    mouseX = touchX * (canvas.width / rect.width);
}, { passive: false });

canvas.addEventListener("touchend", () => {
    mouseX = null;
});

// BACKGROUND

function drawBackground() {
    ctx.save();

    const bg = ctx.createLinearGradient(0, 0, 0, 450);
    bg.addColorStop(0, "#050505");
    bg.addColorStop(0.5, "#111111");
    bg.addColorStop(1, "#050505");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 800, 450);

    const arena = ctx.createLinearGradient(0, 0, 0, 450);
    arena.addColorStop(0, "#191919");
    arena.addColorStop(0.5, "#101010");
    arena.addColorStop(1, "#1b1b1b");

    ctx.fillStyle = arena;
    ctx.beginPath();
    ctx.moveTo(180, 0);
    ctx.lineTo(620, 0);
    ctx.lineTo(760, 450);
    ctx.lineTo(40, 450);
    ctx.closePath();
    ctx.fill();

    // METALLIC SIDE WALLS

    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(255,255,255,0.35)";

    const rail = ctx.createLinearGradient(0, 0, 800, 0);
    rail.addColorStop(0, "#ffffff");
    rail.addColorStop(0.5, "#999999");
    rail.addColorStop(1, "#ffffff");

    ctx.strokeStyle = rail;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(180, 0);
    ctx.lineTo(40, 450);
    ctx.moveTo(620, 0);
    ctx.lineTo(760, 450);
    ctx.stroke();

    ctx.restore();
}

// BALL

function drawBall() {
    ctx.save();

    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(220,220,220,0.35)";

    const gradient = ctx.createRadialGradient(
        ball.x - 5,
        ball.y - 6,
        1,
        ball.x,
        ball.y,
        ball.radius
    );

    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.18, "#eeeeee");
    gradient.addColorStop(0.42, "#a8a8a8");
    gradient.addColorStop(0.72, "#555555");
    gradient.addColorStop(1, "#171717");

    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.75)";

    ctx.beginPath();
    ctx.arc(ball.x - 5, ball.y - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
}

// CREATE FALLING OBSTACLES

function createObstacle() {
    const wallWidth = Math.min(350, 150 + score / 15);

    const leftLimit = 50;
    const rightLimit = 750;

    const x = leftLimit + Math.random() * (rightLimit - leftLimit - wallWidth);

    obstacles.push({
        x: x,
        y: -30,
        width: wallWidth,
        height: 10
    });
}
// DRAW OBSTACLES

function drawObstacles() {
    ctx.save();

    obstacles.forEach(o => {
        const metal = ctx.createLinearGradient(
            o.x, o.y, o.x, o.y + o.height
        );

        metal.addColorStop(0, "#ffffff");
        metal.addColorStop(0.25, "#bdbdbd");
        metal.addColorStop(0.6, "#777777");
        metal.addColorStop(1, "#333333");

        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(255,255,255,0.18)";

        ctx.fillStyle = metal;
        ctx.fillRect(o.x, o.y, o.width, o.height);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#d0d0d0";
        ctx.lineWidth = 0.7;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
    });

    ctx.restore();
}

// BALL MOVEMENT AND SIDE WALL COLLISION

function updateBall() {

    // Automatic movement
    ball.x += driftDirection * driftSpeed;

    // Mouse and touch movement
    if (mouseX !== null) {
        ball.x += (mouseX - ball.x) * 0.12;
    }

    // Keyboard movement
    if (keys.left) ball.x -= ball.moveSpeed;
    if (keys.right) ball.x += ball.moveSpeed;

    // Keep inside the canvas
    ball.x = Math.max(
        ball.radius,
        Math.min(canvas.width - ball.radius, ball.x)
    );

    // Calculate diagonal side wall positions
    const leftWallX = 180 - (140 * ball.y / canvas.height);
    const rightWallX = 620 + (140 * ball.y / canvas.height);

    // Touching either side wall ends the game
    if (
        ball.x - ball.radius <= leftWallX ||
        ball.x + ball.radius >= rightWallX
    ) {
        endGame();
        return;
    }
}

// FALLING OBSTACLE MOVEMENT AND COLLISION

function updateObstacles() {
    for (let o of obstacles) {
        o.y += speed;

        const hit =
            ball.x + ball.radius > o.x &&
            ball.x - ball.radius < o.x + o.width &&
            ball.y + ball.radius > o.y &&
            ball.y - ball.radius < o.y + o.height;

        if (hit) {
            endGame();
            return;
        }
    }

    obstacles = obstacles.filter(o => o.y < 470);
}

// MAIN GAME LOOP

function gameLoop() {
    if (!gameRunning) return;

    drawBackground();

    updateBall();

    if (!gameRunning) return;

    updateObstacles();

    if (!gameRunning) return;

    drawObstacles();
    drawBall();

    score++;
    scoreElement.textContent = score;

    speed = Math.min(12, 3 + score / 250);

    const interval = Math.max(25, 90 - Math.floor(score / 100));

    if (score % interval === 0) {
        createObstacle();
    }

    animationId = requestAnimationFrame(gameLoop);
}

// START GAME

function startGame() {
    cancelAnimationFrame(animationId);

    score = 0;
    speed = 3;
    obstacles = [];

    ball.x = 400;
    mouseX = null;
    driftDirection = 1;

    gameRunning = true;

    scoreElement.textContent = 0;
    startBtn.textContent = "RESTART GAME";

    gameLoop();
}

// GAME OVER

function endGame() {
    if (!gameRunning) return;

    gameRunning = false;
    cancelAnimationFrame(animationId);

    if (score > best) {
        best = score;
        localStorage.setItem("ballFallBest", best);
        bestElement.textContent = best;
    }

    drawBackground();
    drawObstacles();
    drawBall();

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, 800, 450);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 42px Arial";
    ctx.fillText("GAME OVER", 400, 210);

    ctx.font = "20px Arial";
    ctx.fillText("SCORE: " + score, 400, 250);
}

// INTRO SCREEN

const introScreen = document.getElementById("introScreen");
const gameScreen = document.getElementById("gameScreen");
const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", () => {
    introScreen.style.display = "none";
    gameScreen.style.display = "block";
    startGame();
});

startBtn.addEventListener("click", startGame);

