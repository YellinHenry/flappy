//Henry Yellin 4-10-25
//Hours spent debugging: 18.5

//git add .
//git commit -m "Changes"
//git push origin main  


//______________
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
// make canvas bigger for chart
canvas.width = 1200;
canvas.height = 500;

// ----- GAME VARS -----
let gameActive = false;         // is game running? (starts false until grip test completes)
let score = 0;                  // player score
let restartTimer = 0;           // countdown to auto restart
let restartCountdown = 10;      // seconds till restart
let isFirstPipe = true;         // first pipe flag
let pipeGenerationInterval;     // interval reference for pipe generation

// ----- GAME MODE SELECTION -----
let gameMode = "selection";     // "selection", "flappy", or "endurance"
let showGameSelection = true;   // show game selection screen

// ----- TIMER STUFF -----
let gameTimer = 180;            // 3 min game time in sec
let pauseTimer = 0;             // pause duration in sec
let isPaused = false;           // is game paused?

// ----- FLAPPY BIRD SETTINGS -----
let pipeSpeed = 2.45;            // how fast pipes move
let pipeGap = 250;              // gap between pipes
let pipeInterval = 5500;        // ms between new pipes

// ----- GRIP GAME VARS -----
let gripGameActive = false;      // is grip game running? (now starts false until selected)
let gripGameTimer = 0;          // grip game timer
let currentResistance = 10;     // current resistance (lbs)
let currentReps = 0;            // completed reps
let maxReps = 10;               // reps needed to advance
let gripHighScore = 0;          // best resistance completed
let enduranceScore = 0;         // total endurance points
let lastSqueezeTime = 0;        // time of last squeeze
let cooldownPeriod = 350;       // ms between squeezes
let squeezeInProgress = false;  // is player squeezing?
let resistanceLevels = [];      // will be populated from user input
let startingWeight = 10;        // default starting weight
let currentResistanceIndex = 0; // current level index
let gripGameTimeLimit = 10;     // seconds per level
let gripGameTimeRemaining = 10; // seconds left in level
let gripGameTimerInterval = null; // timer reference
let gripGameFailed = false;     // track if grip game failed
let gripGameCompleted = false;  // track if grip game completed successfully
let weightInputValue = "";      // user input for starting weight
let isWeightInputActive = false; // is weight input active?
let hasStartedGame = false;     // track if user has started the game with custom weight

// ----- CHART STUFF -----
let chartData = [];             // data for chart
let currentInputValue = "";     // current input text
let isInputActive = false;      // is chart input active?
let chartWidth = 200;           // width of chart area
let gameAreaX = 0;              // game area x position
let gameAreaWidth = 1000;       // game area width

// ----- BIRD SHIT -----
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

// ---- CURRENT DATE In MY CHART -----
function getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

// ----- LOAD CHART DATA FROM STORAGE -----
function loadChartData() {
    const savedData = localStorage.getItem("chartData");
    if (savedData) {
        return JSON.parse(savedData);
    }
    return [];
}

// ----- SAVE CHART DATA TO STORAGE -----
function saveChartData(data) {
    localStorage.setItem("chartData", JSON.stringify(data));
}

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

// ----- INITIALIZE CHART DATA -----
function initializeChartData() {
    chartData = loadChartData();
    
    // Check if we already have an entry for today
    const today = getCurrentDate();
    const todayEntry = chartData.find(item => item.date === today);
    
    if (!todayEntry) {
        // No entry for today, add new one
        chartData.push({ date: today, value: "" });
    }
    
    saveChartData(chartData);
}

// Initialize chart data on startup
initializeChartData();

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
    if (key === 'a' && !gameActive && !gripGameActive && restartTimer <= 0) {
        resetGame();
    }

    // space = jump or restart
    if (event.code === "Space") {
        // Handle space in game selection mode
        if (showGameSelection) {
            // Do nothing - let the buttons handle selection
            return;
        }
        
        // restart game
        if (!gameActive && !gripGameActive && restartTimer <= 0) {
            if (gameMode === "flappy") {
                startFlappyBird();
            } else if (gameMode === "endurance") {
                startGripGame();
            }
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
    
    // ----- CHART INPUT STUFF -----
    if (isInputActive) {
        if (event.key === "Enter") {
            // save input and update chart
            const today = getCurrentDate();
            const todayIndex = chartData.findIndex(item => item.date === today);
            
            if (todayIndex !== -1) {
                chartData[todayIndex].value = currentInputValue;
                saveChartData(chartData);
            }
            
            currentInputValue = "";
            isInputActive = false;
        }
        else if (event.key === "Backspace") {
            // delete last character
            currentInputValue = currentInputValue.slice(0, -1);
        }
        else if (/^\d$/.test(event.key)) {  // only allow numbers
            currentInputValue += event.key;
        }
        event.preventDefault();  // prevent keyboard actions
    }
    
    // ----- WEIGHT INPUT STUFF -----
    if (isWeightInputActive) {
        if (event.key === "Enter") {
            // Save weight input and start game
            if (weightInputValue.trim() !== "") {
                startingWeight = parseInt(weightInputValue);
                if (isNaN(startingWeight) || startingWeight <= 0) {
                    startingWeight = 10; // Default if invalid
                }
                weightInputValue = "";
                isWeightInputActive = false;
                hasStartedGame = true;
                
                // Start the grip game with the custom weight
                startGripGame();
            }
        }
        else if (event.key === "Backspace") {
            // delete last character
            weightInputValue = weightInputValue.slice(0, -1);
        }
        else if (/^\d$/.test(event.key)) {  // only allow numbers
            weightInputValue += event.key;
        }
        event.preventDefault();
    }
    
    // move chart input with Tab
    if (event.key === "Tab") {
        isInputActive = !isInputActive;
        event.preventDefault();
    }
});

// ----- KEYBOARD RELEASE Rules -----
document.addEventListener("keyup", function(event) {
    keysPressed[event.key.toLowerCase()] = false;
    
    // release grip squeeze
    if (event.code === "Space" && gripGameActive) {
        squeezeInProgress = false;
    }
});

// Create the game selection buttons
function createGameButtons() {
    // Container for the buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.position = "absolute";
    buttonContainer.style.top = "10px";
    buttonContainer.style.left = "10px";
    buttonContainer.style.zIndex = "10";
    document.body.appendChild(buttonContainer);
    
    // Flappy Bird button
    const flappyButton = document.createElement("button");
    flappyButton.textContent = "Flappy Bird Mode";
    flappyButton.style.padding = "10px 20px";
    flappyButton.style.marginRight = "10px";
    flappyButton.style.backgroundColor = "#673AB7";
    flappyButton.style.color = "white";
    flappyButton.style.border = "none";
    flappyButton.style.borderRadius = "5px";
    flappyButton.style.cursor = "pointer";
    
    flappyButton.addEventListener("click", function() {
        gameMode = "flappy";
        showGameSelection = false;
        resetGame(); // Reset game state
        startFlappyBird(); // Start flappy bird directly
    });
    
    buttonContainer.appendChild(flappyButton);
    
    // Endurance button
    const enduranceButton = document.createElement("button");
    enduranceButton.textContent = "Endurance Test Mode";
    enduranceButton.style.padding = "10px 20px";
    enduranceButton.style.backgroundColor = "#ff0000";
    enduranceButton.style.color = "white";
    enduranceButton.style.border = "none";
    enduranceButton.style.borderRadius = "5px";
    enduranceButton.style.cursor = "pointer";
    
    enduranceButton.addEventListener("click", function() {
        gameMode = "endurance";
        showGameSelection = false;
        resetGame(); // Reset game state
        isWeightInputActive = true; // Activate weight input
    });
    
    buttonContainer.appendChild(enduranceButton);
    
    // Back to selection button (only visible when in a game)
    const backButton = document.createElement("button");
    backButton.textContent = "Back to Selection";
    backButton.style.padding = "10px 20px";
    backButton.style.marginLeft = "10px";
    backButton.style.backgroundColor = "#333";
    backButton.style.color = "white";
    backButton.style.border = "none";
    backButton.style.borderRadius = "5px";
    backButton.style.cursor = "pointer";
    backButton.style.display = "none"; // Hidden initially
    
    backButton.addEventListener("click", function() {
        // Stop any active games
        gameActive = false;
        gripGameActive = false;
        clearInterval(pipeGenerationInterval);
        clearInterval(gripGameTimerInterval);
        
        // Reset to selection mode
        gameMode = "selection";
        showGameSelection = true;
        restartTimer = 0;
        hasStartedGame = false;
        isWeightInputActive = false;
    });
    
    buttonContainer.appendChild(backButton);
    
    // Update the back button visibility based on game state
    setInterval(function() {
        if (showGameSelection) {
            backButton.style.display = "none";
        } else {
            backButton.style.display = "inline-block";
        }
    }, 100);
}

// Create buttons when the page loads
createGameButtons();

// ----- TOUCH CONTROLS -----
canvas.addEventListener("touchstart", function(event) {
    event.preventDefault();
    
    // Handle touch in game selection mode
    if (showGameSelection) {
        return; // Let the buttons handle selection
    }
    
    // restart game
    if (!gameActive && !gripGameActive && restartTimer <= 0) {
        if (gameMode === "flappy") {
            startFlappyBird();
        } else if (gameMode === "endurance") {
            startGripGame();
        }
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

// ----- TOUCH END -----
canvas.addEventListener("touchend", function(event) {
    if (gripGameActive) {
        squeezeInProgress = false;
    }
});

// ----- MOUSE CLICK  -----
canvas.addEventListener("click", function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Handle click in game selection mode
    if (showGameSelection) {
        return; // Let the buttons handle selection
    }
    
    // Handle weight input click when active
    if (isWeightInputActive && !hasStartedGame) {
        // Check if click is in the input box area
        if (x > gameAreaWidth / 2 - 150 && x < gameAreaWidth / 2 + 150 && 
            y > canvas.height / 2 - 20 && y < canvas.height / 2 + 20) {
            // Already active, do nothing
            return;
        } else if (x > gameAreaWidth / 2 - 100 && x < gameAreaWidth / 2 + 100 && 
                  y > canvas.height / 2 + 40 && y < canvas.height / 2 + 80) {
            // Submit button clicked
            if (weightInputValue.trim() !== "") {
                startingWeight = parseInt(weightInputValue);
                if (isNaN(startingWeight) || startingWeight <= 0) {
                    startingWeight = 10; // Default if invalid
                }
                weightInputValue = "";
                isWeightInputActive = false;
                hasStartedGame = true;
                
                // Start the grip game with the custom weight
                startGripGame();
            }
        }
        return;
    }
    
    // check if clicked in chart area
    if (x > gameAreaWidth) {
        isInputActive = true;
    } else {
        // normal game click
        if (!gameActive && !gripGameActive && restartTimer <= 0) {
            if (gameMode === "flappy") {
                startFlappyBird();
            } else if (gameMode === "endurance") {
                if (!hasStartedGame) {
                    isWeightInputActive = true;
                } else {
                    startGripGame();
                }
            }
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

function handleGripSqueeze() {
    // Start timer on first click if timer hasn't started yet
    if (gripGameTimerInterval === null) {
        resetGripGameTimer();
    }
    
    lastSqueezeTime = Date.now();
    currentReps++;
    
    // Update endurance score for each rep (reps * weight)
    enduranceScore += currentResistance;
    localStorage.setItem("enduranceScore", enduranceScore);
    
    // check if completed all reps at current level
    if (currentReps >= maxReps) {
        // update high score if best resistance yet
        if (currentResistance > gripHighScore) {
            gripHighScore = currentResistance;
            localStorage.setItem("gripHighScore", gripHighScore);
        }
        
        // Reset reps counter for next set
        currentReps = 0;
        
        // Reset timer for next level
        clearInterval(gripGameTimerInterval);
        gripGameTimerInterval = null;
        gripGameTimeRemaining = gripGameTimeLimit;
        
        // Success on this weight - keep the same weight for next set
        // (do nothing to currentResistance)
        
        console.log("Completed set at " + currentResistance + " lbs. Continuing with same weight.");
    }
}

// ----- RESET GRIP GAME TIMER -----
function resetGripGameTimer() {
    gripGameTimeRemaining = gripGameTimeLimit;
    clearInterval(gripGameTimerInterval);
    
    // Create a new timer that runs every second
    gripGameTimerInterval = setInterval(() => {
        gripGameTimeRemaining--;
        
        // Check if time's up
        if (gripGameTimeRemaining <= 0) {
            clearInterval(gripGameTimerInterval);
            failGripGame();
        }
    }, 1000);
}

// -----  FAILED GRIP GAME -----
function failGripGame() {
    clearInterval(gripGameTimerInterval);
    
    // If we're already at minimum weight (1 lb)
    if (currentResistance <= 1) {
        // We're done - Go to flappy bird or game over
        gripGameActive = false;
        gripGameFailed = true;
        gripGameCompleted = true;
        
        // Update today's endurance score in chart
        updateTodayScoreInChart();
        
        // Reset grip game variables but keep the score
        currentReps = 0;
        squeezeInProgress = false;
        
        // Start flappy bird only if not in endurance-only mode
        if (gameMode !== "endurance") {
            startFlappyBird();
        } else {
            // In endurance-only mode, just show game over
            restartTimer = 10;
        }
        
        console.log("Grip game failed at minimum weight - Game Over");
    } else {
        // Reduce weight by 1 level
        currentResistance -= 1;
        
        // Reset reps for next set
        currentReps = 0;
        
        // Reset timer
        clearInterval(gripGameTimerInterval);
        gripGameTimerInterval = null;
        gripGameTimeRemaining = gripGameTimeLimit;
        
        console.log("Failed set - Decreasing weight to " + currentResistance + " lbs");
    }
}

// ----- UPDATE TODAY'S SCORE IN CHART -----
function updateTodayScoreInChart() {
    const today = getCurrentDate();
    const todayIndex = chartData.findIndex(item => item.date === today);
    
    if (todayIndex !== -1) {
        // Only update if new score is higher than existing score
        const currentScore = parseInt(chartData[todayIndex].value) || 0;
        if (enduranceScore > currentScore) {
            chartData[todayIndex].value = enduranceScore.toString();
            saveChartData(chartData);
        }
    } else {
        // No entry for today yet, create new one
        chartData.push({ date: today, value: enduranceScore.toString() });
        saveChartData(chartData);
    }
}

// ----- FINISH GRIP GAME SUCCESSFULLY -----
function finishGripGame() {
    clearInterval(gripGameTimerInterval);
    gripGameActive = false;
    gripGameFailed = false;
    gripGameCompleted = true;
    
    // Update today's endurance score in chart
    updateTodayScoreInChart();
    
    // Reset grip game variables but keep the score
    currentReps = 0;
    squeezeInProgress = false;
    
    // Start flappy bird only if not in endurance-only mode
    if (gameMode !== "endurance") {
        startFlappyBird();
    } else {
        // In endurance-only mode, show a congratulations screen
        restartTimer = 10;
    }
    
    console.log("Grip game completed successfully");
}

// ----- START FLAPPY BIRD GAME -----
function startFlappyBird() {
    // Make sure we're in flappy bird mode
    gameMode = "flappy";
    showGameSelection = false;
    
    // Clear all existing pipes first
    pipes = [];
    
    // Make sure bird is in a good starting position
    bird.y = 200;  // Position bird in middle of screen
    bird.velocity = 0;  // Reset velocity to prevent immediate falling
    
    gameActive = true;
    gripGameActive = false;
    isFirstPipe = true;  // Reset first pipe flag
    
    // Clear existing interval if any and create a new one
    clearInterval(pipeGenerationInterval);
    pipeGenerationInterval = setInterval(createPipe, pipeInterval);
    
    // Create first pipe after clearing everything
    createPipe();
}

function startGripGame() {
    // Make sure we're in endurance mode
    gameMode = "endurance";
    showGameSelection = false;
    
    // Reset previous grip game data
    gripGameActive = true;
    gameActive = false;
    gripGameFailed = false;
    gripGameCompleted = false;
    
    // Use the user's starting weight
    currentResistance = startingWeight;
    currentReps = 0;
    
    // get high score
    gripHighScore = getGripHighScore();
    
    // Reset endurance score for new session
    if (!hasStartedGame) {
        enduranceScore = 0;
        localStorage.setItem("enduranceScore", enduranceScore);
        hasStartedGame = true;
    }
    
    // Initialize the timer value but don't start it yet
    gripGameTimeRemaining = gripGameTimeLimit;
    gripGameTimerInterval = null;
}

// Draw game selection screen
function drawGameSelection() {
    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, gameAreaWidth, canvas.height);
    
    // Title
    ctx.fillStyle = "white";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SELECT GAME MODE", gameAreaWidth / 2, 120);
    
    // Instructions
    ctx.font = "24px Arial";
    ctx.fillText("Use the buttons at the top to select a game mode", gameAreaWidth / 2, 180);
    
    // Game descriptions
    ctx.font = "20px Arial";
    ctx.fillText("Flappy Bird: Navigate through pipes by jumping", gameAreaWidth / 2, 250);
    ctx.fillText("Endurance Test: Test your grip strength", gameAreaWidth / 2, 300);
    
    // Previous scores
    ctx.fillText("Previous Scores:", gameAreaWidth / 2, 370);
    ctx.fillText("Flappy Bird High Score: " + getHighScore(), gameAreaWidth / 2, 410);
    ctx.fillText("Grip Strength High Score: " + getGripHighScore() + " lbs", gameAreaWidth / 2, 440);
    ctx.fillText("Endurance Score: " + getEnduranceScore(), gameAreaWidth / 2, 470);
    
    ctx.textAlign = "left"; // Reset alignment
}

// Draw weight input screen
function drawWeightInputScreen() {
    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, gameAreaWidth, canvas.height);
    
    // Title
    ctx.fillStyle = "white";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ENTER STARTING WEIGHT (LBS)", gameAreaWidth / 2, 120);
    
    // Input box
    ctx.fillStyle = "#555";
    ctx.fillRect(gameAreaWidth / 2 - 150, canvas.height / 2 - 20, 300, 40);
    
    // Input text
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    
    // Show input text with blinking cursor
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillText(weightInputValue + "|", gameAreaWidth / 2, canvas.height / 2 + 10);
    } else {
        ctx.fillText(weightInputValue, gameAreaWidth / 2, canvas.height / 2 + 10);
    }
    
    // Submit button
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(gameAreaWidth / 2 - 100, canvas.height / 2 + 40, 200, 40);
    ctx.fillStyle = "white";
    ctx.fillText("Start Game", gameAreaWidth / 2, canvas.height / 2 + 67);
    
    // Instructions
    ctx.font = "18px Arial";
    ctx.fillText("Enter a starting weight in pounds", gameAreaWidth / 2, canvas.height / 2 - 40);
    ctx.fillText("Default: 10 lbs", gameAreaWidth / 2, canvas.height / 2 - 70);
    
    ctx.textAlign = "left"; // Reset alignment
}

// ----- MAIN GAME UPDATE LOOP -----
function update() {
    // If showing game selection, exit early
    if (showGameSelection) {
        return;
    }
    
    // If weight input is active, exit early
    if (isWeightInputActive && !hasStartedGame) {
        return;
    }
    
    // If grip game is active, handle it separately
    if (gripGameActive) {
        return;
    }
    
    // If game is not active yet but grip game is completed, handle based on mode
    if (!gameActive && gripGameCompleted && restartTimer <= 0) {
        if (gameMode === "flappy") {
            startFlappyBird();
        }
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
    if (!gameActive && !gripGameActive && restartTimer > 0) {
        restartTimer -= (1/60); 
        if (restartTimer <= 0) {
            restartCountdown = 0;
        }
        return;
    }

    // If not in gameplay state, exit early
    if (!gameActive) {
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

    // ----- COLLISION checker -----
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
    
    // Handle game selection

    // Handle game selection screen
    if (showGameSelection) {
        drawGameSelection();
        drawChart(); // Still show chart
        return;
    }
    
    // Handle weight input screen
    if (isWeightInputActive && !hasStartedGame) {
        drawWeightInputScreen();
        drawChart(); // Still show chart
        return;
    }
    
    // draw game or grip test
    if (gripGameActive) {
        drawGripGame();
    } else {
        drawGame();
    }
    
    // draw chart area (right side)
    drawChart();
    
    // draw pause 
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

    // ----- GAME OVER  -----
    if (!gameActive && !gripGameActive && restartTimer > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameAreaX, 0, gameAreaWidth, canvas.height);
        
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        
        if (gripGameCompleted && !gripGameFailed && gameMode === "endurance") {
            ctx.fillText("Endurance Test Complete!", gameAreaWidth / 2, canvas.height / 2 - 50);
        } else {
            ctx.fillText("Game Over", gameAreaWidth / 2, canvas.height / 2 - 50);
        }
        
        ctx.font = "36px Arial";
        
        if (gameMode === "flappy") {
            ctx.fillText("Score: " + score, gameAreaWidth / 2, canvas.height / 2);
        }
        
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
    
    // Show play again message when restart timer expires
    if (!gameActive && !gripGameActive && restartTimer <= 0 && !showGameSelection) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameAreaX, 0, gameAreaWidth, canvas.height);
        
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        
        if (gripGameCompleted && !gripGameFailed && gameMode === "endurance") {
            ctx.fillText("Endurance Test Complete!", gameAreaWidth / 2, canvas.height / 2 - 50);
        } else {
            ctx.fillText("Game Over", gameAreaWidth / 2, canvas.height / 2 - 50);
        }
        
        ctx.font = "36px Arial";
        
        if (gameMode === "flappy") {
            ctx.fillText("Score: " + score, gameAreaWidth / 2, canvas.height / 2);
        }
        
        ctx.fillText("Grip Strength: " + gripHighScore + " lbs", gameAreaWidth / 2, canvas.height / 2 + 40);
        ctx.fillText("Endurance Score: " + enduranceScore, gameAreaWidth / 2, canvas.height / 2 + 80);
        
        if (gameMode === "flappy") {
            ctx.fillText("Press SPACE to play Flappy Bird again", gameAreaWidth / 2, canvas.height / 2 + 120);
        } else if (gameMode === "endurance") {
            ctx.fillText("Press SPACE to try Endurance Test again", gameAreaWidth / 2, canvas.height / 2 + 120);
        }
        
        ctx.textAlign = "left"; // reset text alignment
    }
}

// ----- DRAW GRIP GAME  -----
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
    ctx.fillText(`${currentResistance} lbs`, gameAreaWidth / 2, 120);
    
    // time remaining (red when low)
    ctx.font = "bold 24px Arial";
    if (gripGameTimerInterval === null) {
        ctx.fillText("Click to start timer", gameAreaWidth / 2, 160);
    } else {
        ctx.fillStyle = gripGameTimeRemaining <= 3 ? "red" : "#333";
        ctx.fillText(`Time: ${gripGameTimeRemaining}s`, gameAreaWidth / 2, 160);
        ctx.fillStyle = "#333"; // reset color
    }
    
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
    if (gripGameTimerInterval === null) {
        ctx.fillText("Press SPACE or Click to start", gameAreaWidth / 2, canvas.height - 40);
    } else {
        ctx.fillText("Press SPACE or Click to squeeze", gameAreaWidth / 2, canvas.height - 40);
    }
    
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
    ctx.fillStyle = "#ff0000";
    
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
    
    // resistance indicator (progress bar in middle)
    const resistanceHeight = (gripHeight - 20) * (currentReps / maxReps);
    ctx.fillStyle = "#ffffff";
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
    ctx.fillText("Endurance Chart", chartX + chartWidth / 2, 30);
    ctx.textAlign = "left";
    
    // headers
    ctx.font = "bold 16px Arial";
    ctx.fillText("Date", chartX + 20, 60);
    ctx.fillText("Score", chartX + 120, 60);
    
    // line under headers
    ctx.beginPath();
    ctx.moveTo(chartX + 10, 70);
    ctx.lineTo(chartX + chartWidth - 10, 70);
    ctx.stroke();
    
    // chart data rows
    ctx.font = "14px Arial";
    let y = 100;
    const maxDisplay = 10; // max rows to show
    
    // show newest first
    const startIdx = Math.max(0, chartData.length - maxDisplay);
    for (let i = startIdx; i < chartData.length; i++) {
        const item = chartData[i];
        ctx.fillText(item.date, chartX + 20, y);
        
        // highlight today's row
        if (item.date === getCurrentDate()) {
            if (isInputActive && i === chartData.length - 1) {
                ctx.fillStyle = "rgba(0, 100, 255, 0.2)";
                ctx.fillRect(chartX + 110, y - 15, 80, 20);
                ctx.fillStyle = "#333";
                
                // blinking cursor
                if (Math.floor(Date.now() / 500) % 2 === 0) {
                    const textWidth = ctx.measureText(currentInputValue).width;
                    ctx.fillRect(chartX + 120 + textWidth, y - 12, 1, 14);
                }
                ctx.fillText(currentInputValue, chartX + 120, y);
            } else {
                // Today's existing value
                ctx.fillText(item.value, chartX + 120, y);
            }
        } else {
            // Previous days
            ctx.fillText(item.value, chartX + 120, y);
        }
        
        y += 30;
    }
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.font = "italic 12px Arial";
    
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

    //  flame when holding A
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
    ctx.fillText("Endurance Score: " + getEnduranceScore(), 10, 120);
    
    // timer (red when low)
    ctx.textAlign = "right";
    ctx.fillStyle = gameTimer < 30 ? "red" : "white";
    ctx.fillText("Time: " + formatTime(gameTimer), gameAreaWidth - 10, 30);
    
    ctx.textAlign = "left"; // reset 
}

// ----- GAME OVER HANDLER -----
function gameOver() {
    gameActive = false;
    clearInterval(pipeGenerationInterval);
    pipeGenerationInterval = null;
    isFirstPipe = true;  // Reset the first pipe flag
    restartTimer = 10; // 10 sec cooldown
    restartCountdown = 10;

    // save high score only iif  btetter
    if (score > getHighScore()) {
        localStorage.setItem("highScore", score);
        console.log("🎉 New high score saved:", score);
    }
}

// ----- RESET GAME TO START -----
function resetGame() {
    // Reset endurance score for new game
    if (gameMode !== "endurance") {
        enduranceScore = 0;
        localStorage.setItem("enduranceScore", enduranceScore);
    }
    
    // Reset flappy bird game
    gameActive = false;
    score = 0;
    bird.y = 200;
    bird.velocity = 0;
    pipes = [];
    isFirstPipe = true;
    clearInterval(pipeGenerationInterval);
    pipeGenerationInterval = null;
    restartTimer = 0;
    gameTimer = 180;
    isPaused = false;
    
    // Reset grip game vars
    gripGameActive = false;
    gripGameFailed = false;
    gripGameCompleted = false;
    currentReps = 0;
    clearInterval(gripGameTimerInterval);
    
    // Start the selected game mode
    if (gameMode === "flappy") {
        startFlappyBird();
    } else if (gameMode === "endurance") {
       
        isWeightInputActive = true;
        hasStartedGame = false;
    }
}

// ----- MAIN GAME LOOP -----
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ----- ADD  INSTRUCTIONS  -----
function addInstructions() {
    const instructions = document.createElement("div");
    instructions.style.position = "fixed";
    instructions.style.top = "10px";
    instructions.style.right = "10px";
    instructions.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    instructions.style.color = "white";
    instructions.style.padding = "10px";
    instructions.style.borderRadius = "5px";
    instructions.style.fontSize = "14px";
    instructions.style.maxWidth = "250px";
    instructions.style.zIndex = "20";
    
    instructions.innerHTML = `
        <h3 style="margin-top: 0; text-align: center;">Game Instructions</h3>
        <p><strong>Endurance Test Mode:</strong></p>
        <ul>
            <li>Enter starting weight</li>
            <li>Sqeeze Gripper</li>
            <li>Complete 10 reps to continue at same weight</li>
            <li>If time runs out, weight decreases by 1 lb</li>
            <li>Score is calculated as reps × weight</li>
        </ul>
        <p><strong>Flappy Bird Mode:</strong></p>
        <ul>
            <li>Sqeeze to jump</li>
            <li>Navigate between pipes</li>
        </ul>
    `;
    
    document.body.appendChild(instructions);
}

// Add instructions when page loads
addInstructions();

// start 
gameLoop();

 //
// // ----- DRAW DATA CHART -----
// function drawChart() {
//     // chart background (right side)
//     const chartX = gameAreaWidth;
//     ctx.fillStyle = "#f0f0f0";
//     ctx.fillRect(chartX, 0, chartWidth, canvas.height);
    
//     // chart border
//     ctx.strokeStyle = "#333";
//     ctx.lineWidth = 2;
//     ctx.strokeRect(chartX, 0, chartWidth, canvas.height);
    
//     // chart title
//     ctx.fillStyle = "#333";
//     ctx.font = "bold 18px Arial";
//     ctx.textAlign = "center";
//     ctx.fillText("Endurance Chart", chartX + chartWidth / 2, 30);
//     ctx.textAlign = "left";
    
//     // headers
//     ctx.font = "bold 16px Arial";
//     ctx.fillText("Date", chartX + 20, 60);
//     ctx.fillText("Score", chartX + 120, 60);
    
//     // line under headers
//     ctx.beginPath();
//     ctx.moveTo(chartX + 10, 70);
//     ctx.lineTo(chartX + chartWidth - 10, 70);
//     ctx.stroke();
    
//     // chart data rows
//     ctx.font = "14px Arial";
//     let y = 100;
//     const maxDisplay = 10; // max rows to show
    
//     // show newest first
//     const startIdx = Math.max(0, chartData.length - maxDisplay);
//     for (let i = startIdx; i < chartData.length; i++) {
//         const item = chartData[i];
//         ctx.fillText(item.date, chartX + 20, y);
        
//         // highlight today's row
//         if (item.date === getCurrentDate()) {
//             if (isInputActive && i === chartData.length - 1) {
//                 ctx.fillStyle = "rgba(0, 100, 255, 0.2)";
//                 ctx.fillRect(chartX + 110, y - 15, 80, 20);
//                 ctx.fillStyle = "#333";
                
//                 // blinking cursor
//                 if (Math.floor(Date.now() / 500) % 2 === 0) {
//                     const textWidth = ctx.measureText(currentInputValue).width;
//                     ctx.fillRect(chartX + 120 + textWidth, y - 12, 1, 14);
//                 }
//                 ctx.fillText(currentInputValue, chartX + 120, y);
//             } else {
//                 // Today's existing value
//                 ctx.fillText(item.value, chartX + 120, y);
//             }
//         } else {
//             // Previous days
//             ctx.fillText(item.value, chartX + 120, y);
//         }
        
//         y += 30;
//     }
    
//     // input instructions
//     ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
//     ctx.font = "italic 12px Arial";
//     ctx.fillText("Press Tab to focus input", chartX + 20, canvas.height - 40);
//     ctx.fillText("Enter digits and press Enter", chartX + 20, canvas.height - 20);
// }

// // ----- DRAW MAIN GAME (FLAPPY BIRD) -----
// function drawGame() {
//     // ----- DRAW PIPES -----
//     ctx.fillStyle = "rgb(229,232,14)";
//     for (let pipe of pipes) {
//         // top pipe
//         ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
//         // bottom pipe
//         ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
        
//         // pipe shadows
//         ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
//         ctx.fillRect(pipe.x + 5, 0, 10, pipe.topHeight);
//         ctx.fillRect(pipe.x + 5, pipe.bottomY, 10, canvas.height - pipe.bottomY);
//         ctx.fillStyle = "rgb(229,232,14)"; // reset color
//     }

//     // ----- DRAW BIRD -----
//     // shadow
//     ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
//     ctx.beginPath();
//     ctx.arc(bird.x + 5, bird.y + 5, bird.radius, 0, Math.PI * 2);
//     ctx.fill();
    
//     // bird body
//     ctx.fillStyle = "#673AB7";
//     ctx.beginPath();
//     ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
//     ctx.fill();

//     // draw boost flame when holding A
//     if (keysPressed['a'] && gameActive && !isPaused && !gripGameActive) {
//         ctx.fillStyle = "orange";
//         ctx.beginPath();
//         ctx.moveTo(bird.x - bird.radius, bird.y);
//         ctx.lineTo(bird.x - bird.radius - 15, bird.y - 5);
//         ctx.lineTo(bird.x - bird.radius - 15, bird.y + 5);
//         ctx.fill();
//     }

//     // ----- DRAW SCORES & INFO -----
//     ctx.fillStyle = "white";
//     ctx.font = "24px Arial";
//     ctx.fillText("Score: " + score, 10, 30);
//     ctx.fillText("High Score: " + getHighScore(), 10, 60);
//     ctx.fillText("Grip High Score: " + getGripHighScore() + " lbs", 10, 90);
//     ctx.fillText("Endurance Score: " + enduranceScore, 10, 120);
    
//     // timer (red when low)
//     ctx.textAlign = "right";
//     ctx.fillStyle = gameTimer < 30 ? "red" : "white";
//     ctx.fillText("Time: " + formatTime(gameTimer), gameAreaWidth - 10, 30);
    
//     ctx.textAlign = "left"; // reset alignment
// }