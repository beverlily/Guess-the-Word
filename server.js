const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
var path = require("path");

//list of users in the chat
const users = {};
let guessedLetters;
let allGuesses;
let lives;
let word;
let gameMaster;
let guessedWord;
let gameStarted = false;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

const newGame = () => {
    //replaces everything with _

    guessedLetters = [];
    allGuesses = [];
    lives = 7;
		io.to('Game Room').emit('list users', users);
		io.to('Game Room').emit('generate letter buttons', allGuesses);
		io.to('Game Room').emit('update lives', lives);
		io.to('Game Room').emit('clear');
};

const checkGuess = (letter) => {
    //if the letter is guessed correctly
    if (word.toLowerCase().includes(letter)) {
        guessedLetters.push(letter);

        //Updates guessed word with guessed letter
        //referenced https://stackoverflow.com/questions/52254565/replace-character-at-string-index
        guessedWord = word.toLowerCase().split("").map(letter => guessedLetters.includes(letter) ? letter : "_ ");
        io.emit('guessed word', guessedWord);

        if (word === guessedWord.join("")) {
            io.emit('guessed word', guessedWord);
            io.emit('game result', "won!! :)");
        }
    } else {
        lives--;
        io.to('Game Room').emit('update lives', lives);
        if (lives <= 0) {
            io.emit('guessed word', guessedWord);
            io.emit('game result', "lost :(");
        }
    }
};

newGame();

//Server socket connection listener
io.on('connection', (socket) => {
		//if there are no users connected, resets the game
		let userCount = Object.keys(users).length;

		//if no connected users, resets game
		if (userCount < 1) {
				newGame();
		}

		const checkGameStart = () => {
			userCount = Object.keys(users).length;
			//if there is more than 1 player, show start game button
			if(userCount>1){
				io.to('Game Room').emit('show start game button');
			}
		}

    //Game limited to 3 players
    if (userCount >= 3) {
        io.to(socket.id).emit('full game');
        io.sockets.sockets[socket.id].disconnect();
    } else {
			  socket.join('Game Room');
				console.log('A user connected');
				io.to('Game Room').emit('set username');

			  if(!gameStarted){
					checkGameStart();
				}
				else{
					io.to('Game Room').emit('list users', users);
					io.to('Game Room').emit('guessed word', guessedWord);
					io.to('Game Room').emit('generate letter buttons', allGuesses);
					io.to('Game Room').emit('update lives', lives);
				}

const getWord = () => {
	io.to('Game Room').emit('hide button');
	const userKeys = Object.keys(users);
	const randomUserKey = userKeys[Math.floor(Math.random() * userKeys.length)];

	gameMaster = randomUserKey;
	//sets up the game
	io.to(randomUserKey).emit('set word');
};
        //Socket listeners =====================================================
				socket.on('get word', () => {
					getWord();
				});

        socket.on('add username', (username) => {
            //adds username to list of users
            users[socket.id] = username;
            io.to('Game Room').emit("welcome new user", username);
            //updates list of usernames
            io.to('Game Room').emit('list users', users);
						if(gameStarted===false) checkGameStart();
        });

				socket.on('start game', (chosenWord) => {
					word = chosenWord;
					gameStarted = true;
					guessedWord = word.replace(/[^ ]/g, '_ ');
					io.to('Game Room').emit('list users', users);
					io.to('Game Room').emit('guessed word', guessedWord);
					io.to('Game Room').emit('generate letter buttons', allGuesses, gameMaster);
					io.to('Game Room').emit('update lives', lives);
				});

        socket.on('chatroom message', (username, message) => {
            io.to('Game Room').emit('send chatroom message', `${username}: ${message}`);
        });

        socket.on('play again', () => {
            newGame();
        });

        const disconnectUser = () => {
            let disconnectedUser = users[socket.id];
            if (disconnectedUser !== undefined) {
                console.log(`${disconnectedUser} has disconnected`);
                //deletes from list of users
                delete users[socket.id];
                //updates list of users
                io.to('Game Room').emit('list users', users);
                //end chat message
                io.to('Game Room').emit('end chat', disconnectedUser);

								//check if enough players to play game
								userCount = Object.keys(users).length;
								if(userCount<1) gameStarted = false;
								if(userCount<2 && gameStarted){
									socket.to('Game Room').emit('not enough players');
									// gameStarted = false;
								}
            }
        };

        socket.on('end chat', () => {
            disconnectUser();
            socket.leave('Game Room');
        });

        //handling built-in disconnect event
        socket.on('disconnect', () => {
            disconnectUser();
        });

        socket.on('clicked letter', (letter) => {
            allGuesses.push(letter);
            io.to('Game Room').emit('disable letter', letter);
            checkGuess(letter);
        });
    }
}); //end of socket server listener

http.listen(process.env.PORT || 3000, () => {
    console.log("Waiting for visitors");
});
