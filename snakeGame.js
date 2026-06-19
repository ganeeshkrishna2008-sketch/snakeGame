const config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Global variables we will need
let snake = [];
const maxSnakeLength = 100; // FIX 1: Added this missing variable!
let headIndex = 99; 
let tailIndex = 97; 

let food;
let cursors;
let restartKey; // SPACE key to restart after game over
let direction = 'RIGHT';
let moveInterval = 100; // Speed of the snake
let lastMoveTime = 0;
const gridSize = 20;    // Updated grid size!
let score = 0;
let scoreText;
let highscore = 0;
let highscoreText;
let gameOver = false; // tracks when the snake has died
let gameOverText;
let restartText;



function preload() {
  // Create a graphics object. 
  // We use 'this.make' instead of 'this.add' because we don't want to draw 
  // this directly to the screen, we just want to use it to create textures.
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });

  // --- 1. Generate the Food Texture (Red Square) ---
  graphics.fillStyle(0xff0000, 1); // 0xff0000 is hex for pure Red
  graphics.fillRect(0, 0, 20, 20); // x, y, width, height
  graphics.generateTexture('food', 20, 20); // Save it to the cache as 'food'

  // Clear the graphics object so we can draw the next shape
    graphics.clear();

  // --- 2. Generate the Snake Body Texture (Green Square) ---
  graphics.fillStyle(0x00ff00, 1); // 0x00ff00 is hex for pure Green
  
  // Optional: Let's draw a slightly smaller square (18x18) inside the 20x20 space. 
  // This gives the snake a nice "segmented" look so the blocks don't blend into one giant green line.
    graphics.fillRect(1, 1, 18, 18); 
  
  graphics.generateTexture('body', 20, 20); // Save it to the cache as 'body'

}

function create() {
    let grid = this.add.grid(400, 300, 800, 600, 20, 20, 0x000000, 0, 0x333333, 0.5);

    // FIX 3: Cleaned up the duplicate variable resets!
    direction = 'RIGHT';
    moveInterval = 100; 
    lastMoveTime = 0;
    score = 0;
    gameOver = false;
    snake = [];
    headIndex = 99;
    tailIndex = 97;

    // --- 1. INITIALIZE THE OBJECT POOL ---
    // Create 100 invisible "dummy" images
    for (let i = 0; i < maxSnakeLength; i++) {
        let part = this.add.image(0, 0, 'body').setOrigin(0);
        part.setVisible(false); 
        snake.push(part);
    }

    // --- 2. SET THE STARTING SNAKE ---
    snake[97].setPosition(360, 300).setVisible(true); // Tail
    snake[98].setPosition(380, 300).setVisible(true); // Middle
    snake[99].setPosition(400, 300).setVisible(true); // Head

    highscore = parseInt(localStorage.getItem('highscore')) || 0;

    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '32px', fill: '#ffffff' }).setDepth(100);
    highscoreText = this.add.text(10, 40, 'High Score: ' + highscore, { fontSize: '32px', fill: '#ffffff' }).setDepth(100);
    gameOverText = this.add.text(400, 250, 'GAME OVER', { fontSize: '64px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false).setDepth(100);
    restartText = this.add.text(400, 340, 'Press SPACE to restart', { fontSize: '28px', fill: '#ffffff' }).setOrigin(0.5).setVisible(false).setDepth(100);

  // 4. Setup Keyboard Controls
    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE); 

    // FIX 2: Deleted the extra 101st snake head push from here!

    food = this.add.image(200, 200, 'food').setOrigin(0);
}

function update(time, delta) {
  // --- 0. GAME OVER / RESTART ---
    if (gameOver) {
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            this.scene.restart();
        }
        return;
    }

    if (cursors.left.isDown && direction !== 'RIGHT') direction = 'LEFT';
    else if (cursors.right.isDown && direction !== 'LEFT') direction = 'RIGHT';
    else if (cursors.up.isDown && direction !== 'DOWN') direction = 'UP';
    else if (cursors.down.isDown && direction !== 'UP') direction = 'DOWN';

    if (time < lastMoveTime + moveInterval) return;
    lastMoveTime = time;

  // --- 3. CALCULATE NEW HEAD POSITION ---
    let head = snake[headIndex]; 
    let newX = head.x;
    let newY = head.y;

    if (direction === 'LEFT') newX -= gridSize;
    else if (direction === 'RIGHT') newX += gridSize;
    else if (direction === 'UP') newY -= gridSize;
    else if (direction === 'DOWN') newY += gridSize;

    // --- 4. CHECK DEATH: WALL COLLISIONS ---
    if (newX < 0 || newX >= 800 || newY < 0 || newY >= 600) {
        return endGame();
    }

    // --- 5. CHECK DEATH: SELF COLLISIONS ---
    // We loop circularly from the tail to the head to check active pieces
    let curr = tailIndex;
    while (true) {
        if (snake[curr].x === newX && snake[curr].y === newY) {
            return endGame();
        }
        if (curr === headIndex) break; // Stop checking once we reach the head
        curr = (curr + 1) % maxSnakeLength; // Move to the next active piece
    }

    // --- 6. MOVE THE SNAKE ---
    // Step A: Advance the head index (wraps to 0 if it hits 100)
    headIndex = (headIndex + 1) % maxSnakeLength;
    
    // Step B: Grab that invisible dummy piece, move it, and reveal it!
    let newHead = snake[headIndex];
    newHead.setPosition(newX, newY);
    newHead.setVisible(true);

    if (newX === food.x && newY === food.y) {
        // EATING: 
        // We do NOT move the tail. Because the head moved forward but the tail stayed put, the snake grew by 1!
        score += 1;
        scoreText.setText('Score: ' + score);

        if (score >= 97) return winGame(); // Prevent the snake from eating its own memory tail!

        if (score > highscore) {
            highscore = score;
            highscoreText.setText('High Score: ' + highscore);
            localStorage.setItem('highscore', highscore);
        }

        let maxCols = (800 / gridSize) - 1;
        let maxRows = (600 / gridSize) - 1;
        food.x = Phaser.Math.Between(0, maxCols) * gridSize;
        food.y = Phaser.Math.Between(0, maxRows) * gridSize;

    } else {
        // MOVING: 
        // Hide the old tail, and advance the tail index so the snake stays the same length!
        snake[tailIndex].setVisible(false);
        tailIndex = (tailIndex + 1) % maxSnakeLength;
    }
}


function endGame() {
    gameOver = true;
    gameOverText.setVisible(true);
    restartText.setVisible(true);
}

function winGame() {
    gameOver = true;
    gameOverText.setText('YOU WIN!').setFill('#ffd700').setVisible(true);
    restartText.setVisible(true);
}