// Angular Code

var app = angular.module('Tau-Subtitles', []);

app.controller('subtitleTableController',function subtitleTableController($scope, $http) {
	var subtitle = {
	    startTime:0,
	    endTime:-1,
	    txt:""
	};

	$scope.subtitles = [subtitle];

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

	$scope.keyPressedFromTextBox = function(i, caseNum){
		var position = jwplayer().getPosition();

		if (caseNum == 1) {
			if ($scope.subtitles[i].endTime == -1) {
				$scope.subtitles[i].endTime = position;
			};
			
			var newSub = {
			    startTime:position,
			    endTime:-1,
			    txt:""
			};

			if (i < $scope.subtitles.length) {
				$scope.subtitles.splice(i, 0, newSub);

				return;
			};
		};
		
		if (caseNum == 2) {
			$scope.subtitles[i].endTime = position;
		}

		if (caseNum == 3) {
			$scope.subtitles.splice(i,1);
		}

		if (caseNum == 4) {	
			$scope.saveFile();
		}

		if (caseNum == 5) {	
			$scope.subtitles[i].startTime = position;
			$scope.subtitles.sort(function(a,b) { return a.startTime - b.startTime})
		}
	}

	jwplayer().on('captionsChanged', function(){
		jwplayer().setCurrentCaptions(0);
	});

	$scope.saveFile = function(){
        var data = {userId:"YairLevi1", videoId : "sampleVideo" , txt :JSON.stringify($scope.subtitles)};
        $http.post("/api/saveSrtFileForUser", data).success(function(data, status) {
            
        })
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

            if(event.ctrlKey && event.which == 70) { // ctrl + f - case #2
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",2)");
                });

                event.preventDefault();
            }

            if(event.ctrlKey && event.which == 68) { // ctrl + d - case #3
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",3)");
                });

                event.preventDefault();
            }

            if(event.ctrlKey && event.shiftKey && event.which == 83) { // ctrl + s - case #4
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",4)");
                });

                event.preventDefault();
            }

            if(event.ctrlKey && event.which == 71) { // ctrl + g - case #5
            	scope.$apply(function (){
                    scope.$eval(attrs.myEnter  + ",5)");
                });

                event.preventDefault();
            }

            if(event.ctrlKey && event.which == 13) { // ctrl + enter
            	var playerState = jwplayer().getState();
            	if (playerState == "idle" || playerState == "paused"){
            		jwplayer().play();
            	}
            	if (playerState == "playing"){
            		jwplayer().pause();
            	}
            }
        });
    };
});

