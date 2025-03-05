class TetrisGame {
    constructor(canvas, textureImage, aiPersonality) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.textureImage = textureImage;
        this.aiPersonality = aiPersonality;
        
        // Game state
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.isGameOver = false;
        this.isPaused = false;
        
        // Grid dimensions
        this.cols = 10;
        this.rows = 20;
        this.blockSize = Math.min(this.width / this.cols, this.height / this.rows);
        
        // Board state
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        
        // Tetromino shapes (I, J, L, O, S, T, Z)
        this.tetrominoes = [
            [[1, 1, 1, 1]],                                // I
            [[2, 0, 0], [2, 2, 2]],                        // J
            [[0, 0, 3], [3, 3, 3]],                        // L
            [[4, 4], [4, 4]],                              // O
            [[0, 5, 5], [5, 5, 0]],                        // S
            [[0, 6, 0], [6, 6, 6]],                        // T
            [[7, 7, 0], [0, 7, 7]]                         // Z
        ];
        
        // Current piece
        this.currentPiece = null;
        this.currentX = 0;
        this.currentY = 0;
        this.currentShape = 0;
        
        // Input
        this.keysPressed = {};
        
        // Game timing
        this.dropInterval = 1000; // milliseconds
        this.lastDropTime = 0;
        this.animationFrameId = null;
        
        // AI messaging
        this.aiMessages = [];
        this.lastAiMessageTime = 0;
        this.aiMessageInterval = 10000; // 10 seconds
        
        // Texture mapping
        this.blockTextures = null;
        
        // Initialize
        this.setupEventListeners();
    }
    
    async initialize() {
        // Load texture image
        return new Promise((resolve, reject) => {
            if (!this.textureImage) {
                resolve();
                return;
            }
            
            const image = new Image();
            image.onload = () => {
                this.blockTextures = image;
                resolve();
            };
            image.onerror = () => {
                console.error("Failed to load texture image");
                resolve(); // Resolve anyway to not block game start
            };
            image.src = this.textureImage;
        });
    }
    
    start() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.reset();
        this.newPiece();
        this.addAiMessage("Welcome! Let's see how you handle these blocks...", 'start');
        this.gameLoop();
    }
    
    reset() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.aiMessages = [];
        this.dropInterval = 1000;
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keysPressed[e.key] = true;
            this.handleInput(e.key);
        });
        
        window.addEventListener('keyup', (e) => {
            delete this.keysPressed[e.key];
        });
        
        // Mobile controls setup
        // This would be connected to UI buttons for mobile
    }
    
    handleInput(key) {
        if (this.isGameOver || this.isPaused) return;
        
        switch (key) {
            case 'ArrowLeft':
                this.moveLeft();
                break;
            case 'ArrowRight':
                this.moveRight();
                break;
            case 'ArrowDown':
                this.moveDown();
                break;
            case 'ArrowUp':
                this.rotate();
                break;
            case ' ':
                this.hardDrop();
                break;
            case 'p':
                this.togglePause();
                break;
        }
    }
    
    moveLeft() {
        if (this.valid(-1, 0)) {
            this.currentX--;
        }
    }
    
    moveRight() {
        if (this.valid(1, 0)) {
            this.currentX++;
        }
    }
    
    moveDown() {
        if (this.valid(0, 1)) {
            this.currentY++;
            this.score += 1;
        } else {
            this.lock();
            this.removeLines();
            this.newPiece();
        }
    }
    
    rotate() {
        const rotated = this.rotate90(this.currentPiece);
        if (this.valid(0, 0, rotated)) {
            this.currentPiece = rotated;
        }
    }
    
    hardDrop() {
        let distance = 0;
        while (this.valid(0, distance + 1)) {
            distance++;
        }
        
        if (distance > 0) {
            this.currentY += distance;
            this.score += distance * 2;
            this.lock();
            this.removeLines();
            this.newPiece();
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (!this.isPaused) {
            this.lastDropTime = Date.now();
            this.gameLoop();
        }
    }
    
    gameLoop() {
        const now = Date.now();
        const delta = now - this.lastDropTime;
        
        if (!this.isPaused) {
            this.update(delta);
            this.draw();
            
            if (!this.isGameOver) {
                this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
            }
        } else {
            this.drawPauseScreen();
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    update(delta) {
        if (this.isGameOver) return;
        
        // AI message updates
        const aiMessageDelta = Date.now() - this.lastAiMessageTime;
        if (aiMessageDelta > this.aiMessageInterval) {
            this.generateRandomAiMessage();
            this.lastAiMessageTime = Date.now();
        }
        
        // Piece drop timing
        if (delta > this.dropInterval) {
            this.moveDown();
            this.lastDropTime = Date.now();
        }
        
        // Level progression
        this.level = Math.floor(this.lines / 10) + 1;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
    }
    
    async generateRandomAiMessage() {
        const situations = ['playing', 'good_move', 'bad_move', 'nearly_full'];
        const situation = situations[Math.floor(Math.random() * situations.length)];
        
        const gameState = {
            score: this.score,
            level: this.level,
            situation: situation
        };
        
        const message = await TetrisGenerator.generateAIMessage(this.aiPersonality, gameState);
        this.addAiMessage(message, situation);
    }
    
    addAiMessage(message, situation) {
        this.aiMessages.push({
            text: message,
            time: Date.now(),
            situation
        });
        
        // Keep only last 5 messages
        if (this.aiMessages.length > 5) {
            this.aiMessages.shift();
        }
        
        this.lastAiMessageTime = Date.now();
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw board
        this.drawBoard();
        
        // Draw current piece
        this.drawPiece();
        
        // Draw UI
        this.drawUI();
    }
    
    drawBoard() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                } else {
                    // Draw grid
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    this.ctx.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    this.ctx.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
                }
            }
        }
    }
    
    drawPiece() {
        if (!this.currentPiece) return;
        
        const piece = this.currentPiece;
        
        // First draw the ghost piece (where it would land)
        let ghostY = this.currentY;
        while (this.valid(0, ghostY - this.currentY + 1)) {
            ghostY++;
        }
        
        // Draw ghost piece
        this.ctx.globalAlpha = 0.3;
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    this.drawBlock(this.currentX + x, ghostY + y, piece[y][x]);
                }
            }
        }
        this.ctx.globalAlpha = 1.0;
        
        // Draw actual piece
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    this.drawBlock(this.currentX + x, this.currentY + y, piece[y][x]);
                }
            }
        }
    }
    
    drawBlock(x, y, colorIndex) {
        const xPos = x * this.blockSize;
        const yPos = y * this.blockSize;
        
        if (this.blockTextures) {
            // Calculate texture coordinates based on color index
            // Assuming the texture is a grid of blocks
            const textureSize = this.blockTextures.width / 7; // 7 types of blocks
            const srcX = (colorIndex - 1) * textureSize;
            const srcY = 0;
            
            this.ctx.drawImage(
                this.blockTextures,
                srcX, srcY, textureSize, textureSize,
                xPos, yPos, this.blockSize, this.blockSize
            );
        } else {
            // Fallback colors if texture is not available
            const colors = [
                '#000',
                '#FF0000', // I - Red
                '#00FF00', // J - Green
                '#0000FF', // L - Blue
                '#FFFF00', // O - Yellow
                '#00FFFF', // S - Cyan
                '#FF00FF', // T - Magenta
                '#FFFFFF'  // Z - White
            ];
            
            this.ctx.fillStyle = colors[colorIndex];
            this.ctx.fillRect(xPos, yPos, this.blockSize, this.blockSize);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.strokeRect(xPos, yPos, this.blockSize, this.blockSize);
        }
    }
    
    drawUI() {
        // Score and level info
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, this.height - 60);
        this.ctx.fillText(`Level: ${this.level}`, 10, this.height - 40);
        this.ctx.fillText(`Lines: ${this.lines}`, 10, this.height - 20);
        
        // AI messages
        if (this.aiMessages.length > 0) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, this.height - 120, this.width, 100);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            
            let messageY = this.height - 100;
            for (let i = 0; i < this.aiMessages.length; i++) {
                this.ctx.fillText(this.aiMessages[i].text, 10, messageY);
                messageY += 20;
            }
        }
    }
    
    drawPauseScreen() {
        this.draw();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Pause message
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press P to resume', this.width / 2, this.height / 2 + 30);
    }
    
    drawGameOverScreen() {
        this.draw();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Game over message
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 20);
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 10);
        this.ctx.fillText(`Level Reached: ${this.level}`, this.width / 2, this.height / 2 + 30);
        this.ctx.fillText('Press R to play again', this.width / 2, this.height / 2 + 60);
    }
    
    newPiece() {
        // Choose a random tetromino
        const index = Math.floor(Math.random() * this.tetrominoes.length);
        const piece = this.tetrominoes[index];
        
        this.currentPiece = JSON.parse(JSON.stringify(piece)); // Deep copy
        this.currentX = Math.floor((this.cols - this.currentPiece[0].length) / 2);
        this.currentY = 0;
        
        // Game over if the new piece can't be placed
        if (!this.valid(0, 0)) {
            this.isGameOver = true;
            this.addAiMessage("Game over! Your stack-building days are numbered...", 'game_over');
            this.drawGameOverScreen();
            
            // You can add additional game over logic here
        }
    }
    
    valid(offsetX, offsetY, piece = this.currentPiece) {
        // Check if the piece is within valid boundaries
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (!piece[y][x]) continue;
                
                const newX = this.currentX + x + offsetX;
                const newY = this.currentY + y + offsetY;
                
                if (
                    newX < 0 || newX >= this.cols ||
                    newY < 0 || newY >= this.rows ||
                    (newY >= 0 && this.board[newY][newX])
                ) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    lock() {
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (this.currentPiece[y][x]) {
                    this.board[this.currentY + y][this.currentX + x] = this.currentPiece[y][x];
                }
            }
        }
    }
    
    removeLines() {
        let linesCleared = 0;
        
        for (let y = this.rows - 1; y >= 0; y--) {
            let lineIsFull = true;
            
            for (let x = 0; x < this.cols; x++) {
                if (!this.board[y][x]) {
                    lineIsFull = false;
                    break;
                }
            }
            
            if (lineIsFull) {
                linesCleared++;
                
                // Remove the line
                for (let yy = y; yy > 0; yy--) {
                    for (let x = 0; x < this.cols; x++) {
                        this.board[yy][x] = this.board[yy - 1][x];
                    }
                }
                
                // Clear the top line
                for (let x = 0; x < this.cols; x++) {
                    this.board[0][x] = 0;
                }
                
                // Check the same line again since it now contains
                // the line that was above it
                y++;
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            // Score calculation
            const points = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 lines
            this.score += points[linesCleared] * this.level;
            
            // Add AI message for multi-line clears
            if (linesCleared >= 2) {
                this.addAiMessage(`${linesCleared} lines at once? ${linesCleared === 4 ? "Tetris!" : "Impressive!"}`, 'clear_lines');
            }
        }
    }
    
    rotate90(piece) {
        const result = [];
        for (let i = 0; i < piece[0].length; i++) {
            const row = [];
            for (let j = piece.length - 1; j >= 0; j--) {
                row.push(piece[j][i]);
            }
            result.push(row);
        }
        return result;
    }
}

