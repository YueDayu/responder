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
        res.cookie('username', username);
        res.cookie('team', 'admin');
        res.redirect('/admin');
        return;
    }
    for (x in userId['redTeam']) {
        if (userId['redTeam'][x].username == username && userId['redTeam'][x].password == password) {
            res.cookie('username', username);
            res.cookie('team', 'red');
            red++;
            issuccess = true;
        }
    }
    if (issuccess == false) {
        for (x in userId['blueTeam']) {
            if (userId['blueTeam'][x].username == username && userId['blueTeam'][x].password == password) {
                res.cookie('username', username);
                res.cookie('team', 'blue');
                blue++;
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

var currentStatus = -1; //waiting for admin: -1; waiting for starting: 0; waiting for answer: 1;
var answerFlag = false; //no answer: false; have a answer: true;

io.on('connection', function (socket) {
    socket.on('login', function(obj){
        var userName = obj.username;
        var Team = obj.team;
        socket.name = {username: userName, team : Team};
        if (userName == 'admin') {
            console.log('admin login!');
            currentStatus = 0;
        } else if(Team == 'red') {
            console.log('red team member login!');
        } else {
            console.log('blue team member login!');
        }
    });
});