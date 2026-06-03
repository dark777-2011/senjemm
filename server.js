const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());
app.use(express.static("../client"));

const questions = JSON.parse(
    fs.readFileSync(path.join(__dirname, "questions.json"))
);

let rooms = {};

function randomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {

    socket.on("createRoom", (data) => {

        const code = randomCode();

        rooms[code] = {
            host: socket.id,
            teams: [
                {
                    name: data.team1,
                    score: 0
                },
                {
                    name: data.team2,
                    score: 0
                }
            ],
            currentQuestion: null
        };

        socket.join(code);

        socket.emit("roomCreated", code);
    });

    socket.on("joinRoom", (code) => {

        if (!rooms[code]) {
            socket.emit("errorMsg", "الغرفة غير موجودة");
            return;
        }

        socket.join(code);

        io.to(code).emit("playerJoined");
    });

    socket.on("nextQuestion", (code) => {

        const room = rooms[code];

        if (!room) return;

        const question =
            questions[Math.floor(Math.random() * questions.length)];

        room.currentQuestion = question;

        io.to(code).emit("newQuestion", question);
    });

    socket.on("addPoint", ({ code, team }) => {

        const room = rooms[code];

        if (!room) return;

        room.teams[team].score++;

        io.to(code).emit("updateScores", room.teams);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected");
    });

});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});