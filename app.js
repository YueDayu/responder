/**
 * Created by Dayu.Yue on 2014/11/27.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var bodyParser = require('body-parser');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

//number of two team
var blue = 0;
var red = 0;
//username and password -- JSON
var userId;
//user which is online
var onlineUsers = {};

//read the name information
fs.readFile('password.json', function(err, data){
    if (err) {
        console.log('Can not read the file.');
    } else {
        userId = JSON.parse(data.toString());
    }
});

app.get('/', function(req, res){
    fs.readFile('index.html', function(err, data) {
        if (err) {
            console.log("can not open the file");
        } else {
            res.cookie('test', 'hehe');
            res.send(data.toString());
        }
    });
});

app.post('/',  function(req, res) {
    var username = req.param('username', null);
    var password = req.param('password', null);
    console.log(req.body);
    console.log(username + password);
    var issuccess = false;
    for (x in userId['redTeam']) {
        if (userId['redTeam'][x].username == username && userId['redTeam'][x].password == password) {
            res.cookie('username', username);
            res.cookie('team', 'red');
            issuccess = true;
        }
    }
    if (issuccess == false) {
        for (x in userId['blueTeam']) {
            if (userId['blueTeam'][x].username == username && userId['blueTeam'][x].password == password) {
                res.cookie('username', username);
                res.cookie('team', 'blue');
                issuccess = true;
            }
        }
    }
    if (issuccess == true) {
        console.log(username + ' login');
    } else {
        console.log('false');
    }
});

http.listen(8080, function(){
    console.log('Server Start');
});

io.on('connection', function(socket){
    console.log("connect");
});