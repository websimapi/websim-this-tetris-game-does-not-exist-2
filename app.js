// Main React application component
const { useState, useEffect, useMemo, useRef } = React;
const { createRoot } = ReactDOM;

// Main App Component
function App() {
    const [creatorUsername, setCreatorUsername] = useState("");
    const [view, setView] = useState("gallery"); // gallery or create
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generationFields, setGenerationFields] = useState({
        theme: "",
        difficulty: "normal",
        uniqueFeature: ""
    });
    const [activeGame, setActiveGame] = useState(null);
    const [generatedConcept, setGeneratedConcept] = useState(null);
    
    // Get tetris games from the collection
    const tetrisGames = useSyncExternalStore(
        room.collection('tetris_game').subscribe,
        room.collection('tetris_game').getList
    );

    // Sort games by creation date (newest first)
    const sortedGames = useMemo(() => {
        return [...tetrisGames].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [tetrisGames]);

    // Get creator username on initial load
    useEffect(() => {
        async function getCreator() {
            try {
                const creator = await window.websim.getCreatedBy();
                setCreatorUsername(creator.username);
            } catch (error) {
                console.error("Error getting creator username:", error);
            }
        }
        getCreator();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setGenerationFields(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Generate a new Tetris game concept
    const handleGenerateConcept = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            // Step 1: Generate the concept text
            const concept = await TetrisGenerator.generateTetrisGameConcept(
                generationFields.theme,
                generationFields.difficulty,
                generationFields.uniqueFeature
            );
            
            // Extract title from concept (assuming it's the first line)
            const title = concept.split("\n")[0].replace(/^#\s*/, "");
            
            // Step 2: Generate block textures based on the concept
            const textureUrl = await TetrisGenerator.generateBlockTextures(concept);
            
            // Step 3: Generate AI personality
            const aiPersonality = await TetrisGenerator.generateAIPersonality(concept);
            
            // Save the generated content
            const newConcept = {
                title,
                concept,
                textureUrl,
                aiPersonality
            };
            
            setGeneratedConcept(newConcept);
            
            // Step 4: Save to database
            await TetrisGenerator.saveNewTetrisGame(
                title,
                concept,
                textureUrl,
                aiPersonality,
                creatorUsername
            );
            
            // Reset form
            setGenerationFields({
                theme: "",
                difficulty: "normal",
                uniqueFeature: ""
            });
            
            // Switch to gallery view
            setView("gallery");
        } catch (error) {
            console.error("Error generating Tetris concept:", error);
            setError("Failed to generate Tetris concept. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Play a Tetris game
    const handlePlayGame = (game) => {
        setActiveGame(game);
        TetrisGenerator.incrementPlayCount(game.id);
    };

    // Close the active game
    const handleCloseGame = () => {
        setActiveGame(null);
    };

    return (
        <div className="app-container">
            <header className="header">
                <h1>This Tetris Game Does Not Exist</h1>
                <p>Generate unique AI-powered Tetris games with custom themes, mechanics, and personalities.</p>
            </header>
            
            <div className="view-controls">
                <button 
                    onClick={() => setView("gallery")} 
                    className={view === "gallery" ? "active" : ""}
                >
                    Gallery
                </button>
                <button 
                    onClick={() => setView("create")} 
                    className={view === "create" ? "active" : ""}
                >
                    Create New Game
                </button>
            </div>
            
            <main className="main-container">
                {view === "create" ? (
                    <div className="generation-panel">
                        <h2>Create New Tetris Game</h2>
                        
                        <form onSubmit={handleGenerateConcept}>
                            <div className="form-group">
                                <label htmlFor="theme">Theme (optional)</label>
                                <input
                                    type="text"
                                    id="theme"
                                    name="theme"
                                    value={generationFields.theme}
                                    onChange={handleInputChange}
                                    placeholder="e.g., space, underwater, medieval, etc."
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="difficulty">Difficulty</label>
                                <select
                                    id="difficulty"
                                    name="difficulty"
                                    value={generationFields.difficulty}
                                    onChange={handleInputChange}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="normal">Normal</option>
                                    <option value="hard">Hard</option>
                                    <option value="expert">Expert</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="uniqueFeature">Unique Feature (optional)</label>
                                <textarea
                                    id="uniqueFeature"
                                    name="uniqueFeature"
                                    value={generationFields.uniqueFeature}
                                    onChange={handleInputChange}
                                    placeholder="Describe any special mechanics or features you'd like to see in your game..."
                                ></textarea>
                            </div>
                            
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? "Generating..." : "Generate Unique Tetris Game"}
                            </button>
                            
                            {error && <div className="error-message">{error}</div>}
                        </form>
                    </div>
                ) : (
                    <div className="gallery-panel">
                        <h2>Tetris Game Gallery</h2>
                        
                        {sortedGames.length === 0 ? (
                            <p>No Tetris games have been created yet. Be the first to create one!</p>
                        ) : (
                            <div className="gallery-grid">
                                {sortedGames.map(game => (
                                    <TetrisCard 
                                        key={game.id} 
                                        game={game} 
                                        onPlay={() => handlePlayGame(game)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
            
            {activeGame && (
                <TetrisGameModal 
                    game={activeGame} 
                    onClose={handleCloseGame}
                />
            )}
        </div>
    );
}

// Component for displaying a Tetris game card in the gallery
function TetrisCard({ game, onPlay }) {
    // Extract the first few lines of the concept for preview
    const conceptPreview = game.concept.split("\n").slice(0, 3).join("\n");
    
    return (
        <div className="tetris-card">
            <img 
                src={game.textureUrl} 
                alt={`${game.title} textures`} 
                className="tetris-card-image"
            />
            
            <div className="tetris-card-content">
                <h3>{game.title}</h3>
                <p>{conceptPreview}...</p>
                
                <div className="tetris-card-stats">
                    <span>Plays: {game.plays || 0}</span>
                </div>
                
                <div className="tetris-card-creator">
                    <img 
                        src={`https://images.websim.ai/avatar/${game.createdBy}`} 
                        alt={game.createdBy}
                    />
                    <span>Created by {game.createdBy}</span>
                </div>
                
                <button onClick={onPlay}>Play Game</button>
            </div>
        </div>
    );
}

// Modal for playing a Tetris game
function TetrisGameModal({ game, onClose }) {
    const canvasRef = useRef(null);
    const [tetrisGame, setTetrisGame] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        let gameInstance = null;
        
        async function initGame() {
            setIsLoading(true);
            
            try {
                if (canvasRef.current) {
                    // Create the game instance
                    gameInstance = new TetrisGame(
                        canvasRef.current,
                        game.textureUrl,
                        game.aiPersonality
                    );
                    
                    // Initialize and start the game
                    await gameInstance.initialize();
                    gameInstance.start();
                    
                    setTetrisGame(gameInstance);
                }
            } catch (error) {
                console.error("Error initializing Tetris game:", error);
            } finally {
                setIsLoading(false);
            }
        }
        
        initGame();
        
        // Cleanup on unmount
        return () => {
            if (gameInstance && gameInstance.animationFrameId) {
                cancelAnimationFrame(gameInstance.animationFrameId);
            }
        };
    }, [game]);
    
    // Event handlers for mobile controls
    const handleMobileControl = (action) => {
        if (!tetrisGame) return;
        
        switch (action) {
            case 'left':
                tetrisGame.moveLeft();
                break;
            case 'right':
                tetrisGame.moveRight();
                break;
            case 'down':
                tetrisGame.moveDown();
                break;
            case 'rotate':
                tetrisGame.rotate();
                break;
            case 'drop':
                tetrisGame.hardDrop();
                break;
            case 'pause':
                tetrisGame.togglePause();
                break;
        }
    };
    
    return (
        <div className="tetris-game-modal" onClick={onClose}>
            <div className="tetris-game-container" onClick={e => e.stopPropagation()}>
                <div className="close-button" onClick={onClose}>×</div>
                
                <h2>{game.title}</h2>
                
                {isLoading ? (
                    <div className="loading-indicator">Loading game...</div>
                ) : (
                    <>
                        <canvas 
                            ref={canvasRef} 
                            width="300" 
                            height="600" 
                            className="tetris-canvas"
                        />
                        
                        <div className="game-instructions">
                            <p>Controls: Arrow keys to move, Up to rotate, Space to hard drop, P to pause</p>
                        </div>
                        
                        <div className="mobile-controls">
                            <button onClick={() => handleMobileControl('left')}>⬅️</button>
                            <button onClick={() => handleMobileControl('rotate')}>🔄</button>
                            <button onClick={() => handleMobileControl('right')}>➡️</button>
                            <button onClick={() => handleMobileControl('down')}>⬇️</button>
                            <button onClick={() => handleMobileControl('drop')}>⏬</button>
                            <button onClick={() => handleMobileControl('pause')}>⏸️</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Utility function for using React's useSyncExternalStore
function useSyncExternalStore(subscribe, getSnapshot) {
    const [state, setState] = useState(getSnapshot());
    
    useEffect(() => {
        const unsubscribe = subscribe((newState) => {
            setState(newState);
        });
        
        return unsubscribe;
    }, [subscribe]);
    
    return state;
}

// Render the app
const root = createRoot(document.getElementById('root'));
root.render(<App />);

