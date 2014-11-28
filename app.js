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
var teamlist = {};
var userlist = {};

//read the name information
fs.readFile('password.json', function (err, data) {
    if (err) {
        console.log('Can not read the file.');
    } else {
        userId = JSON.parse(data.toString());
    }
    for (x in userId['teamInfo']) {
        var teamname = userId['teamInfo'][x].teamName;
        teamlist[teamname] = {teamName : userId['teamInfo'][x].teamName, teamMemNum : 0};
        for (y in userId['teamInfo'][x].members) {
            var userObj = {username : userId['teamInfo'][x].members[y].username,
                password : userId['teamInfo'][x].members[y].password,
                team : userId['teamInfo'][x].teamName};
            userlist[userId['teamInfo'][x].members[y].username] = userObj;
        }
    }
});

function isTeamAllowed(teamName) {
    return (teamlist.hasOwnProperty(teamName));
}

function isUsernameAllowed(username) {
    return (userlist.hasOwnProperty(username));
}

app.get('/', function (req, res) {
    if (isTeamAllowed(req.cookies.team)) {
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
    var issuccess = false;
    if (userId['admin'].username == username && userId['admin'].password == password) {
        res.cookie('username', username, {maxAge: 4500000});
        res.cookie('team', 'admin', {maxAge: 4500000});
        res.redirect('/admin');
        return;
    }
    if (isUsernameAllowed(username)){
        if (userlist[username].password == password) {
            res.cookie('username', username, {maxAge: 4500000});
            res.cookie('team', userlist[username].team, {maxAge: 4500000});
            issuccess = true;
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
            if(!onlineUsers.hasOwnProperty(userName) && isUsernameAllowed(userName)) {
                onlineUsers[userName] = userName;
                teamlist[Team].teamMemNum++;
            } else {
                socket.name = {username: 'error', team : 'errorTeam'};
            }
        }
        io.emit('status', teamlist);
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
            teamlist[socket.name.team].teamMemNum--;
        }
        io.emit('status', teamlist);
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
            io.emit('isanswer');
        }
    });
    socket.on('answer', function(){ //for team member
        if (!socket.name) {
            return;
        }
        if (currentStatus == 0) { //too fast
            if (answerFlag == false) { //first
                answerFlag = true;
                io.emit('answer', socket.name.team + '队抢答');
                io.emit('answerTooFast', socket.name.team);
            }
        } else if(currentStatus == 1) {
            if (answerFlag == false) { //first
                answerFlag = true;
                io.emit('answer', socket.name.team + '队请答题');
                io.emit('isanswer', socket.name.team);
            }
        }
    });
});