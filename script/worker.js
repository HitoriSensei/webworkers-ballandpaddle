var Vec = function (x, y) {
  this.x = x;
  this.y = y;
  this.d = Math.sqrt(x * x + y * y);
};

Vec.normalize = function (vec) {
  return new Vec(vec.x / vec.d, vec.y / vec.d);
};

Vec.substract = function (vec1, vec2) {
  return new Vec(vec2.x - vec1.x, vec2.y - vec1.y);
};

Vec.add = function (vec1, vec2) {
  return new Vec(vec1.x + vec2.x, vec1.y + vec2.y);
};

Vec.multiply = function (vec1, vec2) {
  return new Vec(vec1.x * vec2.x, vec1.y * vec2.y);
};

Vec.det = function (vec1, vec2) {
  return vec1.x * vec2.y - vec1.y * vec2.x;
};

Vec.dot = function (vec1, vec2) {
  return vec1.x * vec2.x + vec1.y * vec2.y;
};

Vec.angle = function (vec1, vec2) {
  return Math.atan2(Vec.det(vec1, vec2), Vec.dot(vec1, vec2));
};

var Ball = function (x, y, r, direction) {
  this.x = x;
  this.y = y;
  this.r = r;
  this.direction = Vec.normalize(direction);

  this.getNextPosition = function (vec) {
    return new Vec.add(new Vec(this.x, this.y), vec);
  };

  this.translate = function (vec) {
    this.x += vec.x;
    this.y += vec.y;
  };
};

var Brick = function (id, x, y, w, h, r, maxAngle) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
  this.hit = false;
  this.d = Math.sqrt(w * w + h * h)/2;
  this.center = new Vec(x + 0.5 * w, y + 0.5 * h);
  this.xangle = Math.atan2(h,w);

  this.setNewPosition = function (x, y) {
    this.x = x;
    this.y = y;
    this.center = new Vec(x + 0.5 * this.w, y + 0.5 * this.h);
  };

  this.remove = function () {
    this.w = 0;
    this.h = 0;
    this.setNewPosition(0, 0);
  };

  this.isHit = function (ball, translate) {
    if (!this.hit) {
      var xclose = Math.abs(ball.x - this.center.x)-ball.r-10 < this.w/2;
      var yclose = Math.abs(ball.y - this.center.y)-ball.r-10 < this.h/2;
      if(xclose || yclose)
        var x1 = this.x;
        var x2 = this.x+this.w;
        var y1 = this.y;
        var y2 = this.y+this.h;
        if((ball.x > x2 || ball.x < x1) && (ball.y > y2 || ball.y < y1)){
          // corner select
          var cx = 0;
          var cy = 0;
          if(ball.x > this.center.x){
            cx = x2;
          }else{
            cx = x1;
          }
          if(ball.y > this.center.y){
            cy = y2;
          }else{
            cy = y1;
          }
          var cnx = ball.x - cx;
          var cny = ball.y - cy;
          var crnDs = Math.sqrt(cnx * cnx + cny * cny);
          if(crnDs<ball.r){
            return {
              fix: new Vec(0,0),
              direction: Vec.normalize(new Vec(cnx,cny))
            }
          }else{
            return false;
          }
        }else{
          var inx = (ball.x <= x2 && ball.x >= x1);
          var iny = (ball.y <= y2 && ball.y >= y1);
          if(inx && (Math.abs(ball.y - this.center.y) <= ball.r + this.h/2)){
            fixL = (ball.r + this.h/2) - Math.abs(ball.y - this.center.y)
            return {
              fix: new Vec(
                  0,
                  (ball.y < this.center.y
                    ? -fixL
                    : fixL
                  )
                ),
              direction: new Vec(ball.direction.x, -ball.direction.y)
            }
          }else if(iny && (Math.abs(ball.x - this.center.x) <= ball.r + this.w/2)){
            fixL = (ball.r + this.w/2) - Math.abs(ball.x - this.center.x)
            return {
              fix: new Vec(
                (ball.x < this.center.x
                  ? -fixL
                  : fixL
                )
                ,0
              ),
              direction: new Vec(-ball.direction.x, ball.direction.y)
            };
          }else{
            return false;
          }
        }
    }else{
      return false;
    }
  }
};

var paddlePos = 200;
var fps = 0;
var intervalToken = null;
var speed = 0;
var sync = 0;
var physicsState = {
  ball: new Ball(250, 320, 8, new Vec(0, 1)),
  paddle: new Brick('paddle', paddlePos, 470, 100, 20, 8.0, 75),
  bricks: []
};

onmessage = function (e) {
	switch(e.data.type){
		case 'updatePaddlePosition':
			paddlePos = e.data.data;
			break;
		case 'updateSpeed':
			speed = e.data.data;
			break;
		case 'sync':
			sync = e.data.data;
			break;
		case 'updateBall':
			ballData = e.data.data;
			physicsState.ball = new Ball(ballData.x,ballData.y,ballData.r,new Vec(ballData.direction.x,ballData.direction.y));
			break;
		case 'updateBricks':
			physicsState.bricks = e.data.data.map(function(brickData,i){
				return new Brick(i, brickData.x, brickData.y, brickData.w, brickData.h, brickData.r, brickData.maxAngle);
			});
			break;
		case 'setPhysicsFps':
			fps = 1000 / e.data.data;
			break;
		case 'start':
  			console.log("Initializing worker, FPS: " + 1000/fps);
			if(intervalToken){
				clearInterval(intervalToken);
			}
			intervalToken = setInterval(computePhysics,fps);
			break;

	}
};

function parseState(pState){
	return {
		ball: {
			x: pState.ball.x,
			y: pState.ball.y,
			r: pState.ball.r
		},
		paddle: {
			x: pState.paddle.x,
			y: pState.paddle.y,
			w: pState.paddle.w,
			h: pState.paddle.h,
			r: pState.paddle.r
		},
		bricks: pState.bricks.map(function(brick){
			return {
				x: brick.x,
				y: brick.y,
				w: brick.w,
				h: brick.h,
				r: brick.r
			};
		}),
		sync: sync
	};
};

function computePhysics(){
	var ball = physicsState.ball,
	  direction = ball.direction,
	  r = ball.r;

	var translateVec = new Vec(direction.x * speed * fps, direction.y * speed * fps);

	physicsState.bricks.forEach(function (brick) {
		var hit = brick.isHit(ball, translateVec);
		if (hit) {
		  brick.hit = true;
		  ball.direction = hit.direction;
      ball.translate(hit.fix);
		  speed *= 1.05;
      translateVec = new Vec(ball.direction.x * speed * fps, ball.direction.y * speed * fps);
		  // $('#speed').text("prędkość = " + speed.toFixed(2) + " [au]");
		}
	});

	physicsState.bricks = physicsState.bricks.filter(function (brick) {
		return !brick.hit;
	});

	physicsState.paddle.setNewPosition(paddlePos, physicsState.paddle.y);

	var hit = physicsState.paddle.isHit(ball, translateVec);
	if (hit) {
    var bangle = Math.atan2(ball.y - physicsState.paddle.center.y, (ball.x - physicsState.paddle.center.x)/2);
		ball.direction = new Vec(Math.cos(bangle), Math.sin(bangle));
    ball.translate(hit.fix);
    physicsState.paddle.hit = true;
    translateVec = new Vec(ball.direction.x * speed * fps, ball.direction.y * speed * fps);
	}else{
    physicsState.paddle.hit = false;
  }

  var nextPosition = ball.getNextPosition(translateVec);
  var x0 = ball.x,
    y0 = ball.y,
    x1 = nextPosition.x,
    y1 = nextPosition.y;

  if ((x0 + r < 500 && x1 + r >= 500) || (x0 - r > 0 && x1 - r <= 0)) {
    direction.x *= -1;
  }

  if (y0 - r > 0 && y1 - r <= 0) {
    direction.y *= -1;
  }

	ball.translate(translateVec);
  postMessage(parseState(physicsState));
}