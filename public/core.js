// Angular Code

var app = angular.module('Tau-Subtitles', []);

app.controller('subtitleTableController',function subtitleTableController($scope) {
	var subtitle = {
	    startTime:0,
	    endTime:-1,
	    text:""
	};

	$scope.subtitles = [subtitle];

	$scope.ticksToTimeString = function(ticks){
		if (ticks < 0) {
			return "--:--:--";
		};

		var sec = parseInt((ticks%60));
		var min = parseInt(((ticks%3600)/60));
		var hour = parseInt((ticks/3600));

		var secStr = "" + sec;
		var minStr = "" + min;
		var hourStr = "" + hour;

		if (sec < 10) {
			secStr = "0" + sec;
		};

		if (min < 10) {
			minStr = "0" + min;
		};

		if (hour < 10) {
			hourStr = "0" + hour;
		};

		return hourStr + ":" + minStr + ":" + secStr;
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
			    text:""
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
	}

	jwplayer().on('captionsChanged', function(){
		jwplayer().setCurrentCaptions(0);

	});
});


app.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
        	// http://www.cambiaresearch.com/articles/15/javascript-key-codes
            if(event.ctrlKey && event.which == 83) { // ctrl + s - case #1
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

            if(event.ctrlKey && event.which == 13) { // ctrl + enter - case #3
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

