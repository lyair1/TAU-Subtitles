// Angular Code
var app = angular.module('Tau-Subtitles', ['ngAnimate', 'ui.bootstrap']);

app.controller('subtitleTableController',function subtitleTableController($scope, $http, $location) {

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

	$scope.userId = $scope.getQueryVariable("user");
	$scope.userPass = "";
	$scope.videoId = $scope.getQueryVariable("id");
	$scope.authenticated = false;

	$scope.subtitles = [];

	$scope.deletedIds = {};
	$scope.addedIds = {};
	$scope.editedIds = {};

	$scope.updateLatest();

	$scope.alerts = [];

	// Ticks is in this <seconds>.<milliseconds>
	$scope.ticksToTimeString = function(ticks){
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

	$scope.tryToAuthenticate = function(){
		//alert("Trying to authenticate with:" + $scope.userId + " and " + $scope.userPass);

		var data = {userId:$scope.userId, userPass : $scope.pass};

		$http.post("/api/auth", data).success(function(data, status) {
			$scope.authenticated = data == "authenticated";
        });
	}

	$scope.subClick = function(index){
  		$scope.currentIndex = index;
		$scope.handleLoop(index);
	}

	$scope.timeClick = function(time){
		jwplayer().seek(time);
	}

	$scope.keyPressedFromTextBox = function(i, caseNum){
		var position = jwplayer().getPosition();
		if (caseNum == 1) {
			// Adding Row

			if ($scope.subtitles[i].endTime == -1) {
				$scope.subtitles[i].endTime = position;
			};
			
			var newSub = {
				id:$scope.guid(),
			    startTime:position,
			    endTime:-1,
			    txt:""
			};
			$scope.addedIds[newSub.id] = true;

			if (i < $scope.subtitles.length) {
				$scope.subtitles.splice(i, 0, newSub);
			};
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
			$scope.sortSubtitles(false);

			if($scope.valdiateSubs() != -1){
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
			document.getElementById("loop").checked ^= true;
		}

		if (caseNum == 100) {
			// Editing text
			$scope.handleRowEdit($scope.subtitles[i].id)
		}

		// Sort subtitles
        $scope.sortSubtitles(true);

		$scope.handleLoop(i);
	}

	$scope.handleLoop = function(i){
		jwplayer().onTime(function (event) {
			if(document.getElementById("loop").checked && $scope.validSubtitle($scope.subtitles[i]).length == 0){
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
			$scope.addAlertMessage("File saved.", 'warning');
			$scope.latestHash = data;
			$scope.updateLatest();
        });

        deletedIds =[];
        addedIds =[];
        editedIds =[];
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
	$scope.valdiateSubs = function(){
		var subLen = $scope.subtitles.length;

		for(var i = 0 ; i < subLen ; i++){
			if($scope.validSubtitle($scope.subtitles[i]).length > 0){
				$scope.addAlertMessage("Subtitle " + i + " times are wrong", 'warning');
				return i;
			}
			// 2 subs starts at the same time
			if((i != subLen -1) &&  $scope.subtitles[i].startTime == $scope.subtitles[i+1].startTime){
				var j = i+1;
				$scope.addAlertMessage("Subtitles " + i + " and " + j +" start at the same time", 'warning');
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
  			return "Start Time > End Time";
  		}

  		if (sub.endTime - sub.startTime > 15) {
  			return "Subtitle Length > 15 sec"
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

            else if(event.ctrlKey && event.which == 38){ // ctrl + up arrow
            	scope.speed = Math.min(scope.speed + 0.1, 2.0)
            	scope.changeSpeed(scope.speed);
            	event.preventDefault();
            }
			
			else if(event.ctrlKey && event.which == 40){ // ctrl + down arrow
				scope.speed = Math.max(scope.speed - 0.1, 0.5)
            	scope.changeSpeed(scope.speed);
                event.preventDefault();
            }
            else if(event.which >= 33 && event.which <= 126){
            	// if it's not one of the above, than the user edited the text
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",100)");
                });
            }
        });
    };
});

