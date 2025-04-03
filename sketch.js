const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
// Increase canvas width to accommodate chart without covering game
canvas.width = 1200;
canvas.height = 500;

// Game 
let gameActive = true;
let score = 0;
let restartTimer = 0;
let restartCountdown = 10;
let isFirstPipe = true;  // Track if it's the first pipe

// Timer variables
let gameTimer = 180; // 3 minutes in seconds
let pauseTimer = 0; // 30 seconds pause timer
let isPaused = false;

// Chart data and input field
let chartData = [];
let currentInputValue = "";
let isInputActive = false;
let chartWidth = 200;  // Width of chart area
let gameAreaX = 0;      // Game area starts at 0
let gameAreaWidth = 1000;  // Original game width

// Bird properties - keeping the bird in the original game area
let bird = {
    x: 50,
    y: 200,
    radius: 15,
    velocity: 0,
    gravity: 0.3,
    jump: -7,
    fastJump: -1.2  
};

// Pipe rules
let pipes = [];
let pipeWidth = 50;
let pipeGap = 220;
let pipeSpeed = 1.2;

// Key tracking
let keysPressed = {};

// Add current date to chart data
function getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

// Initialize chart with current date
chartData.push({ date: getCurrentDate(), value: "" });

// Get high score from localStorage
function getHighScore() {
    return parseInt(localStorage.getItem("highScore")) || 0;
}

// Create first pipe closer to the player
createPipe();

// Start pipe generation
let pipeInterval = setInterval(createPipe, 6000);

function createPipe() {
    let height = Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50;
    let startX = gameAreaWidth;
    
    // If it's the first pipe, position it closer
    if (isFirstPipe) {
        startX = gameAreaWidth / 2;  // Start at half the game area width
        isFirstPipe = false;
    }
    
    pipes.push({ 
        x: startX, 
        topHeight: height, 
        bottomY: height + pipeGap,
        passed: false
    });
}

// Handle key press
document.addEventListener("keydown", function(event) {
    const key = event.key.toLowerCase();
    keysPressed[key] = true;

    if (key === 'a' && !gameActive && restartTimer <= 0) {
        resetGame();
    }

    if (event.code === "Space") {
        if (!gameActive && restartTimer <= 0) {
            resetGame();
        }
        if (!isPaused) {
            bird.velocity = bird.jump;
        }
    }
    
    // Handle chart input
    if (isInputActive) {
        if (event.key === "Enter") {
            // Save the current input value
            chartData[chartData.length - 1].value = currentInputValue;
            // Add a new row for next input
            chartData.push({ date: getCurrentDate(), value: "" });
            currentInputValue = "";
        }
        else if (event.key === "Backspace") {
            currentInputValue = currentInputValue.slice(0, -1);
        }
        else if (/^\d$/.test(event.key)) {  // Allow only digits
            currentInputValue += event.key;
        }
        event.preventDefault();  // Prevent default keydown behavior while input is active
    }
    
    // Activate input with Tab key
    if (event.key === "Tab") {
        isInputActive = !isInputActive;
        event.preventDefault();
    }
});

// Handle key release
document.addEventListener("keyup", function(event) {
    keysPressed[event.key.toLowerCase()] = false;
});

// Touch support
canvas.addEventListener("touchstart", function(event) {
    event.preventDefault();
    if (!gameActive && restartTimer <= 0) {
        resetGame();
    }
    if (!isPaused) {
        bird.velocity = bird.jump;
    }
});

// Mouse click
canvas.addEventListener("click", function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if click is in chart area (now on the right side)
    if (x > gameAreaWidth) {
        isInputActive = true;
    } else {
        // Normal game click
        if (!gameActive && restartTimer <= 0) {
            resetGame();
        }
        if (!isPaused) {
            bird.velocity = bird.jump;
        }
    }
});

function update() {
    // Update the game timer
    if (gameActive && !isPaused) {
        gameTimer -= 1/60; // Assuming 60 FPS
        
        // When timer reaches 0, pause game for 30 seconds
        if (gameTimer <= 0) {
            isPaused = true;
            pauseTimer = 30;
        }
    }
    
    // Handle pause timer
    if (isPaused) {
        pauseTimer -= 1/60;
        if (pauseTimer <= 0) {
            isPaused = false;
            gameTimer = 180; // Reset to 3 minutes
        }
        return; // Skip game updates while paused
    }

    if (!gameActive) {
        // Update restart timer
        if (restartTimer > 0) {
            restartTimer -= (1/60); // Assuming 60 FPS
            if (restartTimer <= 0) {
                restartCountdown = 0;
            }
        }
        return;
    }

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

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function draw() {
    // Background for entire canvas
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game area
    drawGame();
    
    // Draw chart area (now on the right side)
    drawChart();
    
    // Draw pause overlay (only over game area)
    if (isPaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameAreaX, 0, gameAreaWidth, canvas.height);
        
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Paused", gameAreaWidth / 2, canvas.height / 2 - 50);
        
        ctx.font = "36px Arial";
        ctx.fillText(`Resuming in: ${Math.ceil(pauseTimer)}s`, gameAreaWidth / 2, canvas.height / 2);
        
        ctx.textAlign = "left"; // Reset alignment
    }

    // Game over screen with restart timer (only over game area)
    if (!gameActive) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameAreaX, 0, gameAreaWidth, canvas.height);
        
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", gameAreaWidth / 2, canvas.height / 2 - 50);
        
        ctx.font = "36px Arial";
        ctx.fillText("Score: " + score, gameAreaWidth / 2, canvas.height / 2);
        
        if (restartTimer > 0) {
            const secondsLeft = Math.ceil(restartTimer);
            ctx.fillText(`Play again in: ${secondsLeft}s`, gameAreaWidth / 2, canvas.height / 2 + 50);
        } else {
            ctx.fillText("play again", gameAreaWidth / 2, canvas.height / 2 + 50);
        }
        
        ctx.textAlign = "left"; // Reset text alignment
    }
}

function drawChart() {
    // Draw chart background (on right side)
    const chartX = gameAreaWidth;
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(chartX, 0, chartWidth, canvas.height);
    
    // Draw chart border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(chartX, 0, chartWidth, canvas.height);
    
    // Draw chart title
    ctx.fillStyle = "#333";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Date Chart", chartX + chartWidth / 2, 30);
    ctx.textAlign = "left";
    
    // Draw chart headers
    ctx.font = "bold 16px Arial";
    ctx.fillText("Date", chartX + 20, 60);
    ctx.fillText("Number", chartX + 120, 60);
    
    // Draw horizontal line under headers
    ctx.beginPath();
    ctx.moveTo(chartX + 10, 70);
    ctx.lineTo(chartX + chartWidth - 10, 70);
    ctx.stroke();
    
    // Draw chart data
    ctx.font = "14px Arial";
    let y = 100;
    const maxDisplay = 10; // Maximum number of entries to display
    
    // Display most recent entries first
    const startIdx = Math.max(0, chartData.length - maxDisplay);
    for (let i = startIdx; i < chartData.length; i++) {
        const item = chartData[i];
        ctx.fillText(item.date, chartX + 20, y);
        
        // Highlight active input row
        if (i === chartData.length - 1 && isInputActive) {
            ctx.fillStyle = "rgba(0, 100, 255, 0.2)";
            ctx.fillRect(chartX + 110, y - 15, 80, 20);
            ctx.fillStyle = "#333";
            
            // Draw blinking cursor
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                const textWidth = ctx.measureText(currentInputValue).width;
                ctx.fillRect(chartX + 120 + textWidth, y - 12, 1, 14);
            }
        }
        
        ctx.fillText(i === chartData.length - 1 ? currentInputValue : item.value, chartX + 120, y);
        y += 30;
    }
    
    // Draw input instructions
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.font = "italic 12px Arial";
    ctx.fillText("Press Tab to focus input", chartX + 20, canvas.height - 40);
    ctx.fillText("Enter digits and press Enter", chartX + 20, canvas.height - 20);
}

function drawGame() {
    // Pipes
    ctx.fillStyle = "rgb(229,232,14)";
    for (let pipe of pipes) {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
        
        // Shadows
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(pipe.x + 5, 0, 10, pipe.topHeight);
        ctx.fillRect(pipe.x + 5, pipe.bottomY, 10, canvas.height - pipe.bottomY);
        ctx.fillStyle = "rgb(229,232,14)"; // Reset color for next pipes
    }

    // Bird with shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(bird.x + 5, bird.y + 5, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#673AB7";
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    if (keysPressed['a'] && gameActive && !isPaused) {
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
    
    // Draw timer in top right corner
    ctx.textAlign = "right";
    ctx.fillStyle = gameTimer < 30 ? "red" : "white"; // Turn red when < 30 seconds
    ctx.fillText("Time: " + formatTime(gameTimer), gameAreaWidth - 10, 30);
    ctx.textAlign = "left"; // Reset alignment
}

function gameOver() {
    gameActive = false;
    clearInterval(pipeInterval);
    restartTimer = 10; // Set 10 second timer
    restartCountdown = 10;

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
    isFirstPipe = true;  // Reset first pipe flag
    createPipe();
    clearInterval(pipeInterval);
    pipeInterval = setInterval(createPipe, 6000);
    restartTimer = 0;
    gameTimer = 180; // Reset to 3 minutes
    isPaused = false;
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();