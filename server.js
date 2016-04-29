
// set up ========================
var express  = require('express');
var app      = express();                               // create our app w/ express
var mongoose = require('mongoose');                     // mongoose for mongodb
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var fs = require('fs-extra');
var path = require('path');

// Cross domain

app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });


// configuration =================

//mongoose.connect('mongodb://localhost/TauSubDb');

app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
app.use(morgan('dev'));                                         // log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

// define model =================
var Subtitles = mongoose.model('Subtitles', {
    text : String
});

// routes ======================================================================

// // api ---------------------------------------------------------------------
app.post('/api/saveSrtFileForUser', function(req, res) {
	var userId = req.body.userId;
  var text = req.body.txt;
  var videoId = req.body.videoId
  var dir = getOutputFilePath(userId, videoId);
  var jsonFilePath = path.join(dir, userId + ".json");
  var srtFilePath = path.join(dir, userId + ".srt");

  fs.createFile(jsonFilePath, function(err) {
      if(err) {
        return console.log(err);
      }

      //file has now been created, including the directory it is to be placed in
      fs.writeFile(jsonFilePath, text, function(err) {
      if(err) {
        return console.log(err);
      }

      console.log("Json file was saved!");
      jsonObj = JSON.parse(text);
      console.log(JSON.stringify(jsonObj));
      fs.writeFile(srtFilePath, generateSrtFile(jsonObj), function(err) {
        if(err) {
          return console.log(err);
          
        }
        console.log("Srt file was saved!");
      });
    });
  });

});


// // create todo and send back all todos after creation
// app.post('/api/todos', function(req, res) {

//     // create a todo, information comes from AJAX request from Angular
//     Subtitles.create({
//         text : req.body.text,
//         done : false
//     }, function(err, todo) {
//         if (err)
//             res.send(err);

//         // get and return all the todos after you create another
//         Subtitles.find(function(err, todos) {
//             if (err)
//                 res.send(err)
//             res.json(todos);
//         });
//     });

// });

// // delete a todo
// app.delete('/api/todos/:todo_id', function(req, res) {
//     Subtitles.remove({
//         _id : req.params.todo_id
//     }, function(err, todo) {
//         if (err)
//             res.send(err);

//         // get and return all the todos after you create another
//         Subtitles.find(function(err, todos) {
//             if (err)
//                 res.send(err)
//             res.json(todos);
//         });
//     });
// });

// application -------------------------------------------------------------
app.get('*', function(req, res) {
    res.sendfile('./public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
});

// listen (start app with node server.js) ======================================
app.listen(8080);
console.log("App listening on port 8080");


// Private functions

function getOutputFilePath(userId, videoId){
  return "./Subtitles/" + "/" + videoId + "/" + userId + "_Subs";
}

function generateSrtFile(subObj){
  var srtFile = "";
  var i = 1;

  subObj.reverse().forEach(function(line) {
    srtFile += i + "\n";
    srtFile += ticksToTimeString(line.startTime) + " ->> " + ticksToTimeString(line.endTime) + "\n";
    srtFile += line.txt + "\n";

    srtFile += "\n\n";

    i++; 
  });

  return srtFile;
}


function ticksToTimeString(ticks){
    if (ticks < 0) {
      return "--:--:--";
    };

    var milisecond = parseInt((ticks*1000)%1000); 
    var sec = parseInt(ticks%60);
    var min = parseInt(((ticks%3600)/60));
    var hour = parseInt((ticks/3600));

    var secStr = "" + sec;
    var minStr = "" + min;
    var hourStr = "" + hour;
    var milisecondStr = "," + milisecond;

    if (sec < 10) {
      secStr = "0" + sec;
    };

    if (min < 10) {
      minStr = "0" + min;
    };

    if (hour < 10) {
      hourStr = "0" + hour;
    };

    return hourStr + ":" + minStr + ":" + secStr + milisecondStr;
  };