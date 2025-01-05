const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {}; // Store white and black player IDs

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Assign roles to players
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
        console.log(`Player ${socket.id} assigned white pieces`);
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
        console.log(`Player ${socket.id} assigned black pieces`);
    } else {
        socket.emit("spectatorRole");
        console.log(`Spectator connected: ${socket.id}`);
    }

    // Send the current board state to the connected client
    socket.emit("boardstate", chess.fen());

    // Handle disconnections
    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);

        if (socket.id === players.white) {
            console.log("White player disconnected");
            delete players.white;
        } else if (socket.id === players.black) {
            console.log("Black player disconnected");
            delete players.black;
        }
    });

    // Handle move events
    socket.on("move", (move) => {
        console.log(`Received move: ${move}`);
        try {
            // Validate turn
            if (chess.turn() === "w" && socket.id !== players.white) {
                socket.emit("Invalid move", "It's not your turn!");
                return;
            }
            if (chess.turn() === "b" && socket.id !== players.black) {
                socket.emit("Invalid move", "It's not your turn!");
                return;
            }

            // Attempt the move
            const result = chess.move(move);
            if (result) {
                console.log(`Move accepted: ${result.san}`);
                io.emit("move", move); // Broadcast the move to all clients
                io.emit("boardstate", chess.fen()); // Update board state for all clients
            } else {
                console.log("Invalid move: ", move);
                socket.emit("Invalid move", "Invalid move!");
            }
        } catch (err) {
            console.error(err);
            socket.emit("Invalid move", "Error processing move!");
        }
    });
});

server.listen(3000, () => {
    console.log("Server listening on port 3000");
});
