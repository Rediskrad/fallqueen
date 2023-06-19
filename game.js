var canvas = document.getElementById("canvas");
// textures
var playerImg = document.getElementById("player-img");
var playerW1Img = document.getElementById("player-w1-img");
var playerW2Img = document.getElementById("player-w2-img");
var playerImg = document.getElementById("player-img");
var playerCrouchImg = document.getElementById("player-c-img");
var lifeImg = document.getElementById("life-img");
var spikeBotImg = document.getElementById("spike-bot-img");
var spikeTopImg = document.getElementById("spike-top-img");
var spikeLeftImg = document.getElementById("spike-left-img");
var spikeRightImg = document.getElementById("spike-right-img");
var saw1Img = document.getElementById("saw1-img");
var saw2Img = document.getElementById("saw2-img");
var brickImg = document.getElementById("brick-img");
var checkpointSmImg = document.getElementById("checkpoint-sm-img");
var checkpointSmTImg = document.getElementById("checkpoint-smt-img");
var checkpointBImg = document.getElementById("checkpoint-b-img");
var checkpointBTImg = document.getElementById("checkpoint-bt-img");
var menuRainImg = document.getElementById("menu-rain-img");


var ctx = canvas.getContext("2d");		// drawing context of canvas
var gameStart = new Date().getTime();	// time game started
var gameEnd = null;						// time game ended
var lastRender = new Date().getTime();	// time of last rendered frame
var lastLoop = new Date().getTime();	// time of last gameloop

var FPS = 60;					// render fps

var lvlwidth = lvl[0].length;	// number of level blocks in x axis
var lvlheight = lvl.length;		// number of level blocks in y axis
var lvlyStart = 13;				// starting block y coordinate
var lvlyEnd = 348;				// ending block y coordinate
var blockSize = 30;				// size of level blocks in pixels
var scrollVal = 0;				// current level scoll in pixels
var canvasBlockHeight = Math.ceil(canvas.height / blockSize);		// number of level blocks in y axis within 1 screen

var maxJumpHeight = 350;		// max jump height in pixels
var devMode = location.search == "?dev";	// dev mode gives infinite lives
var maxLives = 5;

var jumpCD = 32;	// jump cooldown in gameloops

var loop = 0;		// number of current gameloop
var bgColor = "#55BBFF";

var volume = 0.5;	// sound volume

var textSize = 12;	// text size of dialogs

var menuOpened = true;
var gameStarted = false;

var animSequence = null;	// cutscene animation sequence that is currently being played
var triggeredCutscenes = {};	// list of already triggered cutscenes, so they wont be triggered again
var dialog = null;		// dialog with text currently displayed within cutscene
var cutscenesTmp = JSON.parse(JSON.stringify(cutscenes));	// copy of cutscene object to restore from after new game
var picsTmp = JSON.parse(JSON.stringify(pics));	// copy of pics object to restore from after new game
var gameFinished = false;	// true when game ending was reached, blocks inputs and game progression

var ctrls = {		// what inputs are currently pressed
	up: false,
	left: false,
	right: false
};

var lastBigCheckPoint = {	// last activated big checkpoint (where player respawns after all lives are lost)
	x: start.x,
	y: start.y
};

var lastSmallCheckPoint = {	// last activated small checkpoint (where player respawns after a live is lost)
	x: start.x,
	y: start.y
};

var player = {
	lives: maxLives,		// number of player lives
	x: Math.floor(start.x * blockSize - 27),			// player x coordinate
	y: Math.floor(start.y * blockSize - 90),			// player y coordinate
	xv: 0,			// player speed in x axis
	yv: 0,			// player speed in y axis
	height: 90,		// player height in pixels
	width: 54,		// player width in pixels
	falling: false,	// whether player is currently falling
	jumpCharging: false, // whether player is currently charging a jump
	jumping: false, // whether player is currently jumping
	jumpStart: 0,	// time (ms) jumping started charging
	jumpHeight: 0,	// charged jump height in pixels
	jumpYStart: 0,	// jumping y staring coordinate (pixels)
	jumpXV: 0,		// jumping x velocity (pixels)
	jumpDirection: 0,	// jumping x direction (-1, 0, 1)
	deaths: 0, 		// number of deaths
	facingRight: true	// is player facing right or left ?
};

var menuOptions = [
	{
		text: "Continue",
		enabled: loadGame(),
		action: () => {
			menuOpened = false;
			gameStarted = true;
		}
	},
	{
		text: "New Game",
		enabled: true,
		action: () => {
			menuOpened = false;
			gameStarted = true;
			menuOptions[0].enabled = true;
			selectedMenuOption = 0;
			newGame();
		}
	},
	{
		text: "Volume " + (Math.round(volume * 100) + "%"),
		enabled: true,
		action: () => {
			menuOptions[selectedMenuOption].text = "Volume " + (Math.round(volume * 100) + "%");
		}
	}
];

var selectedMenuOption = menuOptions[0].enabled ? 0 : 1;	// hilighted/selected menu option

// end game credits
var credits = `Programming: Rediskrad
Level Design: Rediskrad
Asset art: Rediskrad
Menu and player art: __refla (edits by Rediskrad)
Ending art: Shreds, LittleMissTina
Sound: Rainhoe (clips from vods)`;

// renders next frame and schedules next render
function render() {
	if (gameFinished) {
		// render credits
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		ctx.font = "36px Verdana";
		var lines = credits.split("\n");
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText("Credits:", 200, 100);
		var i = 0
		for (i = 0; i < lines.length; i++) {
			ctx.fillText(lines[i], 300, i * 100 + 200);
		}
		ctx.fillText("Game time: " + gameTime(), 300, i * 100 + 200);
	} else if (menuOpened) {
		// render menu
		ctx.fillStyle = "#333333";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
			
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "50px Verdana";
		ctx.fillText("Fall Queen", canvas.width / 2 - 120, 100);
		ctx.font = "24px Verdana";
		ctx.fillText("(a Rainhoe fan game)", canvas.width / 2 - 120, 160);
		
		for (var i = 0; i < menuOptions.length; i++) {
			ctx.font = "36px Verdana";
			if (i == selectedMenuOption) {
				ctx.fillStyle = "#FFFF00";
			} else if (menuOptions[i].enabled){
				ctx.fillStyle = "#FFFFFF";
			} else {
				ctx.fillStyle = "#777777";
			}
			ctx.fillText(menuOptions[i].text, canvas.width / 2 - 80, 300 + i * 100);
		}
		
		
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText("Controls:", 100, 700);
		ctx.fillText("Walk left = A, Left Arrow", 100, 740);
		ctx.fillText("Walk right = D, Right Arrow", 100, 780);
		ctx.fillText("Jump = W, Up Arrow, Space", 100, 820);
		ctx.fillText("Menu = Esc", 100, 860);
		
		ctx.drawImage(menuRainImg, canvas.width - menuRainImg.width, canvas.height - menuRainImg.height);
	} else if (animSequence && animSequence[0].type == "puzzle") {
		// render puzzle game
		var puzzle = animSequence[0];
		ctx.fillStyle = "#333333";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "50px Verdana";
		ctx.fillText(puzzle.text, 100, 100);
		
		ctx.fillText("Press [Enter] to confirm", canvas.width / 2 - 250, 830);
		ctx.lineWidth = 10;
		ctx.strokeStyle = "#FFFFFF";
		ctx.beginPath();
		ctx.ellipse(canvas.width / 2, canvas.height / 2, 300, 300, 0, 0, 2 * Math.PI);
		ctx.stroke();
		
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		for (var i = 0; i < 12; i++) {
			ctx.beginPath();
			ctx.moveTo(0, 270);
			ctx.lineTo(0, 290);
			ctx.stroke(); 
			ctx.rotate(30 * Math.PI/180);
		}
		ctx.restore();
		
		var minuteAngle = animSequence[0].value % 60 * 6 + 180;
		var hourAngle = animSequence[0].value / 60 * 30 + 180;
		
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		
		ctx.rotate(minuteAngle * Math.PI/180);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(0, 260);
		ctx.stroke();
		
		ctx.restore();
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		
		ctx.rotate(hourAngle * Math.PI/180);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(0, 200);
		ctx.stroke();
		
		ctx.restore();
			
	} else {
		// render level
		var scrollBlocks = Math.floor(scrollVal / blockSize);
		var renderOffset = scrollVal % blockSize;
		
		for (var i = 0; i + scrollBlocks < lvlheight && i < canvasBlockHeight; i++) {
			for (var j = 0; j < lvlwidth; j++) {
				if (lvl[i + scrollBlocks][j] == 0 || lvl[i + scrollBlocks][j] <= -100) {
					ctx.fillStyle = bgColor;
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else if (lvl[i + scrollBlocks][j] == 1) {
					ctx.drawImage(brickImg, j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else if (lvl[i + scrollBlocks][j] == 10) {
					ctx.fillStyle = bgColor;
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
					ctx.drawImage(spikeBotImg, j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else if (lvl[i + scrollBlocks][j] == 11) {
					ctx.fillStyle = bgColor;
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
					ctx.drawImage(spikeTopImg, j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else if (lvl[i + scrollBlocks][j] == 12) {
					ctx.fillStyle = bgColor;
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
					ctx.drawImage(spikeLeftImg, j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else if (lvl[i + scrollBlocks][j] == 13) {
					ctx.fillStyle = bgColor;
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
					ctx.drawImage(spikeRightImg, j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else if (lvl[i + scrollBlocks][j] == 20) {
					ctx.fillStyle = bgColor;
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
					var img = checkpointBImg;
					if (lastBigCheckPoint.x == j && lastBigCheckPoint.y == i + scrollBlocks) {
						img = checkpointBTImg;
					}
					ctx.drawImage(img, j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else if (lvl[i + scrollBlocks][j] == 21) {
					ctx.fillStyle = bgColor;
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
					var img = checkpointSmImg;
					if (lastSmallCheckPoint.x == j && lastSmallCheckPoint.y == i + scrollBlocks) {
						img = checkpointSmTImg;
					}
					ctx.drawImage(img, j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				} else {
					ctx.fillStyle = "#FF00FF";
					ctx.fillRect(j * blockSize, i * blockSize - renderOffset, blockSize, blockSize);
				}
			}
		}
		
		// render saws
		var sawImg = saw1Img;
		if (loop % 10 < 5) {
			sawImg = saw2Img;
		}
		for (var i = 0; i < saws.length; i++) {
			if (visible(saws[i])) {
				ctx.drawImage(sawImg, saws[i].x - saws[i].width/2, saws[i].y - saws[i].height/2 - scrollVal, saws[i].width, saws[i].height); 
			}
		}
		
		
		// render background imgs
		for (var i = 0; i < pics.length; i++) {
			if (visible(pics[i])) {
				var usedScrollVal = pics[i].absolute ? 0 : scrollVal;
				if (pics[i].angle != undefined && pics[i].angle != 0) {
					ctx.save();
					ctx.translate(pics[i].x + pics[i].width/2, pics[i].y - usedScrollVal + pics[i].height/2);
					ctx.rotate(pics[i].angle * Math.PI/180);
					ctx.drawImage(document.getElementById(pics[i].id), -pics[i].width/2, -pics[i].height/2, pics[i].width, pics[i].height);
					ctx.restore();
				} else {
					ctx.drawImage(document.getElementById(pics[i].id), pics[i].x, pics[i].y - usedScrollVal, pics[i].width, pics[i].height);
				}
			}
		}
		
		// render text dialogs
		for (var i = 0; i < texts.length; i++) {
			if (visible(texts[i])) {
				renderText(texts[i]);
			}
		}
		if (dialog) {
			renderText(dialog);
		}
		
		// render player
		if (!player.hidden) {
			var img = player.jumpCharging ? playerCrouchImg : playerImg;
			var walking = !player.jumpCharging && !player.falling && !player.jumping && player.xv != 0;
			if (walking) {
				img = loop % 20 >= 10 ? playerW1Img : playerW2Img;
			}
			if (animSequence) {
				img = playerImg;
			}
			if (player.facingRight) {
				ctx.save();
				ctx.translate(player.width + player.x, 0);
				ctx.scale(-1, 1);
			}
			ctx.drawImage(img, !player.facingRight ? player.x : 0, player.y - scrollVal, player.width, player.height);
			
			if (player.facingRight) {
				ctx.restore();
			}
		}
		// render interface
		for (var i = 0; i < Math.min(player.lives, 10); i++) {
			ctx.drawImage(lifeImg, i * 35 + 5, 5, 30, 30);
		}
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "20px Verdana";
		ctx.fillText(gameTime(), canvas.width - 100, 25);
		var progress = Math.floor(((player.y + player.height - lvlyStart * blockSize) / ((lvlyEnd - lvlyStart) * blockSize)) * 100);
		ctx.fillText("Progress: " + Math.max(progress, 0) + "%", canvas.width - 160, 55);
		ctx.fillText("Deaths: " + player.deaths, canvas.width - 90 - (String(player.deaths).length * 15), 85);
		
	}
	// schedule next frame render
	var now = new Date().getTime();
	// compensate shecduling if frame time is too long or short
	if (now - lastRender > frameTime) {
		waitRenderTime--;
	}
	if (now - lastRender < frameTime) {
		waitRenderTime++;
	}
	setTimeout(() => render(), waitRenderTime);		
	lastRender = now;
}

var waitRenderTime = 1000 / FPS; // time to wait till next frame with compensation
var frameTime = 1000 / FPS;	// desired frame time


function renderText(text) {
	ctx.font = textSize + "px Verdana";
	var value = text.value;
	var lines = value.split("\n");
	ctx.fillStyle = "#BB7755";
	ctx.fillRect(text.x, text.y - scrollVal, text.width, text.height);
	ctx.fillStyle = "#FFFFFF";
	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], text.x + textSize, text.y + (i * textSize * 1.5) - scrollVal + textSize * 2);
	}
}

// calculates textbox size for dialogs
function setTextSize(text) {
	ctx.font = textSize + "px Verdana";
	
	var lines = text.value.split("\n");
	var maxWidth = 0;
	for (let i = 0; i < lines.length; i++) {
		maxWidth = Math.max(ctx.measureText(lines[i]).width, maxWidth);
	}
	text.width = Math.floor(maxWidth + textSize * 2);
	text.height = lines.length * textSize * 1.5 + textSize * 2;
}

// determines whether object is visible on screen (to prevent rendering objects out of frame)
function visible(obj) {
	if (obj.hidden) return false;
	if (obj.absolute) return true;
	var minY = scrollVal;
	var maxY = scrollVal + canvas.height;
	return obj.y + obj.height >= minY && obj.y <= maxY;
}

// calculates time from game start and returns it in readable format "hh:mm:ss"
function gameTime() {
	var gameDuration = (gameEnd ? gameEnd : new Date().getTime()) - gameStart;
	var hours = Math.floor(gameDuration / (60 * 60 * 1000));
	gameDuration -= hours * 60 * 60 * 1000;
	var mins = Math.floor(gameDuration / (60 * 1000));
	gameDuration -= mins * 60 * 1000;
	var secs = Math.floor(gameDuration / 1000);
	return String(hours).padStart(2, '0') + ":" + String(mins).padStart(2, '0') + ":" + String(secs).padStart(2, '0');
}

// periodically handles game logic (acts on inputs, handles physics, advances cutscenes)
function gameloop() {
	if (gameFinished) {
		return;
	}
	if (!menuOpened && animSequence) {
		// advance cutscene
		var currentSeq =  animSequence[0];
		if (currentSeq.type == "animation") {
			var target = currentSeq.target == "player" ? player : pics.find(i => i.id == currentSeq.target);
			var relPos = Math.min((new Date().getTime() - currentSeq.startTime) / currentSeq.duration, 1);
			target.x = currentSeq.x1 + (currentSeq.x2 - currentSeq.x1) * relPos;
			target.y = currentSeq.y1 + (currentSeq.y2 - currentSeq.y1) * relPos;
			
			if (currentSeq.a1 != currentSeq.a2) {
				target.angle = currentSeq.a1 + (currentSeq.a2 - currentSeq.a1) * relPos;
			}
		} else if (currentSeq.type == "dialog" && !dialog) {
			dialog = {
				x: currentSeq.x1,
				y: currentSeq.y1,
				value: currentSeq.text + "\n[Enter]"
			};
			setTextSize(dialog);
		} else if (currentSeq.type == "puzzle") {
			if (currentSeq.speed == undefined) {
				currentSeq.speed = 0.3;
			}
			if (ctrls.left) {
				currentSeq.speed = Math.min(currentSeq.speed + 0.01, 2);
				currentSeq.value -= currentSeq.speed; 
				if (currentSeq.value < 0) {
					currentSeq.value += 720;
				}
			}
			if (ctrls.right) {
				currentSeq.speed = Math.min(currentSeq.speed + 0.01, 2);
				currentSeq.value += currentSeq.speed;
				if (currentSeq.value > 720) {
					currentSeq.value -= 720;
				}
			}
		} else if (currentSeq.type == "hide") {
			var target = currentSeq.target == "player" ? [player] : pics.filter(i => i.id == currentSeq.target);
			target.forEach(i => i.hidden = true);
		} else if (currentSeq.type == "show") {
			var target = currentSeq.target == "player" ? [player] : pics.filter(i => i.id == currentSeq.target);
			target.forEach(i => i.hidden = false);
		} else if (currentSeq.type == "ending") {
			gameEnd = new Date().getTime();
			gameFinished = true;
			localStorage.clear();
		}
		
		if (currentSeq.endTrigger == "timer") {
			if (new Date().getTime() - currentSeq.startTime >= currentSeq.duration) {
				nextAnimSequence();
			}
		}
	} else if (!menuOpened) {
		// apply controlls
		if (!player.jumping && !player.falling && !player.jumpCharging) {
			if (ctrls.left) {
				player.xv = -5;
				player.jumpXV = 5;
				player.jumpDirection = -1;
			}
			if (ctrls.right) {
				player.xv = 5;
				player.jumpXV = 5;
				player.jumpDirection = 1;
			}
			if (!ctrls.left && !ctrls.right) {
				player.xv = 0;
			}
		}
		if (player.jumping) {
			if (player.jumpYStart - player.y >= player.jumpHeight) {
				player.jumping = false;
				player.yv = 0;
			} else {
				player.yv = -15;
				player.xv = player.jumpXV * player.jumpDirection;
			}
		}
		if (player.jumpCharging) {
			var chargeDur = new Date().getTime() - player.jumpStart;
			if (Math.floor(chargeDur * chargeDur / 1400) >= maxJumpHeight) {
				jumpChargeRelease();
			}
		}
		
	
		// top collision
		var blockOver = checkCollisionTop();
		if (blockOver.collision && player.yv < 0) {
			player.jumping = false;
			player.yv = 0;
			player.y = (blockOver.y + 1) * blockSize;
		}
		
		var newXV = player.xv;
		
		// left collision
		var blockLeft = checkCollisionLeft();
		if (blockLeft.collision && player.xv < 0) {
			if (player.jumping || player.falling) {
				player.xv = blockLeft.dist - player.jumpXV * player.jumpDirection;
				player.jumpDirection = 1;
				player.jumpXV = Math.floor(player.jumpXV / 2);
				newXV = player.jumpXV * player.jumpDirection;
			} else {
				player.xv = Math.max(blockLeft.dist, player.xv);
			}
		}
		
		// right collision
		var blockRight = checkCollisionRight();
		if (blockRight.collision && player.xv > 0) {
			if (player.jumping || player.falling) {
				player.xv = blockRight.dist - player.jumpXV * player.jumpDirection;
				player.jumpDirection = -1;
				player.jumpXV = Math.floor(player.jumpXV / 2);
				newXV = player.jumpXV * player.jumpDirection;
			} else {
				player.xv = Math.min(blockRight.dist, player.xv);
			}
		}

		
		//gravity
		var blockUnder = checkCollisionBottom();
		if (!blockUnder.collision) {
			if (!player.jumping) {
				player.falling = true;
				player.yv = Math.min(player.yv + 1, 15);
			}
		} else if (player.yv > 0) {
			player.yv = 0;
			player.y = blockUnder.y * blockSize - player.height;
			player.falling = false;
			player.jumping = false;
		}
		
		// check colliding transparent blocks
		var collidingBlocksMap = getCollidingBlockTypes();
		var collidingBlocks = Object.keys(collidingBlocksMap).map(v => +v);
		for (var i = 0; i < collidingBlocks.length; i++) {
			var point = collidingBlocksMap[String(collidingBlocks[i])];
			if (collidingBlocks[i] >= 10 && collidingBlocks[i] <= 13) {
				// spike
				killPlayer();
			} else if (collidingBlocks[i] == 20) {
				// big checkpoint
				lastBigCheckPoint.x = point.x;
				lastBigCheckPoint.y = point.y;
				lastSmallCheckPoint.x = lastBigCheckPoint.x;
				lastSmallCheckPoint.y = lastBigCheckPoint.y;
				saveGame();
			} else if (collidingBlocks[i] == 21) {
				// small checkpoint
				lastSmallCheckPoint.x = point.x;
				lastSmallCheckPoint.y = point.y;
				saveGame();
			} else if (collidingBlocks[i] < -99) {
				var cutsceneId = String(collidingBlocks[i]);
				if (!triggeredCutscenes[cutsceneId]) {
					animSequence = cutscenes[cutsceneId];
					triggeredCutscenes[cutsceneId] = true;
					animSequence[0].startTime = new Date().getTime();
					saveGame();
				}
			}
		}
		// check collision with saws
		for (var i = 0; i < saws.length; i++) {
			if (isColliding(player, { 
					x: saws[i].x - saws[i].width / 2,
					y: saws[i].y - saws[i].width / 2,
					width: saws[i].width,
					height: saws[i].height
				})) {
				killPlayer();
			}
		}

		// move saws
		for (var i = 0; i < saws.length; i++) {
			if (saws[i].speed != 0) {
				if (saws[i].x1 != saws[i].x2) {
					saws[i].x += saws[i].speed;
					if (saws[i].x >= saws[i].x2) {
						saws[i].speed *= -1;
						saws[i].x = saws[i].x2;
					} else if (saws[i].x <= saws[i].x1) {
						saws[i].speed *= -1;
						saws[i].x = saws[i].x1;
					}
				} else if (saws[i].y1 != saws[i].y2) {
					saws[i].y += saws[i].speed;
					if (saws[i].y >= saws[i].y2) {
						saws[i].speed *= -1;
						saws[i].y = saws[i].y2;
					} else if (saws[i].y <= saws[i].y1) {
						saws[i].speed *= -1;
						saws[i].y = saws[i].y1;
					}
				}
			}
		}
				
		// applying speed to player
		player.x += player.xv;
		player.y = Math.max(player.y + player.yv, 0);
		
		player.xv = newXV;
		
		loop++;
		
		var desiredScrollVal = Math.max(player.y - canvas.height/2, 0);
		scrollVal = desiredScrollVal;
	}
	// schedule next game loop
	var now = new Date().getTime();
	if (now - lastLoop > loopTime) {
		waitLoopTime = Math.max(waitLoopTime - 1, 10);
	}
	if (now - lastLoop < loopTime) {
		waitLoopTime = Math.min(waitLoopTime + 1, 20);
	}		
	setTimeout(() => gameloop(), waitLoopTime);		
	lastLoop = now;
}

var waitLoopTime = 15; // time to wait between gameloops with compensastion
var loopTime = 15;	// desired time between gameloops

// determines wheter two rectangular objects are overlapping and returns true if they do
function isColliding(obj1, obj2) {
	var obj1Right = obj1.x + obj1.width;
	var obj2Right = obj2.x + obj2.width;
	var obj1Bot = obj1.y + obj1.height;
	var obj2Bot = obj2.y + obj2.height;
	return obj1.x < obj2Right && obj1Right > obj2.x && obj1.y < obj2Bot && obj1Bot > obj2.y;
}

// handles player death (adjusts statistics and respawns player)
function killPlayer() {
	player.deaths++;
	if (!devMode) {
		player.lives--;
	}
	var loc = {};
	if (player.lives > 0) {
		loc = blockCoordToPlayerLoc(lastSmallCheckPoint.x, lastSmallCheckPoint.y);
		if (lastSmallCheckPoint.x == lastBigCheckPoint.x && lastSmallCheckPoint.y == lastBigCheckPoint.y) {
			player.lives = maxLives;
		}
	} else {
		lastSmallCheckPoint.x = lastBigCheckPoint.x;
		lastSmallCheckPoint.y = lastBigCheckPoint.y;
		player.lives = maxLives;
		loc = blockCoordToPlayerLoc(lastBigCheckPoint.x, lastBigCheckPoint.y);
	}
	var audio = new Audio('sounds/death' + (player.deaths % 3 + 1) + '.mp3');
	audio.volume = volume;
	audio.play();
		
	player.x = loc.x;
	player.y = loc.y;
	player.yv = 0;
	player.xv = 0;
	player.jumping = false;
	player.falling = false;
	player.jumpStart = 0;
	player.jumpYStart = 0;
	saveGame();
}

// converts block coordinates to real coordinates of player (to calculate respawn point)
function blockCoordToPlayerLoc(x, y) {
	var result = {
		x: Math.floor(x * blockSize - player.width / 2),
		y: Math.floor(y * blockSize - player.height)
	};
	
	var playerTmp = {...player};
	player.xv = -1;
	player.x = result.x;
	player.y = result.y;

	var colLeft = checkCollisionLeft();
	player.xv = 1;
	var colRight = checkCollisionRight();
	
	player = playerTmp;
		
	if (colLeft.collision) {
		result.x += colLeft.dist;
	}
	if (colRight.collision) {
		result.x += colRight.dist;
	}
	return result;
}

// returns block types player is currently colliding with (to check for checkpoints, cutscene triggers, etc.)
function getCollidingBlockTypes() {
	var minXPlayer = Math.max(Math.floor((player.x + 1) / blockSize), 0);
	var maxXPlayer = Math.min(Math.floor((player.x + player.width - 2) / blockSize), lvlwidth - 1);
	var minYPlayer = Math.max(Math.floor((player.y) / blockSize), 0);
	var maxYPlayer = Math.min(Math.floor((player.y + player.height - 1) / blockSize), lvl.length - 1);
	var result = {};
	for (var i = minXPlayer; i <= maxXPlayer; i++) {
		for (var j = minYPlayer; j <= maxYPlayer; j++) {
			result[String(lvl[j][i])] = {x: i, y: j};
		}
	}
	return result;
}

// checks whether player is colliding with ground
function checkCollisionBottom() {
	var yBlockUnderPlayer = Math.floor((player.y + player.height + player.yv) / blockSize);
	var dist = yBlockUnderPlayer * blockSize - (player.y + player.height);
	if (yBlockUnderPlayer >= lvl.length) {
		return {y: lvl.length, collision: true, dist: dist};
	}
	var minXPlayer = Math.max(Math.floor((player.x + 1) / blockSize), 0);
	var maxXPlayer = Math.min(Math.floor((player.x + player.width - 2) / blockSize), lvlwidth - 1);
	var blockUnder = false;
	for (var i = minXPlayer; i <= maxXPlayer; i++) {
		if (lvl[yBlockUnderPlayer][i] == 1) {
			blockUnder = true;
			break;
		}
	}
	
	return {y: yBlockUnderPlayer, collision: blockUnder, dist: dist};
}

// checks whether player is colliding with ceiling
function checkCollisionTop() {
	var yBlockOverPlayer = Math.floor((player.y + player.yv) / blockSize);
	var dist = (Math.max(yBlockOverPlayer, -1) + 1) * blockSize - (player.y + player.height);
	if (yBlockOverPlayer < 0) {
		return {y: -1, collision:  true, dist: dist};
	}
	var minXPlayer = Math.max(Math.floor((player.x) / blockSize), 0);
	var maxXPlayer = Math.min(Math.floor((player.x + player.width - 1) / blockSize), lvlwidth - 1);
	var blockOver = false;
	for (var i = minXPlayer; i <= maxXPlayer; i++) {
		if (lvl[yBlockOverPlayer][i] == 1) {
			blockOver = true;
			break;
		}
	}
	return {y: yBlockOverPlayer, collision:  blockOver, dist: dist};
}

// checks whether player is colliding with wall left of player
function checkCollisionLeft() {
	var xBlockLeftOfPlayer = Math.floor((player.x + player.xv) / blockSize);
	var dist = (Math.max(xBlockLeftOfPlayer, 0) + 1) * blockSize - player.x;
	if (xBlockLeftOfPlayer < 0) {
		return {x: 0, collision: true, dist: dist};
	}
	var minYPlayer = Math.max(Math.floor((player.y) / blockSize), 0);
	var maxYPlayer = Math.min(Math.floor((player.y + player.height - 1) / blockSize), lvl.length - 1);
	var blockLeft = false;
	for (var i = minYPlayer; i <= maxYPlayer; i++) {
		if (lvl[i][xBlockLeftOfPlayer] == 1) {
			blockLeft = true;
			break;
		}
	}
	return {x: xBlockLeftOfPlayer, collision:  blockLeft, dist: dist};
}

// checks whether player is colliding with wall right of player
function checkCollisionRight() {
	var xBlockRightOfPlayer = Math.floor((player.x + player.width + player.xv) / blockSize);
	var dist = Math.min(xBlockRightOfPlayer, lvlwidth - 1) * blockSize - (player.x + player.width);
	if (xBlockRightOfPlayer >= lvlwidth) {
		return {x: lvlwidth - 1, collision: true, dist: dist};
	}
	var minYPlayer = Math.max(Math.floor((player.y) / blockSize), 0);
	var maxYPlayer = Math.min(Math.floor((player.y + player.height - 1) / blockSize), lvl.length - 1);
	var blockRight = false;
	for (var i = minYPlayer; i <= maxYPlayer; i++) {
		if (lvl[i][xBlockRightOfPlayer] == 1) {
			blockRight = true;
			break;
		}
	}
	return {x: xBlockRightOfPlayer, collision: blockRight, dist: dist};
}

// handles keyboard pbutton press
function keyDown(e) {
	if (gameFinished) {
		return;
	}
	if (e.code == 'KeyD' || e.code == 'ArrowRight') {
		if (menuOpened && selectedMenuOption == 2) {
			volume = Math.min(volume + 0.1, 1);
			menuOptions[selectedMenuOption].action();
		} else {
			ctrls.right = true;
			if (!animSequence) {
				player.facingRight = true;
			}
		}
	} else if (e.code == 'KeyA' || e.code == 'ArrowLeft') {
		if (menuOpened && selectedMenuOption == 2) {
			volume = Math.max(volume - 0.1, 0);
			menuOptions[selectedMenuOption].action();
		} else {
			ctrls.left = true;
			if (!animSequence) {
				player.facingRight = false;
			}
		}
	} else if (e.code == 'KeyW' || e.code == 'ArrowUp' || (e.code == 'Space' && !menuOpened)) {
		if (menuOpened) {
			selectedMenuOption = selectedMenuOption > 0 ? selectedMenuOption - 1 : menuOptions.length - 1;
			if (!menuOptions[selectedMenuOption].enabled) {
				selectedMenuOption = selectedMenuOption > 0 ? selectedMenuOption - 1 : menuOptions.length - 1;
			}
		} else {
			ctrls.up = true;
			if (!player.jumping && !player.falling && !player.jumpCharging) {
				player.jumpCharging = true;
				player.xv = 0;
				player.jumpStart = new Date().getTime();
			}
		}
	} else if (e.code == 'KeyS' || e.code == 'ArrowDown') {
		if (menuOpened) {
			selectedMenuOption = selectedMenuOption < menuOptions.length - 1 ? selectedMenuOption + 1 : 0;
			if (!menuOptions[selectedMenuOption].enabled) {
				selectedMenuOption = selectedMenuOption < menuOptions.length - 1 ? selectedMenuOption + 1 : 0;
			}
		}
	} else if (e.code == 'Escape') {
		if (!menuOpened) {
			menuOpened = true;
		} else if (gameStarted) {
			menuOpened = false;
		}
	} else if (e.code == 'Enter') {
		if (menuOpened) {
			menuOptions[selectedMenuOption].action();
		} else if (animSequence && animSequence[0].endTrigger == "user") {
			if (animSequence[0].type == "puzzle") {
				if (Math.abs(animSequence[0].value - animSequence[0].solution) <= 1) {
					dialog = null;
					nextAnimSequence();
				}
			} else {
				dialog = null;
				nextAnimSequence();
			}
		}
	}
}

// handles keyboard pbutton release
function keyUp(e) {
	if (gameFinished || menuOpened) {
		return;
	}
	if (e.code == 'KeyD' || e.code == 'ArrowRight') {
		if (animSequence && animSequence[0].type == "puzzle") {
			animSequence[0].speed = 0.3;
		}
		ctrls.right = false;
	} else if (e.code == 'KeyA' || e.code == 'ArrowLeft') {
		ctrls.left = false;
		if (animSequence && animSequence[0].type == "puzzle") {
			animSequence[0].speed = 0.3;
		}
	} else if (e.code == 'KeyW' || e.code == 'ArrowUp' || (e.code == 'Space' && !menuOpened)) {
		ctrls.up = false;
		if (player.jumpCharging) {
			jumpChargeRelease();
		}
	}
}

// sets player momentum after jump is released
function jumpChargeRelease() {
	var chargeDur = new Date().getTime() - player.jumpStart;
	player.jumping = true;
	player.jumpCharging = false;
	player.jumpYStart = player.y;
	player.jumpHeight = Math.min(Math.floor(chargeDur * chargeDur / 1400), maxJumpHeight);
	player.jumpDirection = ctrls.right ? 1 : (ctrls.left ? -1 : 0);
	player.jumpXV = 12;
	
	var audio = new Audio('sounds/jump.mp3');
	audio.volume = volume;
	audio.play();
}

// loads saved game from browser
function loadGame() {
	var save = JSON.parse(localStorage.getItem('save'));
	if (save) {
		player.lives = save.lives;
		player.deaths = save.deaths;
		lastBigCheckPoint = save.lastBigCheckPoint;
		lastSmallCheckPoint = save.lastSmallCheckPoint;
		volume = save.volume;
		gameStart = new Date().getTime() - save.time;
		triggeredCutscenes = save.triggeredCutscenes;
		
		var loc = blockCoordToPlayerLoc(lastSmallCheckPoint.x, lastSmallCheckPoint.y);
		player.x = loc.x;
		player.y = loc.y;
		return true;
	}
	return false;
}

// saves game to browser
function saveGame() {
	var save = {
		lives: player.lives,
		deaths: player.deaths,
		lastBigCheckPoint: lastBigCheckPoint,
		lastSmallCheckPoint: lastSmallCheckPoint,
		volume: volume,
		time: new Date().getTime() - gameStart,
		triggeredCutscenes: triggeredCutscenes
	};
	localStorage.setItem('save', JSON.stringify(save));
}

// creates new game
function newGame() {
	player.lives = 5;
	player.deaths = 0;
	lastBigCheckPoint = {
		x: start.x,
		y: start.y
	};
	lastSmallCheckPoint = {
		x: start.x,
		y: start.y
	};
	var loc = blockCoordToPlayerLoc(lastSmallCheckPoint.x, lastSmallCheckPoint.y);
	player.x = loc.x;
	player.y = loc.y;
	gameStart = new Date().getTime();
	triggeredCutscenes = {};
	cutscenes = JSON.parse(JSON.stringify(cutscenesTmp));
	pics = JSON.parse(JSON.stringify(picsTmp));
	saveGame();
}

// advances cutscene to next animation step
function nextAnimSequence() {
	animSequence.splice(0, 1);
	if (animSequence.length == 0) {
		animSequence = null;
	} else {
		animSequence[0].startTime = new Date().getTime();
	}
}

addEventListener("keydown", (e) => {keyDown(e)});
addEventListener("keyup", (e) => {keyUp(e)});

render();
gameloop();