const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = 400;
canvas.height = 500;

// Game 
let gameActive = true;
let score = 0;

// Bird properties
let bird = {
    x: 50,
    y: 200,
    radius: 15,
    velocity: 0,
    gravity: 0.5,
    jump: -7,
    fastJump: -1.2  
};


// Pipe rules
let pipes = [];
let pipeWidth = 50;
let pipeGap = 300;
let pipeSpeed = 1.2;

// Key tracking
let keysPressed = {};

// Get high score from localStorage
function getHighScore() {
    return parseInt(localStorage.getItem("highScore")) || 0;
}

// Create first pipe
createPipe();

// Start pipe generation
let pipeInterval = setInterval(createPipe, 6000);

function createPipe() {
    let height = Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50;
    pipes.push({ 
        x: canvas.width, 
        topHeight: height, 
        bottomY: height + pipeGap,
        passed: false
    });
}

// Handle key press
document.addEventListener("keydown", function(event) {
    const key = event.key.toLowerCase();
    keysPressed[key] = true;

    if (key === 'a' && !gameActive) {
        resetGame();
    }

    if (event.code === "Space") {
        if (!gameActive) {
            resetGame();
        }
        bird.velocity = bird.jump;
    }
});

// Handle key release
document.addEventListener("keyup", function(event) {
    keysPressed[event.key.toLowerCase()] = false;
});

// Touch support
canvas.addEventListener("touchstart", function(event) {
    event.preventDefault();
    if (!gameActive) {
        resetGame();
    }
    bird.velocity = bird.jump;
});

// Mouse click
canvas.addEventListener("click", function(event) {
    if (!gameActive) {
        resetGame();
    }
    bird.velocity = bird.jump;
});

function update() {
    if (!gameActive) return;

    if (keysPressed['a'] && gameActive) {
        bird.velocity += bird.fastJump;
        if (bird.velocity < -5) {
            bird.velocity = -5;
        }
        bird.velocity += bird.gravity * 0.5;
    } else {
        bird.velocity += bird.gravity;
    }

    bird.y += bird.velocity;

    for (let i = 0; i < pipes.length; i++) {
        pipes[i].x -= pipeSpeed;

        if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
            pipes[i].passed = true;
            score++;
        }
    }

    if (pipes.length > 0 && pipes[0].x + pipeWidth < 0) {
        pipes.shift();
    }

    for (let pipe of pipes) {
        if (
            (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipeWidth) &&
            (bird.y - bird.radius < pipe.topHeight || bird.y + bird.radius > pipe.bottomY)
        ) {
            gameOver();
        }
    }

    if (bird.y + bird.radius > canvas.height || bird.y - bird.radius < 0) {
        gameOver();
    }
}

function draw() {
    // Background
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pipes
    ctx.fillStyle = "rgb(229,232,14)";
    for (let pipe of pipes) {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
    }

    // Bird
    ctx.fillStyle = "#673AB7";
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    if (keysPressed['a'] && gameActive) {
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.moveTo(bird.x - bird.radius, bird.y);
        ctx.lineTo(bird.x - bird.radius - 15, bird.y - 5);
        ctx.lineTo(bird.x - bird.radius - 15, bird.y + 5);
        ctx.fill();
    }

    // Score
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Score: " + score, 10, 30);
    ctx.fillText("High Score: " + getHighScore(), 10, 60);

    // Controls info
    if (gameActive) {
        ctx.font = "16px Arial";
        ctx.fillText("HOLD 'A' TO FLY UP!", 10, canvas.height - 20);
        ctx.font = "14px Arial";
        ctx.fillText("Click/Space to jump", 10, canvas.height - 40);
    }

    if (!gameActive) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2);
        ctx.font = "20px Arial";
        ctx.fillText("Press 'A' or Space to Restart", canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = "left";
    }
}

function gameOver() {
    gameActive = false;
    clearInterval(pipeInterval);

    // Save high score
    if (score > getHighScore()) {
        localStorage.setItem("highScore", score);
        console.log("🎉 New high score saved:", score);
    }
}

function resetGame() {
    gameActive = true;
    score = 0;
    bird.y = 200;
    bird.velocity = 0;
    pipes = [];
    createPipe();
    clearInterval(pipeInterval);
    pipeInterval = setInterval(createPipe, 6000);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();