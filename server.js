
// set up ========================
var express  = require('express');
var app      = express();                               // create our app w/ express
var mongoose = require('mongoose');                     // mongoose for mongodb
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var randomstring = require("randomstring");
var fs = require('fs-extra');
var path = require('path');
var cmd=require('node-cmd');
var baseDir = "";
var fileSystemDir = "C:\\SubGit\\";
var latestHashFolder = fileSystemDir + "\\hash\\";

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
  var videoId = req.body.videoId

  var dir = fileSystemDir + getOutputFilePath(userId, videoId);
  var gitVideoDir = fileSystemDir + getOutputVideoFolder(videoId);
  var jsonFilePath = path.join(dir, userId + ".json");
  var latestJsonFilePath = path.join(gitVideoDir, videoId + "_latest.json");
  var randString = randomstring.generate(25);
  var srtFilePath = path.join(latestHashFolder, randString + ".srt");

  var subObj = mergeSubsToObject(req, latestJsonFilePath);

  fs.createFile(jsonFilePath, function(err) {
      if(err) {
        return console.log(err);
      }

      //file has now been created, including the directory it is to be placed in
      fs.writeFile(jsonFilePath, JSON.stringify(subObj), function(err) {
      if(err) {
        return console.log(err);
      }

      console.log("Json file was saved!");

      console.log("json saved: " + JSON.stringify(subObj));
      // console.log("json saved2: " + subString);

      fs.createFile(srtFilePath, function(err) {
        fs.writeFile(srtFilePath, generateSrtFile(subObj), function(err) {
          if(err) {
            return console.log(err);
            
          }
          console.log("Srt file was saved!");
          console.log("Commiting with git");
          cmd.get(
          'cd ' + gitVideoDir + '&& git add . && git commit -am "commiting in the name of:' + userId + '"',
          function(data){
              console.log('git cmd finished : ',data)

              fs.writeFile(latestJsonFilePath, JSON.stringify(subObj), function(err) {
                if(err) {
                  return console.log(err);                  
                }

                console.log("Latest Json file was saved!");

                res.send(randString);
              });
          }
          );
        });
      });
      
    });
  });

});

app.get('/api/getLatestSubtitles/:hashCode', function(req, res){
  var hashCode = req.params.hashCode;
  var fileName = hashCode + ".srt";

  console.log("Got a download request to retreive srt for hashCode: " + hashCode);

  var filePath = latestHashFolder + fileName;

  if (fileExists(filePath)) { 
    console.log('file does not exist');
    res.send('fileNotExist');
    return;
  } 

  res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
  res.setHeader('Content-type', 'text/srt');

  var filestream = fs.createReadStream(filePath);
  filestream.pipe(res);

  console.log('starting download');
});

app.get('/api/getLatestJsonSub/:videoId', function(req, res){
  var videoId = req.params.videoId;
  var gitVideoDir = fileSystemDir + getOutputVideoFolder(videoId);
  var latestJsonFilePath = path.join(gitVideoDir, videoId + "_latest.json");

  if (!fileExists(latestJsonFilePath)) { 
    console.log('video latest file does not exist');
    var subtitle = [{
        id:guid(),
        startTime:0,
        endTime:-1,
        txt:""
    }];
    // console.log("sent subtitle id: " + subtitle[0].id);
    res.send(JSON.stringify(subtitle));
    
    return;
  } 

  fs.readJson(latestJsonFilePath, function(err, jsonObj) {
      res.send(jsonObj);
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
// app.get('*', function(req, res) {
//     res.sendfile('./public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
// });

// listen (start app with node server.js) ======================================
port = 8080;
app.listen(port);
console.log("App listening on port " + port);

cmd.get(
        'chdir', // Change to 'pwd' in linux
        function(data){
            console.log('the current working dir is : ',data)
            baseDir = data;
        });

cmd.get(
        'mkdir ' + fileSystemDir + ' && cd ' + fileSystemDir + ' && git init', // Change to 'pwd' in linux
        function(data){
            console.log('created git repository : ',data)
            baseDir = data;
        });


// Private functions

function getOutputFilePath(userId, videoId){
  return getOutputVideoFolder(videoId) + "/" + userId + "_Subs";
}

function getOutputVideoFolder(videoId){
  return "/Subtitles/" + "/" + videoId;  
}

function guid(){
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function generateSrtFile(subObj){
  var srtFile = "";
  var i = 1;

  subObj.reverse().forEach(function(line) {
    srtFile += i + "\r\n";
    srtFile += ticksToTimeString(line.startTime) + " ->> " + ticksToTimeString(line.endTime) + "\r\n";
    srtFile += line.txt + "\r\n";

    srtFile += "\r\n";

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

function mergeSubsToObject(req, latestJsonFilePath){

  newSubtitles = JSON.parse(req.body.txt);

  if (!fileExists(latestJsonFilePath)) { 
    return newSubtitles;
  }
  
  var joinedSubs = [];

  data = fs.readFileSync(latestJsonFilePath);

  oldSubtitles = JSON.parse(data);
  console.log('oldSubtitles : ', oldSubtitles);
  console.log('oldSubtitles[0] : ', oldSubtitles[0]);

  // console.log('added : ', req.body.added);
  // console.log('deleted : ', req.body.deleted);
  // console.log('edited : ', req.body.edited);
  added = JSON.parse(req.body.added);
  deleted = JSON.parse(req.body.deleted);
  edited = JSON.parse(req.body.edited);

  // remove old subtitles that were deleted or edited
  for(var i = oldSubtitles.length -1; i >= 0 ; i--){
      if(deleted[oldSubtitles[i].id] || edited[oldSubtitles[i].id]){
        // console.log('deleting from old deleted|edited : <id: ' + oldSubtitles[i].id + '> ');
        oldSubtitles.splice(i, 1);
      }
      else{
        for(var j = newSubtitles.length -1; j >= 0 ; j--){
          if(oldSubtitles[i].id == newSubtitles[j].id){
            // console.log('deleting from old same as new: <id: ' + oldSubtitles[i].id + '> ');
            oldSubtitles.splice(i, 1);
            break;
          }
        }
      }
  }

  var iNew = 0;
  var iOld = 0;

  while(iNew < newSubtitles.length && iOld < oldSubtitles.length){
    // Untouched subtitles
    if(newSubtitles[iNew].id == oldSubtitles[iOld].id){
      // console.log('adding joined : <id: ' + newSubtitles[iNew].id + '>');
      joinedSubs.push(newSubtitles[iNew]);
      iNew++;
      iOld++;
    }

    // No overlap - new is before
    else if(isBeforeNoOverlap(newSubtitles[iNew], oldSubtitles[iOld])){
      // console.log('adding new : <id: ' + newSubtitles[iNew].id + '>');
      joinedSubs.push(newSubtitles[iNew]);
      iNew++;
    }

    // No overlap - old is before
    else if(isBeforeNoOverlap(oldSubtitles[iOld], newSubtitles[iNew])){
      // console.log('adding old : <id: ' + oldSubtitles[iOld].id + '>');
      joinedSubs.push(oldSubtitles[iOld]);
      iOld++;
    }

    // Overlapping subtitles - we'll take the new one
    else{
      // console.log('overlap: adding new : <id: ' + newSubtitles[iNew].id + '>');
      joinedSubs.push(newSubtitles[iNew]);
      iNew++;
      iOld++;
    }
  }

  // insert remaining subs
  for(; iNew < newSubtitles.length; iNew++){
     // console.log('remaining: adding new : <id: ' + newSubtitles[iNew].id + '>');
    joinedSubs.push(newSubtitles[iNew]);
  }
  for(; iOld < oldSubtitles.length; iOld++){
    // console.log('remaining: adding old : <id: ' + oldSubtitles[iOld].id + '>');
    joinedSubs.push(oldSubtitles[iOld]);
  }

  return joinedSubs;
}

function isBeforeNoOverlap(firstSub, secondSub){
    return (firstSub.endTime < secondSub.startTime)
}

function fileExists(filePath)
{
    try
    {
        return fs.statSync(filePath).isFile();
    }
    catch (err)
    {
        return false;
    }
}