/**
 * Created by Dayu.Yue on 2014/11/27.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));
// parse application/json
app.use(bodyParser.json());
app.use(cookieParser());

//number of two team
var blue = 0;
var red = 0;
//username and password -- JSON
var userId;
//user which is online
var onlineUsers = {};

//read the name information
fs.readFile('password.json', function (err, data) {
    if (err) {
        console.log('Can not read the file.');
    } else {
        userId = JSON.parse(data.toString());
    }
});

app.get('/', function (req, res) {
    if (req.cookies.team == 'red' || req.cookies.team == 'blue') {
        fs.readFile('index.html', function (err, data) {
            if (err) {
                console.log("can not open the file");
            } else {
                res.send(data.toString());
            }
        });
    } else if (req.cookies.team == 'admin'){
        res.redirect('/admin');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', function (req, res) {
    if (!req.cookies.team) {
        fs.readFile('login.html', function (err, data) {
            if (err) {
                console.log("can not open the file");
            } else {
                res.send(data.toString());
            }
        });
    } else {
        res.redirect('/');
    }
});

app.get('/admin', function (req, res) {
    if (req.cookies.team == 'admin') {
        fs.readFile('admin.html', function (err, data) {
            if (err) {
                console.log("can not open the file");
            } else {
                res.send(data.toString());
            }
        });
    } else {
        res.redirect('/error');
    }
});

app.get('*', function (req, res) {
    fs.readFile('404.html', function (err, data) {
        if (err) {
            console.log("can not open the file");
        } else {
            res.send(data.toString());
        }
    });
});

app.post('/login', function (req, res) {
    var username = req.param('username', null);
    var password = req.param('password', null);
    console.log(req.body);
    console.log(username + password);
    var issuccess = false;
    if (userId['admin'].username == username && userId['admin'].password == password) {
        res.cookie('username', username, {maxAge: 4500000});
        res.cookie('team', 'admin', {maxAge: 4500000});
        res.redirect('/admin');
        return;
    }
    for (x in userId['redTeam']) {
        if (userId['redTeam'][x].username == username && userId['redTeam'][x].password == password) {
            res.cookie('username', username, {maxAge: 4500000});
            res.cookie('team', 'red', {maxAge: 4500000});
            issuccess = true;
        }
    }
    if (issuccess == false) {
        for (x in userId['blueTeam']) {
            if (userId['blueTeam'][x].username == username && userId['blueTeam'][x].password == password) {
                res.cookie('username', username, {maxAge: 4500000});
                res.cookie('team', 'blue', {maxAge: 4500000});
                issuccess = true;
            }
        }
    }
    if (issuccess == true) {
        res.redirect('/');
    } else {
        res.redirect('/error');
    }
});

http.listen(80, function () {
    console.log('Server Start');
});

function isallowed(username) {
    var issuccess = false;
    for (x in userId['redTeam']) {
        if (userId['redTeam'][x].username == username) {
            issuccess = true;
        }
    }
    if (issuccess == false) {
        for (x in userId['blueTeam']) {
            if (userId['blueTeam'][x].username == username) {
                issuccess = true;
            }
        }
    }
    return issuccess;
}

var currentStatus = -1; //waiting for admin: -1; waiting for start: 0; waiting for answer: 1;
var answerFlag = false; //no answer: false; have a answer: true;

io.on('connection', function (socket) {
    socket.on('login', function(obj){
        var userName = obj.username;
        var Team = obj.team;
        socket.name = {username: userName, team : Team};
        if (userName == 'admin') {
            if (currentStatus == 0) {
                socket.name = {username: 'error', team : 'errorTeam'};
            }
            currentStatus = 0;
        } else {
            if(!onlineUsers.hasOwnProperty(userName) && isallowed(userName)) {
                onlineUsers[userName] = userName;
                if (Team == 'red') {
                    red++;
                } else {
                    blue++;
                }
            } else {
                socket.name = {username: 'error', team : 'errorTeam'};
            }
        }
        io.emit('status', {redTeam : red, blueTeam : blue});
        console.log("LOGIN:" + socket.name);
    });
    socket.on('disconnect', function(){
        if (!socket.name) {
            return;
        }
        if (socket.name.team == 'admin') {
            currentStatus = -1;
        } else if (socket.name.team != 'errorTeam' && onlineUsers.hasOwnProperty(socket.name.username)) {
            var obj = {username : socket.name, team : socket.team};
            delete onlineUsers[socket.name.username];
            if (socket.name.team == 'red') {
                red--;
            } else {
                blue--;
            }
        }
        io.emit('status', {redTeam : red, blueTeam : blue});
        console.log("LOGOUT:" + socket.name);
    });
    socket.on('admin', function(isStart){ //for admin when admin open the switch
        if (!socket.name) {
            return;
        }
        if (socket.name.team != 'admin'){
            return;
        }
        io.emit('isStart', isStart);
        if (isStart) {
            currentStatus = 1;
            answerFlag = false;
        } else {
            currentStatus = 0;
            answerFlag = false;
        }
    });
    socket.on('answer', function(){ //for team member
        if (!socket.name) {
            return;
        }
        if (currentStatus == 0) { //too fast
            if (answerFlag == false) { //first
                answerFlag = true;
                if (socket.name.team == 'red') {
                    io.emit('answer', '红队抢答');
                } else if (socket.name.team == 'blue'){
                    io.emit('answer', '蓝队抢答');
                }
            }
        } else if(currentStatus == 1) {
            if (answerFlag == false) { //first
                answerFlag = true;
                if (socket.name.team == 'red') {
                    io.emit('answer', '红队请答题');
                    io.emit('isanswer', 'red');
                } else if (socket.name.team == 'blue') {
                    io.emit('answer', '蓝队请答题');
                    io.emit('isanswer', 'blue');
                }
            }
        }
    });
});