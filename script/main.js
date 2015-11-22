var Point = function (fill) {
  this.fill = fill;

  this.draw = function (pointRidig, ctx) {
    ctx.fillStyle = this.fill;

    ctx.beginPath();
    ctx.fillRect(pointRidig.x - pointRidig.size / 2, pointRidig.y - pointRidig.size / 2, pointRidig.size, pointRidig.size);
    ctx.closePath();
  }
};

var Ball = function (fill, stroke) {
  this.fill = fill;
  this.stroke = stroke;

  this.draw = function (ballRigid, ctx) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;

    ctx.beginPath();
    ctx.arc(ballRigid.x, ballRigid.y, ballRigid.r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.arc(ballRigid.x, ballRigid.y, ballRigid.r, 0, 2 * Math.PI);
    ctx.stroke();
  };
};

var Brick = function (fill, stroke) {
  this.fill = fill;
  this.stroke = stroke;

  this.draw = function (brickRigid, ctx) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;

    ctx.beginPath();
    ctx.fillRect(brickRigid.x, brickRigid.y, brickRigid.w, brickRigid.h);
    ctx.strokeRect(brickRigid.x, brickRigid.y, brickRigid.w, brickRigid.h);
    ctx.closePath();
  };
};

function initializePhysics() {
  worker = new Worker("script/worker.js");
  var sync = 0;
  worker.onmessage = function (e) {
    if(e.data.sync == sync){
      update(e.data);
    }
  };
  return {
    updateSpeed: function(x){
      worker.postMessage({
        type: 'updateSpeed',
        data: x
      });
    },
    updatePaddle: function(x){
      worker.postMessage({
        type: 'updatePaddlePosition',
        data: x
      });
    },
    updateBall: function(ballData){
      worker.postMessage({
        type: 'updateBall',
        data: ballData
      });
    },
    updateBricks: function(bricks){
      worker.postMessage({
        type: 'updateBricks',
        data: bricks
      });
    },
    setPhysicsFps: function(fps){
      worker.postMessage({
        type: 'setPhysicsFps',
        data: fps
      });
    },
    start: function(){
      sync++;
      worker.postMessage({
        type: 'sync',
        data: sync
      });
      worker.postMessage({
        type: 'start'
      });
    },
    sync: function(){
      sync++;
      worker.postMessage({
        type: 'sync',
        data: sync
      });
    }
  };
}

var animationToken,
  worker,
  previousFrameTime = window.performance.now(),
  frameCount = 0,
  speed = 0.0,
  removedCount = 0,
  showArrow = true,
  level = 1,
  ctx = canvasInit(),
  physicsEngine = initializePhysics()
;

var GameObjects = {
  ball: {
    render: new Ball('#ffffff', 'rgba(0,0,0,0)'),
    body: {
      x: 250,
      y: 320,
      r: 8
    }
  },
  paddle: {
    render: new Brick('#ffffff', 'rgba(0,0,0,0)'),
    body: {
      x: 200,
      y: 470,
      w: 100,
      h: 20
    }
  },
  brick: {
    render: new Brick('#94a1ad','rgba(0,0,0,0)'),
    bodies: generateBricks(level)
  },
  debugPoints: [],
};


function generateBricks(rows) {
  var bricks = [];
  for (var j = 0; j < rows; j++) {
    for (var i = 0; i < 5; i++) {
      bricks.push({
          x: 25 + i * 100,
          y: 25 + j * 50,
          w: 50,
          h: 25,
          r: 8.0
      });
    }
  }
  return bricks;
}

function update(physicsState) {
  GameObjects.ball.body = physicsState.ball;
  GameObjects.paddle.body = physicsState.paddle;
  GameObjects.brick.bodies = physicsState.bricks;

    // ball.updatePhysicsState(physicsState.ball)
    var ball = GameObjects.ball.body,
      direction = ball.direction,
      r = ball.r;

    var x0 = ball.x,
      y0 = ball.y;

    if (y0 + r > 500) {
      var status = $('#status');
      status.css('color', 'red');
      status.text("Bad luck, try again!");

      physicsEngine.updateBall({
        x: 250,
        y: 320,
        r: 8,
        direction: {
          x: 0,
          y: 1
        }
      });
      GameObjects.brick.bodies = generateBricks(level);
      physicsEngine.updateBricks(GameObjects.brick.bodies);
      physicsEngine.updateSpeed(0);
      physicsEngine.sync();
      showArrow = true;
    } 
    if (!GameObjects.brick.bodies.length) {
      var status = $('#status');

      if(level < 6) {
        level++;
        var levelStatus = $('#level');
        switch(level) {
          case 2: levelStatus.text("Poziom 2. Rozgrzewka."); break;
          case 3: levelStatus.text("Poziom 3. \"Normal\"."); break;
          case 4: levelStatus.text("Poziom 4. Zaczyna się robić gorąco."); break;
          case 5: levelStatus.text("Poziom 5. Twórca poległ tutaj."); break;
          case 6: levelStatus.text("Poziom 6. Koszmar."); break;
        }

        status.css('color', 'green');
        status.text("Great!");
      } else {
        status.css('color', 'green');
        status.text("Congratulations!!! You've finished the game :)");
        level = 1;
      }


      physicsEngine.updateBall({
        x: 250,
        y: 320,
        r: 8,
        direction: {
          x: 0,
          y: 1
        }
      });
      GameObjects.brick.bodies = generateBricks(level);
      physicsEngine.updateBricks(GameObjects.brick.bodies);
      physicsEngine.updateSpeed(0);
      physicsEngine.sync();
      showArrow = true;
    }
}

function render(ctx) {
  ctx.fillStyle = '#4a535d';
  ctx.fillRect(0, 0, 500, 500);

  if (showArrow) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(250, 320);
    ctx.lineTo(250, 350);
    ctx.moveTo(250, 350);
    ctx.lineTo(243, 340);
    ctx.moveTo(250, 350);
    ctx.lineTo(257, 340);
    ctx.stroke();
  }

  if (typeof GameObjects.ball !== 'undefined') {
    GameObjects.ball.render.draw(GameObjects.ball.body,ctx);
  }

  GameObjects.brick.bodies.forEach(function (brickBody) {
    GameObjects.brick.render.draw(brickBody,ctx);
  });

  GameObjects.paddle.render.draw(GameObjects.paddle.body, ctx);
}

function main(time) {
  animationToken = window.requestAnimationFrame(main);

  if (time) {
    frameCount++;

    render(ctx);

    previousFrameTime = time;
  }
}

function showFPS(timePeriod) {
  window.setInterval(function () {
    $('span#fps-counter').text('rendering at: ' + frameCount + ' FPS');
    frameCount = 0;
  }, timePeriod);
}

function canvasInit() {
  var canvas = document.getElementById('game');
  if (canvas.getContext) {
    return ctx = canvas.getContext('2d');
  }
}

function initializePaddleMovement() {
  var gameCanvas = $('#game');
  gameCanvas.click(function () {
    var status = $('#status');
    status.css('color', 'white');
    status.text("Good luck!");
    if(showArrow === true) {
      physicsEngine.updateSpeed(0.25);
    }
    showArrow = false;
  });
  gameCanvas.mousemove(function (e) {
    var mouseX = e.offsetX;
    if (mouseX <= 51) {
      paddlePos = 1;
    }
    else if (mouseX >= 449) {
      paddlePos = 399;
    }
    else {
      paddlePos = mouseX - 50;
    }
    physicsEngine.updatePaddle(paddlePos);
    $('#mouse-pos').text("mouse: x = " + e.offsetX + "; y = " + e.offsetY);
  });
}

initializePaddleMovement();
physicsEngine.setPhysicsFps(200);
physicsEngine.updateBricks(GameObjects.brick.bodies);
physicsEngine.start();
main();
showFPS(1000);