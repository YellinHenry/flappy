//# 1. Make sure you're in your project directory
//git add .
//git commit -m "Changes"
//git push origin main  

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
// make canvas bigger for chart
canvas.width = 1200;
canvas.height = 500;

// ----- GAME VARS -----
let gameActive = true;          // is game running?
let score = 0;                  // player score
let restartTimer = 0;           // countdown to auto restart
let restartCountdown = 10;      // seconds till restart
let isFirstPipe = true;         // first pipe flag

// ----- TIMER STUFF -----
let gameTimer = 180;            // 3 min game time (seconds)
let pauseTimer = 0;             // pause duration (seconds)
let isPaused = false;           // is game paused?

// ----- FLAPPY BIRD SETTINGS -----
let pipeSpeed = 2.0;            // how fast pipes move
let pipeGap = 250;              // gap between pipes
let pipeInterval = 8000;        // ms between new pipes

// ----- GRIP GAME VARS -----
let gripGameActive = false;     // is grip game running?
let gripGameTimer = 0;          // grip game timer
let currentResistance = 10;     // current resistance (lbs)
let currentReps = 0;            // completed reps
let maxReps = 10;               // reps needed to advance
let gripHighScore = 0;          // best resistance completed
let enduranceScore = 0;         // total endurance points
let lastSqueezeTime = 0;        // time of last squeeze
let cooldownPeriod = 500;       // ms between squeezes
let squeezeInProgress = false;  // is player squeezing?
let resistanceLevels = [10, 8, 6, 4, 2, 1]; // resistance levels
let currentResistanceIndex = 0; // current level index
let gripGameTimeLimit = 10;     // seconds per level
let gripGameTimeRemaining = 10; // seconds left in level
let gripGameTimerInterval = null; // timer reference
let gripGameFailed = false;     // track if grip game failed

// ----- CHART STUFF -----
let chartData = [];             // data for chart
let currentInputValue = "";     // current input text
let isInputActive = false;      // is chart input active?
let chartWidth = 200;           // width of chart area
let gameAreaX = 0;              // game area x position
let gameAreaWidth = 1000;       // game area width

// ----- BIRD PROPERTIES -----
let bird = {
    x: 50,                      // bird x position
    y: 200,                     // bird y position
    radius: 15,                 // bird size
    velocity: 0,                // bird vertical speed
    gravity: 0.3,               // gravity pull
    jump: -7,                   // jump strength
    fastJump: -1.2              // fast jump boost
};

// ----- PIPE STUFF -----
let pipes = [];                 // array of pipes
let pipeWidth = 50;             // width of pipes

// ----- INPUT TRACKING -----
let keysPressed = {};           // which keys are pressed

// ----- GET CURRENT DATE FOR CHART -----
function getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

// add today's date to chart
chartData.push({ date: getCurrentDate(), value: "" });

// ----- GET HIGH SCORE FROM STORAGE -----
function getHighScore() {
    return parseInt(localStorage.getItem("highScore")) || 0;
}

// ----- GET GRIP HIGH SCORE FROM STORAGE -----
function getGripHighScore() {
    return parseInt(localStorage.getItem("gripHighScore")) || 0;
}

// ----- GET ENDURANCE SCORE FROM STORAGE -----
function getEnduranceScore() {
    return parseInt(localStorage.getItem("enduranceScore")) || 0;
}

// create first pipe
createPipe();

// start making pipes regularly
let pipeGenerationInterval = setInterval(createPipe, pipeInterval);

// ----- CREATE A NEW PIPE -----
function createPipe() {
    let height = Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50;
    let startX = gameAreaWidth;
    
    // place first pipe closer to player
    if (isFirstPipe) {
        startX = gameAreaWidth / 2;  // half way across screen
        isFirstPipe = false;
    }
    
    pipes.push({ 
        x: startX,              // pipe x position
        topHeight: height,      // top pipe height
        bottomY: height + pipeGap, // bottom pipe y position
        passed: false           // has bird passed this pipe?
    });
}

// ----- KEYBOARD CONTROLS -----
document.addEventListener("keydown", function(event) {
    const key = event.key.toLowerCase();
    keysPressed[key] = true;

    // restart with A key
    if (key === 'a' && !gameActive && restartTimer <= 0) {
        resetGame();
    }

    // space = jump or restart
    if (event.code === "Space") {
        // restart game
        if (!gameActive && restartTimer <= 0) {
            resetGame();
        }
        // jump in flappy bird
        if (gameActive && !isPaused && !gripGameActive) {
            bird.velocity = bird.jump;
        }
        // squeeze in grip game
        if (gripGameActive && !squeezeInProgress && Date.now() - lastSqueezeTime > cooldownPeriod) {
            squeezeInProgress = true;
            handleGripSqueeze();
        }
    }
    
    // ----- CHART INPUT HANDLING -----
    if (isInputActive) {
        if (event.key === "Enter") {
            // save input and add new row
            chartData[chartData.length - 1].value = currentInputValue;
            chartData.push({ date: getCurrentDate(), value: "" });
            currentInputValue = "";
        }
        else if (event.key === "Backspace") {
            // delete last character
            currentInputValue = currentInputValue.slice(0, -1);
        }
        else if (/^\d$/.test(event.key)) {  // only allow numbers
            currentInputValue += event.key;
        }
        event.preventDefault();  // prevent default keyboard actions
    }
    
    // toggle chart input with Tab
    if (event.key === "Tab") {
        isInputActive = !isInputActive;
        event.preventDefault();
    }
});

// ----- KEYBOARD RELEASE HANDLING -----
document.addEventListener("keyup", function(event) {
    keysPressed[event.key.toLowerCase()] = false;
    
    // release grip squeeze
    if (event.code === "Space" && gripGameActive) {
        squeezeInProgress = false;
    }
});

// ----- TOUCH CONTROLS -----
canvas.addEventListener("touchstart", function(event) {
    event.preventDefault();
    // restart game
    if (!gameActive && restartTimer <= 0) {
        resetGame();
    }
    // jump in flappy bird
    if (gameActive && !isPaused && !gripGameActive) {
        bird.velocity = bird.jump;
    }
    // squeeze in grip game
    if (gripGameActive && !squeezeInProgress && Date.now() - lastSqueezeTime > cooldownPeriod) {
        squeezeInProgress = true;
        handleGripSqueeze();
    }
});

// ----- TOUCH END HANDLER -----
canvas.addEventListener("touchend", function(event) {
    if (gripGameActive) {
        squeezeInProgress = false;
    }
});

// ----- MOUSE CLICK HANDLER -----
canvas.addEventListener("click", function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // check if clicked in chart area
    if (x > gameAreaWidth) {
        isInputActive = true;
    } else {
        // normal game click
        if (!gameActive && restartTimer <= 0) {
            resetGame();
        }
        // jump in flappy bird
        if (gameActive && !isPaused && !gripGameActive) {
            bird.velocity = bird.jump;
        }
        // squeeze in grip game
        if (gripGameActive && !squeezeInProgress && Date.now() - lastSqueezeTime > cooldownPeriod) {
            squeezeInProgress = true;
            handleGripSqueeze();
            
            // auto-release squeeze after short delay
            setTimeout(() => {
                squeezeInProgress = false;
            }, 300);
        }
    }
});

// ----- HANDLE GRIP SQUEEZE ACTION -----
function handleGripSqueeze() {
    lastSqueezeTime = Date.now();
    currentReps++;
    
    // check if completed all reps at current level
    if (currentReps >= maxReps) {
        // update high score if best resistance yet
        if (resistanceLevels[currentResistanceIndex] > gripHighScore) {
            gripHighScore = resistanceLevels[currentResistanceIndex];
            localStorage.setItem("gripHighScore", gripHighScore);
        }
        
        // add points to endurance score
        enduranceScore += resistanceLevels[currentResistanceIndex];
        localStorage.setItem("enduranceScore", enduranceScore);
        
        // go to next resistance level
        currentResistanceIndex++;
        currentReps = 0;
        resetGripGameTimer();
        
        // check if completed all levels
        if (currentResistanceIndex >= resistanceLevels.length) {
            // all done! back to flappy bird
            finishGripGame();
        }
    }
}

// ----- RESET GRIP GAME TIMER -----
function resetGripGameTimer() {
    gripGameTimeRemaining = gripGameTimeLimit;
    clearInterval(gripGameTimerInterval);
    gripGameTimerInterval = setInterval(() => {
        gripGameTimeRemaining--;
        if (gripGameTimeRemaining <= 0) {
            // time's up! failed the test - return to flappy bird
            clearInterval(gripGameTimerInterval);
            failGripGame(); // NEW FUNCTION to handle failing
        }
    }, 1000);
}

// ----- HANDLE FAILED GRIP GAME -----
function failGripGame() {
    clearInterval(gripGameTimerInterval);
    gripGameActive = false;
    gripGameFailed = true; // Flag to prevent re-entering grip game
    
    // Update endurance score for partial completion
    if (currentReps > 0 && currentResistanceIndex < resistanceLevels.length) {
        // Add points for partial completion at current level
        const partialPoints = Math.floor((currentReps / maxReps) * resistanceLevels[currentResistanceIndex]);
        enduranceScore += partialPoints;
        localStorage.setItem("enduranceScore", enduranceScore);
    }
    
    // Add today's endurance score to chart
    chartData[chartData.length - 1].value = enduranceScore.toString();
    chartData.push({ date: getCurrentDate(), value: "" });
    currentInputValue = "";
    
    // Reset grip game variables but keep the score
    currentReps = 0;
    squeezeInProgress = false;
    
    // Return to flappy bird
    isPaused = false;
    
    console.log("Grip game failed - returning to Flappy Bird permanently");
}

// ----- FINISH GRIP GAME SUCCESSFULLY -----
function finishGripGame() {
    clearInterval(gripGameTimerInterval);
    gripGameActive = false;
    gripGameFailed = true; // Flag to prevent re-entering grip game
    
    // Add today's endurance score to chart
    chartData[chartData.length - 1].value = enduranceScore.toString();
    chartData.push({ date: getCurrentDate(), value: "" });
    currentInputValue = "";
    
    // Return to flappy bird with the same score
    if (gameTimer <= 0) {
        gameOver();
    } else {
        // Resume flappy bird
        isPaused = false;
        
        // Reset grip game variables
        currentReps = 0;
        squeezeInProgress = false;
    }
    
    console.log("Grip game completed successfully - returning to Flappy Bird permanently");
}

// ----- START GRIP STRENGTH GAME -----
function startGripGame() {
    // Don't restart grip game if it was already failed or completed
    if (gripGameFailed) {
        return;
    }
    
    gripGameActive = true;
    currentResistance = resistanceLevels[0];
    currentResistanceIndex = 0;
    currentReps = 0;
    
    // get existing high score
    gripHighScore = getGripHighScore();
    enduranceScore = getEnduranceScore();
    
    // start the grip game timer
    resetGripGameTimer();
}

// ----- MAIN GAME UPDATE LOOP -----
function update() {
    // Only start grip game if not failed previously
    if (gameActive && !isPaused && !gripGameActive && !gripGameFailed && gameTimer <= 160) {
        startGripGame();
    }
    
    // skip flappy bird logic if grip game is active
    if (gripGameActive) {
        return;
    }
    
    // update game timer
    if (gameActive && !isPaused) {
        gameTimer -= 1/60; // 60 FPS
        
        // time's up - pause for 30 seconds
        if (gameTimer <= 0) {
            isPaused = true;
            pauseTimer = 30;
        }
    }
    
    // handle pause timer
    if (isPaused) {
        pauseTimer -= 1/60;
        if (pauseTimer <= 0) {
            isPaused = false;
            gameTimer = 180; // reset to 3 minutes
        }
        return; 
    }

    // if game over, handle restart timer
    if (!gameActive) {
        if (restartTimer > 0) {
            restartTimer -= (1/60); 
            if (restartTimer <= 0) {
                restartCountdown = 0;
            }
        }
        return;
    }

    // ----- BIRD PHYSICS -----
    if (keysPressed['a'] && gameActive) {
        // special A key boost
        bird.velocity += bird.fastJump;
        if (bird.velocity < -5) {
            bird.velocity = -5; // limit max speed
        }
        bird.velocity += bird.gravity * 0.5; // less gravity with boost
    } else {
        bird.velocity += bird.gravity; // normal gravity
    }

    bird.y += bird.velocity; // move bird

    // ----- PIPE MOVEMENT -----
    for (let i = 0; i < pipes.length; i++) {
        pipes[i].x -= pipeSpeed; // move pipes left

        // check if bird passed pipe
        if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
            pipes[i].passed = true;
            score++; // add point
        }
    }

    // remove pipes that are off-screen
    if (pipes.length > 0 && pipes[0].x + pipeWidth < 0) {
        pipes.shift();
    }

    // ----- COLLISION DETECTION -----
    for (let pipe of pipes) {
        if (
            (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipeWidth) &&
            (bird.y - bird.radius < pipe.topHeight || bird.y + bird.radius > pipe.bottomY)
        ) {
            gameOver(); // hit pipe - game over
        }
    }

    // check if bird hit top or bottom of screen
    if (bird.y + bird.radius > canvas.height || bird.y - bird.radius < 0) {
        gameOver();
    }
}

// ----- FORMAT TIME AS MM:SS -----
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// ----- MAIN DRAW FUNCTION -----
function draw() {
    // sky background
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // draw game or grip test
    if (gripGameActive) {
        drawGripGame();
    } else {
        drawGame();
    }
    
    // draw chart area (right side)
    drawChart();
    
    // draw pause overlay
    if (isPaused && !gripGameActive) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameAreaX, 0, gameAreaWidth, canvas.height);
        
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Paused", gameAreaWidth / 2, canvas.height / 2 - 50);
        
        ctx.font = "36px Arial";
        ctx.fillText(`Resuming in: ${Math.ceil(pauseTimer)}s`, gameAreaWidth / 2, canvas.height / 2);
        
        ctx.textAlign = "left"; // reset alignment
    }

    // ----- GAME OVER SCREEN -----
    if (!gameActive) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameAreaX, 0, gameAreaWidth, canvas.height);
        
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", gameAreaWidth / 2, canvas.height / 2 - 50);
        
        ctx.font = "36px Arial";
        ctx.fillText("Score: " + score, gameAreaWidth / 2, canvas.height / 2);
        ctx.fillText("Grip Strength: " + gripHighScore + " lbs", gameAreaWidth / 2, canvas.height / 2 + 40);
        ctx.fillText("Endurance Score: " + enduranceScore, gameAreaWidth / 2, canvas.height / 2 + 80);
        
        if (restartTimer > 0) {
            const secondsLeft = Math.ceil(restartTimer);
            ctx.fillText(`Play again in: ${secondsLeft}s`, gameAreaWidth / 2, canvas.height / 2 + 120);
        } else {
            ctx.fillText("press space to play again", gameAreaWidth / 2, canvas.height / 2 + 120);
        }
        
        ctx.textAlign = "left"; // reset text alignment
    }
}

// ----- DRAW GRIP GAME SCREEN -----
function drawGripGame() {
    // background
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(gameAreaX, 0, gameAreaWidth, canvas.height);
    
    // title
    ctx.fillStyle = "#333";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GRIP STRENGTH TEST", gameAreaWidth / 2, 60);
    
    // current resistance level
    ctx.font = "bold 28px Arial";
    ctx.fillText(`${resistanceLevels[currentResistanceIndex]} lbs`, gameAreaWidth / 2, 120);
    
    // time remaining (red when low)
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = gripGameTimeRemaining <= 3 ? "red" : "#333";
    ctx.fillText(`Time: ${gripGameTimeRemaining}s`, gameAreaWidth / 2, 160);
    ctx.fillStyle = "#333"; // reset color
    
    // draw grip tool
    drawGripTool(gameAreaWidth / 2, canvas.height / 2);
    
    // reps counter
    ctx.font = "bold 24px Arial";
    ctx.fillText(`Reps: ${currentReps} / ${maxReps}`, gameAreaWidth / 2, canvas.height / 2 + 120);
    
    // high score
    ctx.font = "20px Arial";
    ctx.fillText(`Grip High Score: ${gripHighScore} lbs`, gameAreaWidth / 2, canvas.height / 2 + 160);
    ctx.fillText(`Current Endurance Score: ${enduranceScore}`, gameAreaWidth / 2, canvas.height / 2 + 190);
    
    // instructions
    ctx.font = "18px Arial";
    ctx.fillText("Press SPACE or Click to squeeze", gameAreaWidth / 2, canvas.height - 40);
    
    ctx.textAlign = "left"; // reset alignment
}

// ----- DRAW GRIP TOOL VISUALS -----
function drawGripTool(x, y) {
    // grip tool dimensions
    const gripWidth = 80;
    const gripHeight = 160;
    
    // base
    ctx.fillStyle = "#444";
    ctx.fillRect(x - gripWidth/2, y - gripHeight/2, gripWidth, gripHeight);
    
    // grip handles (change position when squeezed)
    ctx.fillStyle = "#222";
    
    // left handle
    if (squeezeInProgress) {
        // closer when squeezing
        ctx.fillRect(x - gripWidth/2 - 20, y - gripHeight/3, 30, gripHeight/1.5);
    } else {
        // normal position
        ctx.fillRect(x - gripWidth/2 - 40, y - gripHeight/3, 30, gripHeight/1.5);
    }
    
    // right handle
    if (squeezeInProgress) {
        // closer when squeezing
        ctx.fillRect(x + gripWidth/2 - 10, y - gripHeight/3, 30, gripHeight/1.5);
    } else {
        // normal position
        ctx.fillRect(x + gripWidth/2 + 10, y - gripHeight/3, 30, gripHeight/1.5);
    }
    
    // resistance indicator (progress bar)
    const resistanceHeight = (gripHeight - 20) * (currentReps / maxReps);
    ctx.fillStyle = "#ff5722";
    ctx.fillRect(x - 10, y + gripHeight/2 - 10 - resistanceHeight, 20, resistanceHeight);
}

// ----- DRAW DATA CHART -----
function drawChart() {
    // chart background (right side)
    const chartX = gameAreaWidth;
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(chartX, 0, chartWidth, canvas.height);
    
    // chart border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(chartX, 0, chartWidth, canvas.height);
    
    // chart title
    ctx.fillStyle = "#333";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Date Chart", chartX + chartWidth / 2, 30);
    ctx.textAlign = "left";
    
    // headers
    ctx.font = "bold 16px Arial";
    ctx.fillText("Date", chartX + 20, 60);
    ctx.fillText("Number", chartX + 120, 60);
    
    // line under headers
    ctx.beginPath();
    ctx.moveTo(chartX + 10, 70);
    ctx.lineTo(chartX + chartWidth - 10, 70);
    ctx.stroke();
    
    // chart data rows
    ctx.font = "14px Arial";
    let y = 100;
    const maxDisplay = 10; // max rows to show
    
    // show newest entries first
    const startIdx = Math.max(0, chartData.length - maxDisplay);
    for (let i = startIdx; i < chartData.length; i++) {
        const item = chartData[i];
        ctx.fillText(item.date, chartX + 20, y);
        
        // highlight active input row
        if (i === chartData.length - 1 && isInputActive) {
            ctx.fillStyle = "rgba(0, 100, 255, 0.2)";
            ctx.fillRect(chartX + 110, y - 15, 80, 20);
            ctx.fillStyle = "#333";
            
            // blinking cursor
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                const textWidth = ctx.measureText(currentInputValue).width;
                ctx.fillRect(chartX + 120 + textWidth, y - 12, 1, 14);
            }
        }
        
        ctx.fillText(i === chartData.length - 1 ? currentInputValue : item.value, chartX + 120, y);
        y += 30;
    }
    
    // input instructions
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.font = "italic 12px Arial";
    ctx.fillText("Press Tab to focus input", chartX + 20, canvas.height - 40);
    ctx.fillText("Enter digits and press Enter", chartX + 20, canvas.height - 20);
}

// ----- DRAW MAIN GAME (FLAPPY BIRD) -----
function drawGame() {
    // ----- DRAW PIPES -----
    ctx.fillStyle = "rgb(229,232,14)";
    for (let pipe of pipes) {
        // top pipe
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        // bottom pipe
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
        
        // pipe shadows
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(pipe.x + 5, 0, 10, pipe.topHeight);
        ctx.fillRect(pipe.x + 5, pipe.bottomY, 10, canvas.height - pipe.bottomY);
        ctx.fillStyle = "rgb(229,232,14)"; // reset color
    }

    // ----- DRAW BIRD -----
    // shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(bird.x + 5, bird.y + 5, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // bird body
    ctx.fillStyle = "#673AB7";
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    // draw boost flame when holding A
    if (keysPressed['a'] && gameActive && !isPaused && !gripGameActive) {
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.moveTo(bird.x - bird.radius, bird.y);
        ctx.lineTo(bird.x - bird.radius - 15, bird.y - 5);
        ctx.lineTo(bird.x - bird.radius - 15, bird.y + 5);
        ctx.fill();
    }

    // ----- DRAW SCORES & INFO -----
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Score: " + score, 10, 30);
    ctx.fillText("High Score: " + getHighScore(), 10, 60);
    ctx.fillText("Grip High Score: " + getGripHighScore() + " lbs", 10, 90);
    
    // timer (red when low)
    ctx.textAlign = "right";
    ctx.fillStyle = gameTimer < 30 ? "red" : "white";
    ctx.fillText("Time: " + formatTime(gameTimer), gameAreaWidth - 10, 30);
    
    // grip game countdown (only show if not failed already)
    if (!gripGameFailed && gameTimer > 140 && gameTimer <= 160) {
        ctx.fillStyle = "yellow";
        ctx.fillText("Grip Game in: " + Math.ceil(gameTimer - 160) + "s", gameAreaWidth - 10, 60);
    }
    
    // if grip game was failed, show status
    if (gripGameFailed) {
        ctx.fillStyle = "orange";
        ctx.fillText("Grip Test Complete", gameAreaWidth - 10, 60);
    }
    
    ctx.textAlign = "left"; // reset alignment
}

// ----- GAME OVER HANDLER -----
function gameOver() {
    gameActive = false;
    gripGameActive = false;
    clearInterval(pipeGenerationInterval);
    clearInterval(gripGameTimerInterval);
    restartTimer = 10; // 10 sec cooldown
    restartCountdown = 10;

    // save high score if better than previous
    if (score > getHighScore()) {
        localStorage.setItem("highScore", score);
        console.log("🎉 New high score saved:", score);
    }
}

// ----- RESET GAME TO START -----
function resetGame() {
    gameActive = true;
    gripGameActive = false;
    gripGameFailed = false; // Reset this too so grip game can happen again
    score = 0;
    bird.y = 200;
    bird.velocity = 0;
    pipes = [];
    isFirstPipe = true;  // reset first pipe flag
    createPipe();
    clearInterval(pipeGenerationInterval);
    pipeGenerationInterval = setInterval(createPipe, pipeInterval);
    restartTimer = 0;
    gameTimer = 180; // reset to 3 minutes
    isPaused = false;
    
    // reset grip game vars
    currentResistanceIndex = 0;
    currentReps = 0;
    clearInterval(gripGameTimerInterval);
    
    // reset endurance score for new game
    enduranceScore = 0;
}

// ----- MAIN GAME LOOP -----
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// start the game!
gameLoop();