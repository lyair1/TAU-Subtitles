// Angular Code
var app = angular.module('Tau-Subtitles', ['ngAnimate', 'ui.bootstrap']);

app.controller('subtitleTableController',function subtitleTableController($scope, $http, $location, $interval) {

	var saveFunc;
    $scope.autoSave = function() {
      // Don't start a autoSave if we are already autoSaving
      if ( angular.isDefined(saveFunc) ) return;

      saveFunc = $interval(function() {

      	// count invalid subtitles
      	var invalidSubs = 0;
      	var invalidIndex = -1;

		var subLen = $scope.subtitles.length;
		for(var i = 0 ; i < subLen ; i++){
			var message = $scope.validSubtitle($scope.subtitles[i]);
			if(message.length > 0){
				invalidSubs++;
				invalidIndex = i;
			}
		}

		if((invalidSubs == 1)){
			var sub = $scope.subtitles[invalidIndex]; 
			if(sub.endTime > -1 && sub.endTime <= sub.startTime){
				// We will not kick out this subtitle.. nothing to do
			}
			else{
      			// 3 for deleting row i
      			$scope.invalidSub = sub;
				$scope.keyPressedFromTextBox(invalidIndex, 3);
			}
		}

      	// 4 for validating and saving file. 1 is not important but mandatory
      	$scope.keyPressedFromTextBox(1, 4);

      }, 600000);
    };

    $scope.stopAutoSave = function() {
      	if (angular.isDefined(saveFunc)) {
	      	// canceling old autosave
	        $interval.cancel(saveFunc);
	        saveFunc = undefined;
    	}
    };

    $scope.$on('$destroy', function() {
      // Make sure that the interval is destroyed too
      $scope.stopAutoSave();
    });

	$scope.guid = function(){
		function s4() {
		    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  			}
  		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

  	$scope.updateLatest = function(){
		$http.get("/api/getLatestJsonSub/" + $scope.videoId).then(function(response) {
	       	data = response.data;
	       	if(data == ""){
	       		$scope.subtitles = [];
	       	}
	       	else{
	       		$scope.subtitles = data;
	       	}

			if($scope.invalidSub != undefined){
				$scope.subtitles.splice(0, 0, $scope.invalidSub);
				$scope.addedIds[$scope.invalidSub.id] = true;
				$scope.invalidSub = undefined;
			}

	       	$scope.sortSubtitles(true);
	    });
  	}
  	$scope.speed = 1.0;
  	$scope.currentIndex = 0;

  	$scope.getQueryVariable = function(variable) {
	    var query = window.location.search.substring(1);
	    var vars = query.split('&');
	    for (var i = 0; i < vars.length; i++) {
	        var pair = vars[i].split('=');
	        if (decodeURIComponent(pair[0]) == variable) {
	            return decodeURIComponent(pair[1]);
	        }
	    }
	}

	$scope.userPass = "";
	$scope.userFullName = "";
	$scope.userEmail = "";
	$scope.videoId = $scope.getQueryVariable("id");
	$scope.userId = getQueryVariable("user");
	$scope.token = $scope.getQueryVariable("token");
	$http.defaults.headers.common['Authorization'] = "Bearer " + $scope.token;
	$scope.authenticated = false;
	$scope.failedToAuthenticate = false;

	$scope.subtitles = [];
	$scope.loop = false;

	$scope.deletedIds = {};
	$scope.addedIds = {};
	$scope.editedIds = {};

	if($scope.token){
		$scope.updateLatest();		
	}

	$scope.invalidSub = undefined;

	$scope.alerts = [];
	$scope.jumpLength = 10;
	$scope.specialChars = [186, 188, 190, 191, 220, 222];

	// Ticks is in this <seconds>.<milliseconds>
	$scope.ticksToTimeString = function(ticks, showMilliseconds = true){
		if (ticks < 0) {
			return "--:--:--";
		};

		var milisecond = showMilliseconds ? parseInt((ticks*1000)%1000) : parseInt((ticks*100)%100); 
		var sec = parseInt(ticks%60);
		var min = parseInt(((ticks%3600)/60));
		var hour = parseInt((ticks/3600));

		var secStr = "" + sec;
		var minStr = "" + min;
		var hourStr = "" + hour;
		var milisecondStr = "." + milisecond;

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

	$scope.tryToAuthenticate = function(_videoId){
		var data = {userId:$scope.userId, userPass : $scope.userPass};

		$http.post("/api/auth", data).success(function(data, status) {
			$scope.userPass = "";
			if (data.auth) {
				// $scope.authenticated = data.auth;
				// $scope.userEmail = data.mail;
				// $scope.userFullName = data.fullName;
				// $http.defaults.headers.post.Authorization = "Bearer " + data.token;

				window.location = "http://lool.tau.ac.il/subtitle.html?token=" + data.token +"&id=" +_videoId;
			}else{
				$scope.failedToAuthenticate = true;
			}
			
        });
	}

	$scope.subClick = function(index){
  		$scope.currentIndex = index;
		$scope.handleLoop(index);
	}

	$scope.jumpToTime = function(time){
		jwplayer().seek(time);
	}

	$scope.addRow = function(i, position, lastWordSplitted){
		if ($scope.subtitles[i].endTime == -1) {
			$scope.subtitles[i].endTime = position;
		};

		newSubTxt = ""
		if(lastWordSplitted){
			var spaceLastOccurence = $scope.subtitles[i].txt.lastIndexOf(" ");

			if(spaceLastOccurence != -1){
				newSubTxt = $scope.subtitles[i].txt.substring(spaceLastOccurence + 1);
				$scope.subtitles[i].txt = $scope.subtitles[i].txt.substring(0, spaceLastOccurence);
			}
		}

		var newSub = {
			id:$scope.guid(),
		    startTime:position,
		    endTime:-1,
		    txt:newSubTxt
		};

		$scope.addedIds[newSub.id] = true;

		if (i < $scope.subtitles.length) {
			$scope.subtitles.splice(i, 0, newSub);
		};

	}

	$scope.keyPressedFromTextBox = function(i, caseNum){
		var position = jwplayer().getPosition();
		$scope.autoSave();

		if (caseNum == 1) {
			// Adding Row
			$scope.addRow(i, position, false);
		};
		
		if (caseNum == 2) {
			// Setting finish time
			$scope.handleRowEdit($scope.subtitles[i].id)
			$scope.subtitles[i].endTime = position;
		}

		if (caseNum == 3) {
			// Removing Row
			$scope.handleRowDelete($scope.subtitles[i].id)

			if($scope.subtitles.length == 1){
				$scope.subtitles[0].id = $scope.guid();
				$scope.subtitles[0].startTime = 0;
				$scope.subtitles[0].endTime = -1;
				$scope.subtitles[0].txt = "";
			}

			if($scope.subtitles.length > 1){
				$scope.subtitles.splice(i,1);
			}
		}

		if (caseNum == 4) {	
			// saving file
			$scope.stopAutoSave();
			$scope.sortSubtitles(false);
			$scope.latestHash = "";
			if($scope.validateSubs() != -1){
				$scope.focusOnSubtitle
				$scope.addAlertMessage("File was not saved. Fix errors", 'danger');
				$scope.sortSubtitles(true);
				return;
			}

			$scope.saveFile();
			$scope.sortSubtitles(true);
		}

		if (caseNum == 5) {
			// Setting start time
			$scope.handleRowEdit($scope.subtitles[i].id)

			$scope.subtitles[i].startTime = position;
			$scope.sortSubtitles(true);
		}


		if (caseNum == 6) {
			// changing loop
			$scope.loop ^= true;
		}

		if (caseNum == 7) {
			// jump to sub start time
			$scope.jumpToTime($scope.subtitles[i].startTime);
		}

		if (caseNum == 8) {
			// jump to sub end time
			if($scope.subtitles[i].endTime != -1){
				$scope.jumpToTime($scope.subtitles[i].endTime);
			}
		}

		if (caseNum == 9) {
			// decrease video speed
			// Math.round handles floating point issue in javascript
        	$scope.speed = Math.round(Math.min($scope.speed + 0.1, 2.0) * 100) / 100;
        	$scope.changeSpeed($scope.speed);
		}

		if (caseNum == 10) {
			// increase video speed
			// Math.round handles floating point issue in javascript
			$scope.speed = Math.round(Math.max($scope.speed - 0.1, 0.5) * 100) / 100;
        	$scope.changeSpeed($scope.speed);
		}

		if (caseNum == 11) {
			// Jump bacward by jumpLength
			$scope.jumpToTime(Math.max(0, position - $scope.jumpLength));
		}

		if (caseNum == 12) {
			// Jump forward by jumpLength
			$scope.jumpToTime(position + $scope.jumpLength);
		}

		if (caseNum == 100) {
			// Editing text with space
			if($scope.subtitles[i].txt.length >= 79){
				$scope.addRow(i, position, false);
			}

			$scope.handleRowEdit($scope.subtitles[i].id)
		}

		if (caseNum == 101) {
			// Editing text
			if($scope.subtitles[i].txt.length == 80){
				$scope.addRow(i, position, true);
			}

			$scope.handleRowEdit($scope.subtitles[i].id)
		}

		// Sort subtitles
        $scope.sortSubtitles(true);

		$scope.handleLoop(i);
	}

	$scope.handleLoop = function(i){
		jwplayer().onTime(function (event) {
			if($scope.loop && $scope.validSubtitle($scope.subtitles[i]).length == 0){
				if(event.position > $scope.subtitles[i].endTime && event.position < $scope.subtitles[i].endTime + 0.5){
					if($scope.currentIndex == i){
						jwplayer().seek($scope.subtitles[i].startTime);	
					}
				}
			}
		});
	}

	$scope.handleRowDelete = function(id){
		delete $scope.editedIds[id];

		if(id in $scope.addedIds){
			delete $scope.addedIds[id];
		}
		else{
			$scope.deletedIds[id] = true;
		}
	}

	$scope.handleRowEdit = function(id){
		if(!(id in $scope.addedIds)){
			$scope.editedIds[id] = true;
		}
	}


	$scope.saveFile = function(){
		$scope.sortSubtitles(false);
        var data = {userId:$scope.userId, videoId : $scope.videoId , txt :JSON.stringify($scope.subtitles),
        			deleted : JSON.stringify($scope.deletedIds),
        			added : JSON.stringify($scope.addedIds),
        			edited : JSON.stringify($scope.editedIds)};

        $http.post("/api/saveSrtFileForUser", data).success(function(data, status) {
			$scope.addAlertMessage("File saved.", 'success');
			$scope.latestHash = data;
			$scope.updateLatest();

	        $scope.deletedIds =[];
	        $scope.addedIds =[];
	        $scope.editedIds =[];
        });

	}

	$scope.sortSubtitles = function(backwards){
		// Sorting so that latest subtitle is the highest one, for user convinience
		$scope.subtitles.sort(function(a,b) { 
			if(backwards){
				return b.startTime - a.startTime;
			}

			return a.startTime - b.startTime;
		});
	}

	// returns true if any times was changed
	$scope.validateSubs = function(){
		var subLen = $scope.subtitles.length;

		for(var i = 0 ; i < subLen ; i++){
			var message = $scope.validSubtitle($scope.subtitles[i]);
			if(message.length > 0){
				$scope.addAlertMessage($scope.validSubtitle($scope.subtitles[i]) + " at subtitle " + (i+1), 'danger');
				return i;
			}
			// 2 subs starts at the same time
			if((i != subLen -1) &&  $scope.subtitles[i].startTime == $scope.subtitles[i+1].startTime){
				var j = i+1;
				$scope.addAlertMessage("Subtitles " +  i + " and " + j +" start at the same time", 'danger');
				return i;
			}
		}

		if(subLen < 2){
			return -1;
		}

		if($scope.subtitles[subLen-1].endTime < 0){
			// Set last subtitle to 1 sec period if not given
			$scope.subtitles[subLen-1].endTime = $scope.subtitles[subLen-1].startTime + 1;
		}

		for (var i = 0; i < $scope.subtitles.length-1; i++) 
		{
		    if($scope.subtitles[i].endTime < 0 || $scope.subtitles[i].endTime > $scope.subtitles[i+1].startTime){
		    	changedTimes = true;
		    	$scope.subtitles[i].endTime = $scope.subtitles[i+1].startTime;
		    	$scope.addAlertMessage("Times of overlapping subtitles were fixed", 'warning');
		    }
		}

		return -1;
	}

	// level:1 - success , 2- warning, 3 - alert
	$scope.addAlertMessage = function(text, level){
		$scope.alerts.push({msg : text, type : level});    
	}

	$scope.closeAlert = function(index) {
    	$scope.alerts.splice(index, 1);
  	};

  	$scope.validSubtitle = function(sub){
  		if (sub.txt.length == 0) {
  			return "Empty Subtitle";
  		}

  		if(sub.endTime == -1){
  			return "No End Time";
  		}

  		if(sub.startTime >= sub.endTime){
  			return "Start Time >= End Time";
  		}

  		return "";
  	}

	$scope.changeSpeed = function(speed){
	    if(IE11 || IEold){
	        jwplayer().seek(jwplayer().getPosition());
	        jwplayer().on('seek', function(){theVideo.playbackRate = speed;});
	        jwplayer().on('pause', function(){theVideo.playbackRate = speed;});
	        jwplayer().on('play', function(){theVideo.playbackRate = speed;});
	        theVideo.playbackRate = speed;
	    } else {
	        jwplayer().seek(jwplayer().getPosition());
	        theVideo.playbackRate = speed;
	      }
  	}
  


});


app.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
        	// http://www.cambiaresearch.com/articles/15/javascript-key-codes

            if(event.ctrlKey && event.which == 83 && !event.shiftKey) { // ctrl + s - case #1
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter + ",1)");
                });

                event.preventDefault();
            }

            else if(event.ctrlKey && event.shiftKey && event.which == 37){ // ctrl + shift + left arrow
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",11)");
                });
                event.preventDefault();
            }

            else if(event.ctrlKey && event.shiftKey && event.which == 39){ // ctrl + shift + right arrow
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",12)");
                });
                event.preventDefault();
            }

            else if(event.ctrlKey && event.which == 70) { // ctrl + f - case #2
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",2)");
                });

                event.preventDefault();
            }

            else if(event.ctrlKey && event.which == 68) { // ctrl + d - case #3
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",3)");
                });

                event.preventDefault();
            }

            else if(event.ctrlKey && event.shiftKey && event.which == 83) { // ctrl + shift + s - case #4
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",4)");
                });

                event.preventDefault();
            }

            else if(event.ctrlKey && event.which == 71) { // ctrl + g - case #5
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",5)");
                });

                event.preventDefault();
            }

            else if(event.ctrlKey && event.which == 76) { // ctrl + l - case #6
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",6)");
                });

                event.preventDefault();
            }

            else if(event.ctrlKey && event.which == 13) { // ctrl + enter
            	var playerState = jwplayer().getState();
            	if (playerState == "idle" || playerState == "paused"){
            		jwplayer().play();
            	}
            	if (playerState == "playing"){
            		jwplayer().pause();
            	}
            }

			else if(event.which == 13) { // enter without ctrl - adds new line (same as ctrl + s)
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter + ",1)");
                });

                event.preventDefault();
            }

            else if(event.ctrlKey && !event.shiftKey && event.which == 37){ // ctrl + left arrow
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",7)");
                });
                event.preventDefault();
            }

            else if(event.ctrlKey && !event.shiftKey && event.which == 39){ // ctrl + right arrow
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",8)");
                });
                event.preventDefault();
            }

            else if(event.ctrlKey && event.which == 38){ // ctrl + up arrow
            	scope.$apply(function (){
            		scope.$eval(attrs.myEnter  + ",9)");
                });
            	event.preventDefault();	
            }
			
			else if(event.ctrlKey && event.which == 40){ // ctrl + down arrow
            	scope.$apply(function (){
            		scope.$eval(attrs.myEnter  + ",10)");
                });
                event.preventDefault();
            }

            else if((event.which >= 32 && event.which <= 126) || scope.specialChars.indexOf(event.which) > -1){
            	// if it's not one of the above, than the user edited the text
            	if(event.which == 32){ // space is a special case
	            	scope.$apply(function (){
                		scope.$eval(attrs.myEnter  + ",100)");
                	});
            	}
            	else{
	            	scope.$apply(function (){
	                    scope.$eval(attrs.myEnter  + ",101)");
	                });
            	}

            }
        });
    };
});

