$(window).load(function(){
  // Offer to reload the page on update.
  // FIXME: This often asks for a reload twice. Sometimes the user ends
  // up seeing the old page.
  $(window.applicationCache).bind('updateready', function(e){
    if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
      window.applicationCache.swapCache();
      if (confirm("Set has been updated. Load new app?")) {
        window.location.reload();
      }
    }
  });

  $("#draw").bind("touchstart", function(e){
    e.preventDefault();

    if (game_start == undefined) {
      StartGame();
    } else {
      e = e.originalEvent;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        HandleGameClick(e.changedTouches[i]);
      }
    }
  });

  $("#draw").click(function(e){
    e.preventDefault();

    if (game_start == undefined) {
      StartGame();
    } else {
      HandleGameClick(e);
    }
  });

  function HandleGameClick(e) {
    var x = e.clientX - canvas.offsetLeft;
    var y = e.clientY - canvas.offsetTop;

    // Convert from client-scale coordinates to canvas coordinates.
    x *= retina;
    y *= retina;

    // FIXME
    EndGame();
  }

  var KEYCODE_LEFT = 37;
  var KEYCODE_UP = 38;
  var KEYCODE_RIGHT = 39;
  var KEYCODE_DOWN = 40;

  $("").keydown(function(e){
    if (game_start == undefined) {
      StartGame();
      e.preventDefault();
    } else {
      var dr, dc, key = e.keyCode;
      if (key == KEYCODE_LEFT)  dr =  0, dc = -1;
      if (key == KEYCODE_UP)    dr = -1, dc =  0;
      if (key == KEYCODE_RIGHT) dr =  0, dc =  1;
      if (key == KEYCODE_DOWN)  dr =  1, dc =  0;

      if (dr || dc) {
        e.preventDefault();
        // TODO
      }
    }
  });

  // game
  var game_start;
  var game_duration;

  function StartGame() {
    game_start = new Date();
    game_duration = undefined;

    Draw();
  }

  function EndGame() {
    game_duration = new Date() - game_start;
    game_start = undefined;

    Draw();
  }

  // graphics
  var scale, retina, width, height, ncols, nrows, style_width, style_height;

  // make it work on iphones and ipads
  retina = 1;
  userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('blackberry 9800') != -1) {
    // BlackBerry Torch
    scale = 1;

    width = scale*360;

    // Hiding the URL bar is not possible, so we cannot take advantage
    // of the full 480px screen height.
    height = scale*403;
  } else if (userAgent.indexOf('ipad') != -1) {
    // iPad
    retina = 2;
    scale = 2*retina;

    width = scale*512;
    height = scale*384;
  } else if (userAgent.indexOf('iphone') != -1) {
    // iPhone
    retina = 2;
    scale = 1*retina;

    width = scale*320;
    height = scale*480;
  } else {
    // All others (e.g. laptop)
    scale = 1;

    width = scale*420;
    height = scale*364;
  }

  // By making the coordinate space of the CSS twice as large as its
  // displayed size on the page, we look nice with retina display.
  style_width = width / retina;
  style_height = height / retina;

  var canvas = $("canvas")[0];
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = style_width;
  canvas.style.height = style_height;

  var centretable = $("#centretable");
  centretable.height(style_height);
  centretable.width(style_width);

  var ctx = canvas.getContext("2d");

  function SetCentreText(text) {
    $("#centretext")[0].innerHTML = text;
  }

  function DrawScore() {
    var deciseconds = Math.round(game_duration / 100);
    var seconds = Math.floor(deciseconds / 10);
    deciseconds -= 10 * seconds;
    var minutes = Math.floor(seconds / 60);
    seconds -= 60 * minutes;

    SetCentreText(sprintf("You win in %d:%02d.%d. Click to restart.", minutes, seconds, deciseconds));
  }

  function DrawIntro() {
    SetCentreText("Click to begin.");
  }

  var level_name = 'Meet the smiley';
  var author = 'David Rhee';
  var game_width = 11;
  var game_height = 6;
  var blocks = [
    '###########',
    '#....#....#',
    '#.R..#....#',
    '#....#....#',
    '#.........#',
    '###########'
  ];
  var goals = [
    '###########',
    '#....#....#',
    '#....#..r.#',
    '#....#....#',
    '#.........#',
    '###########'
  ];

  var BLACK = '#000000';
  var WALL = '#c0c0c0';
  var RED = '#ff3737';
  var YELLOW = '#ffda37';
  var BLUE = '#5f66f5';
  var GOAL_RED = '#c00000';
  var GOAL_BLUE = '#000080';
  var GOAL_YELLOW = '#ffc90e';
  var ERROR_COLOUR = '#FF00FF';

  var RAW_SIZE = 4;
  var SIZE = scale * RAW_SIZE;

  function GetFill(goal, ch) {
    ch = ch.toLowerCase();
    if (ch == '#') return WALL;

    if (goal) {
      if (ch == 'r') return GOAL_RED;
      if (ch == 'y') return GOAL_YELLOW;
      if (ch == 'b') return GOAL_BLUE;
    } else {
      if (ch == 'r') return RED;
      if (ch == 'y') return YELLOW;
      if (ch == 'b') return BLUE;
    }

    return ERROR_COLOUR;
  }

  function DrawTile(r, c, goal, tile) {
    if (tile == '.') return false;

    ctx.beginPath();
    ctx.rect(SIZE * c, SIZE * r, SIZE, SIZE);
    ctx.fillStyle = GetFill(goal, tile);
    ctx.fill();
    return true;
  }

  function DrawGame() {
    SetCentreText("");

    for (var r = 0; r < game_height; ++r) {
      for (var c = 0; c < game_width; ++c) {
        DrawTile(r,c,false,blocks[r][c]) || DrawTile(r,c,true,goals[r][c]);
      }
    }
  }

  function Draw() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    if (game_duration != undefined) {
      DrawScore();
    } else if (game_start == undefined) {
      DrawIntro();
    } else {
      DrawGame();
    }
  }

  Draw();
});
