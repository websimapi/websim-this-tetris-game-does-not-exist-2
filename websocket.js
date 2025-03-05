// Setup WebSocket connection for multiplayer functionality
const room = new WebsimSocket();

// Connection status
let isConnected = false;

// Handle connection events
room.onmessage = (event) => {
    const data = event.data;
    switch (data.type) {
        case "connected":
            console.log(`Client ${data.clientId}, ${data.username} connected`);
            isConnected = true;
            break;
        case "disconnected":
            console.log(`Client ${data.clientId}, ${data.username} disconnected`);
            break;
        case "game-interaction":
            // Handle game-specific interactions
            console.log(`Game interaction from ${data.username}`);
            break;
        default:
            console.log("Received event:", data);
    }
};

// Handle errors
room.onerror = (error) => {
    console.error("WebSocket error:", error);
};

// Handle disconnection
room.onclose = () => {
    console.log("WebSocket connection closed");
    isConnected = false;
};

