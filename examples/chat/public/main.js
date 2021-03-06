const admin = "pappa";
const numeroCarte = 40;
var currentCard = 0;
var mazzo = [];
var nSpinotto = 1;
var nGiro = 1;
var users = [];
var cardToShow = [];
var username;
var usersFromSockets = [];
var socket = io();
const numPlayers = 6;
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
        var message = "Benvenuto nel giretto";
        log(message, {
            prepend: true
        });

        socket.emit("get list users", username);
        console.log("emit");
        addParticipantsMessage(data);
        console.log(users);
        showbuttons();
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
       deleteComponent(0, 0, 600,50);
    });

    socket.on('ho bussato', (data) => {
        console.log(data + "ha bussato");
        window.alert(data + " ha bussato");
    });

    socket.on('carte date', (data) =>{
        if (username == data.username) {
            cardToShow = data.carte;
            console.dir(username);
            console.dir(cardToShow);
            cardComponent(cardToShow);
        }
    });

    socket.on('carte elminate', () => {
        cardToShow = [];
        console.dir("cars to dshor" + cardToShow);
        deleteCarte();
    });

    socket.on('numero spinotti',(data) => {
        console.log(data);
        deleteComponent(0,250,250,50);
        component("30px","Consolas","red", 10, 300,"Spinotto n." + data);
    });

    socket.on('numero giro',(data) => {
        deleteComponent(0,305,250,50);
        component("30px","Consolas","red", 10, 330,"Giro n." + data);
    })

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
        this.context = this.canvas.getContext("2d");
        document.querySelector('#play').appendChild(this.canvas);
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

function cardComponent(carteUtente) {
    var img = new Image();
    var n = 0;
    for (i=0;i<8;i++){
        ctx = myGameArea.context;
        var img = new Image();
        img.src = carteUtente[i];
        img.onload = function () {
            ctx.drawImage(this,0 + (n*90),150,70,100);
            n++;
        }
    }
}



function deleteComponent(x,y,width,height) {
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

    socket.emit('giro', nGiro);
}

function sceltaPalo() {
    if (admin.localeCompare(username) == 0){
        var palo = document.getElementById("palo");
        var palo_value;
        initMazzo();
        mix(mazzo);
        for (var i = 0; i < palo.length; i++) {
            if (palo[i].checked) {
                palo_value = palo[i].value;
            }
        }
        socket.emit('scelta palo', palo_value);
        drawPalo(palo_value);
        socket.emit('spinotti',nSpinotto);
        component("30px","Consolas","red", 10, 300,"Spinotto n." + nSpinotto);
        currentCard = 0;
        for (var i = 0; i < numPlayers; i++) {
            socket.emit('carte', {
                username: users[i],
                carte: cardToPlayer()
            })
        }
    } else window.alert("not admin");

}

function drawPalo (palo) {
    paloElement = new component("30px","Consolas","red",320,35,palo);
}

function prossimaMano () {
    if (admin.localeCompare(username) == 0) {
        console.log("prossima mano");
        deleteComponent(0, 0, 600,50);
        deleteCarte();
        socket.emit('delete palo');
        socket.emit('delete carte');
    } else window.alert("not admin");
}

function bussa () {
    window.alert("hai bussato");
    socket.emit('bussa');
}



function initMazzo() {
    var card = new Object();
    for (var i=1; i<=35; i++){
        var id = i;
        var path = "res/Napoletane/" + i + ".jpg";
        card = (id , path);
        mazzo.push(card);
    }
    console.log(mazzo);
}

function mix() {
    var j, x, i;
    for (i = mazzo.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = mazzo[i];
        mazzo[i] = mazzo[j];
        mazzo[j] = x;
    }
    return mazzo;
}

function cardToPlayer() {
    var carte = [];
    var  j;
        for (j = 0; j < 7; j++) {
            carte[j] = mazzo[currentCard + j];
        }
        currentCard += j;
        console.dir(carte);
        return carte;
}

function deleteCarte() {
    socket.emit();
    deleteComponent(0,110,800,200);
    mazzo = [];
    nSpinotto = 1;
    nGiro = 1;
    console.log(mazzo);
}

function showbuttons() {
    var start = document.getElementById("startButton");
    var form = document.getElementById("palo");
    var palo = document.getElementById("paloButton");
    var spinotto = document.getElementById("spinotto");
    var nextMano = document.getElementById("prossimaMano");
    var giro = document.getElementById("giro");


    if (username != admin) {
        start.style.display = "none";
        form.style.display = "none";
        palo.style.display = "none";
        nextMano.style.display = "none";
        spinotto.style.display = "none";
        giro.style.display = 'none';
    }
        console.log(users.length);

    




}
function spinotto() {
    nSpinotto++;
    socket.emit('spinotti',nSpinotto);
    deleteComponent(0,250,250,50);
    component("30px","Consolas","red", 10, 300,"Spinotto n." + nSpinotto);
}

function countGiro() {
    nGiro++;
    socket.emit("giro",nGiro);
    deleteComponent(0,305,250,50);
    component("30px","Consolas","red", 10, 330,"Giro n." + nGiro);

}



