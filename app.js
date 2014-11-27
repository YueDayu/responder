/**
 * Created by Dayu.Yue on 2014/11/27.
 */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('title', 'My Site');

app.get('/', function(req, res){
    res.send('Hello World');
});

http.listen(8080, function(){
    console.log('Server Start');
});