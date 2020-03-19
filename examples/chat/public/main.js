const admin = "pappa";
var users = [];
var username;
var usersFromSockets = [];
var socket = io();
const numPlayers = 2;
var paloElement;
var il_palo;
$(function () {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    // Initialize variables
    var $window = $(window);
    var $usernameInput = $('.usernameInput'); // Input for username
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box

    var $loginPage = $('.login.page'); // The login page
    var $chatPage = $('.chat.page'); // The chatroom page
    var $gamePage = $('.game.page'); // The game page


    // Prompt for setting a username


    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();



    const addParticipantsMessage = (data) => {
        var message = '';
        if (data.numUsers === 1) {
            message += "c'è 1 giocatore";
        } else {
            message += "ci sono " + data.numUsers + " giocatori";
        }
        log(message);
    }


    // Sets the client's username
    const setUsername = () => {
        username = cleanInput($usernameInput.val().trim());

        // If the username is valid
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $gamePage.show();
            // startGame();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();

            // Tell the server your username
            socket.emit('add user', username);
        }
    }


    // Sends a chat message
    const sendMessage = () => {
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            // tell server to execute 'new message' and send along one parameter
            socket.emit('new message', message);
        }
    }

    // Log a message
    const log = (message, options) => {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    // Adds the visual chat message to the message list
    const addChatMessage = (data, options) => {
        // Don't fade the message in if there is an 'X was typing'
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        var $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    }

    // Adds the visual chat typing message
    const addChatTyping = (data) => {
        data.typing = true;
        data.message = 'sta scrivendo..';
        addChatMessage(data);
    }

    // Removes the visual chat typing message
    const removeChatTyping = (data) => {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }

    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    const addMessageElement = (el, options) => {
        var $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    // Prevents input from having injected markup
    const cleanInput = (input) => {
        return $('<div/>').text(input).html();
    }

    // Updates the typing event
    const updateTyping = () => {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(() => {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    // Gets the 'X is typing' messages of a user
    const getTypingMessages = (data) => {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }

    // Gets the color of a username through our hash function
    const getUsernameColor = (username) => {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    // Keyboard events

    $window.keydown(event => {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });

    $inputMessage.on('input', () => {
        updateTyping();
    });

    // Click events

    // Focus input when clicking anywhere on login page
    $loginPage.click(() => {
        $currentInput.focus();
    });

    // Focus input when clicking on the message input's border
    $inputMessage.click(() => {
        $inputMessage.focus();
    });

    // Socket events

    // Whenever the server emits 'login', log the login message
    socket.on('login', (data) => {
        connected = true;
        // Display the welcome message
        var message = "Welcome to Socket.IO Chat – ";
        log(message, {
            prepend: true
        });

        socket.emit("get list users", username);

        console.log("emit");
        addParticipantsMessage(data);

    });


    socket.on('users list', (data) => {
        users = data.users;
        console.log("client " + users);
    });


    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', (data) => {
        addChatMessage(data);
    });

    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', (data) => {
        log(data.username + ' si è seduto');
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', (data) => {
        log(data.username + ' non ci fà più');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', (data) => {
        addChatTyping(data);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop typing', (data) => {
        removeChatTyping(data);
    });

    socket.on('disconnect', () => {
        log('you have been disconnected');
    });

    socket.on('reconnect', () => {
        log('you have been reconnected');
        if (username) {
            socket.emit('add user', username);
        }
    });

    socket.on('reconnect_error', () => {
        log('attempt to reconnect has failed');
    });

    socket.on('palo', (data) => {
        console.log(data.palo + " on ");
        drawPalo(data.palo);
    });

    socket.on('start', (data) => {
        usersFromSockets = data;
        console.log(usersFromSockets);
        console.log("start");
        startFromSocket();
    });

    socket.on('palo eliminato' , () => {
       deleteComponent(120, 50, 400,0);
    });

});

function startGame() {
    if (admin.localeCompare(username) === 0) {
        socket.emit('start game');
        if (users.length == numPlayers){
            myGameArea.start();
            drawPlayers(users);
        } else window.alert("pochi utenti");
        console.log(users);
    } else window.alert("not admin");


}

function startFromSocket() {
    myGameArea.start();
    console.log(usersFromSockets);
    drawPlayers(usersFromSockets);
}

var myGameArea = {
    canvas: document.createElement("canvas"),
    start: function () {
        this.canvas.width = 800;
        this.canvas.height = 460;
        this.canvas.style.left = "460px";
        this.context = this.canvas.getContext("2d");
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        // this.frameNo = 0;
        // this.interval = setInterval(updateGameArea, 20);
    },
    clear: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
};

function component(width, height, color, x, y, username) {
    // this.type = type;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    ctx = myGameArea.context;
    ctx.font = this.width + " " + this.height;
    ctx.fillStyle = color;
    ctx.fillText(username, this.x, this.y);
}

function deleteComponent(width, height, x, y) {
    ctx = myGameArea.context;
    ctx.clearRect(x,y,width,height);
}

function drawPlayers(users) {
    var i, j;
    var n = 0;
    var user;
    for (i = 0; i < numPlayers / 2; i++) {
        user = new component("30px", "Consolas", "black", 20 + (i * 200), 400, users[i]);
    }
    for (j = numPlayers / 2; j < numPlayers; j++) {
        user = new component("30px", "Consolas", "black", 20 + (n * 200), 100, users[j]);
        n++;
    }
}

function sceltaPalo() {
    var palo = document.getElementById("palo");
    var palo_value;
    for (var i = 0; i < palo.length; i++) {
        if (palo[i].checked) {
            palo_value = palo[i].value;
        }
    }
    socket.emit('scelta palo', palo_value);
    // console.log(palo_value);
    drawPalo(palo_value);
}

function drawPalo (palo) {
    paloElement = new component("30px","Consolas","red",400,35,palo);
}

function prossimaMano () {
    console.log("prossima mano");
    deleteComponent(120, 50, 400,0);
    socket.emit('delete palo');
}
