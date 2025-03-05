// Generator functions for creating unique Tetris games
class TetrisGenerator {
    static async generateTetrisGameConcept(theme, difficulty, uniqueFeature) {
        const prompt = `Create a unique Tetris game concept with the following parameters:
Theme: ${theme || 'random'}
Difficulty: ${difficulty || 'normal'}
Unique Feature: ${uniqueFeature || 'surprise me'}

Return a detailed description including:
1. A catchy title for this Tetris variant
2. A detailed background story/theme
3. Special gameplay mechanics that make this variant unique
4. Block designs description (what they look like)
5. Colors or visual style
6. Soundtrack or audio description
7. AI opponent personality (how it talks to the player)
8. Scoring system

Make it creative, unexpected and fun!`;

        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a creative game designer specializing in unique Tetris variants. Create fun, unusual and engaging Tetris concepts."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            return completion.content;
        } catch (error) {
            console.error("Error generating Tetris concept:", error);
            return "Failed to generate Tetris concept. Please try again.";
        }
    }

    static async generateBlockTextures(conceptDescription) {
        try {
            // Generate textures based on the concept
            const texturePrompt = `Create a texture tileset for Tetris blocks based on this game concept: ${conceptDescription}
            Show all 7 Tetris blocks (I, J, L, O, S, T, Z shapes) with unique textures matching the theme.
            Make the textures vibrant, distinct, and clearly visible in a game context.`;

            const result = await websim.imageGen({
                prompt: texturePrompt,
                aspect_ratio: "1:1",
                seed: Math.floor(Math.random() * 1000)
            });

            return result.url;
        } catch (error) {
            console.error("Error generating block textures:", error);
            return null;
        }
    }

    static async generateAIPersonality(conceptDescription) {
        try {
            const prompt = `Based on this Tetris game concept: ${conceptDescription}
            
            Create a personality profile for the AI opponent or commentator, including:
            1. Name and brief backstory
            2. Personality traits
            3. Speaking style and tone
            4. 10 example quotes or taunts it might say during gameplay
            5. How it reacts to player success or failure`;

            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a creative game writer designing personalities for AI characters in games."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            return completion.content;
        } catch (error) {
            console.error("Error generating AI personality:", error);
            return "Failed to generate AI personality. Using default personality.";
        }
    }

    static async generateAIMessage(aiPersonality, gameState) {
        // Game state can include: score, level, situation (new game, game over, etc.)
        try {
            const prompt = `Based on this AI personality: ${aiPersonality}
            
            Generate a single, brief message (1-2 sentences) that this AI would say to the player in this situation:
            - Current score: ${gameState.score}
            - Current level: ${gameState.level}
            - Game situation: ${gameState.situation}
            
            The message should reflect the AI's personality and be appropriate for the current game state.`;

            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a game AI character that responds to player actions with brief, personality-driven messages."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            return completion.content;
        } catch (error) {
            console.error("Error generating AI message:", error);
            return "Keep playing...";
        }
    }

    static async saveNewTetrisGame(title, concept, textureUrl, aiPersonality, creatorUsername) {
        try {
            // Save to collection
            const tetrisGame = await room.collection('tetris_game').create({
                title,
                concept,
                textureUrl,
                aiPersonality,
                createdBy: creatorUsername,
                createdAt: new Date().toISOString(),
                plays: 0,
                likes: 0
            });
            
            return tetrisGame;
        } catch (error) {
            console.error("Error saving Tetris game:", error);
            throw error;
        }
    }

    static async incrementPlayCount(gameId) {
        try {
            const game = room.collection('tetris_game').filter({ id: gameId }).getList()[0];
            if (game) {
                await room.collection('tetris_game').update(gameId, {
                    plays: (game.plays || 0) + 1
                });
            }
        } catch (error) {
            console.error("Error incrementing play count:", error);
        }
    }
}

