$(window).load(function(){
  // Offer to reload the page on update.
  // FIXME: This often asks for a reload twice. Sometimes the user ends
  // up seeing the old page.
  $(window.applicationCache).bind('updateready', function(e){
    if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
      window.applicationCache.swapCache();
      if (confirm("Update detected. Load new app?")) {
        window.location.reload();
      }
    }
  });

  // input
  $("#draw").bind("touchstart", function(e){
    e.preventDefault();

    e = e.originalEvent;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      HandleClick(e.changedTouches[i]);
    }
  });

  $("#draw").click(function(e){
    e.preventDefault();

    HandleClick(e);
  });

  function HandleClick(e) {
    var x = e.clientX - canvas.offsetLeft;
    var y = e.clientY - canvas.offsetTop;

    // Convert from client-scale coordinates to canvas coordinates.
    x *= retina;
    y *= retina;

    if (game_screen == SCREEN_LEVEL_SELECTION) {
      HandleLevelSelectionClick(x,y);
    } else if (game_screen == SCREEN_GAME) {
      HandleGameClick(x,y);
    }
  }

  function HandleLevelSelectionClick(x,y) {
    x -= LS_OUTER_MARGIN;
    y -= LS_OUTER_MARGIN;
    if (x<0 || y<0) return;

    var incr = LS_LEVEL_SIZE + LS_INNER_MARGIN;
    var j = Math.floor(x / incr);
    var i = Math.floor(y / incr);

    x -= j * incr;
    y -= i * incr;
    if (x >= LS_LEVEL_SIZE || y >= LS_LEVEL_SIZE) return;

    StartGame(i,j);
  }

  function HandleGameClick(x,y) {
    // TODO
  }

  var KEYCODE_ESC = 27;
  var KEYCODE_LEFT = 37;
  var KEYCODE_UP = 38;
  var KEYCODE_RIGHT = 39;
  var KEYCODE_DOWN = 40;
  var KEYCODE_R = 82;

  $("").keydown(function(e){
    if (game_screen == SCREEN_GAME) {
      var dr, dc, key = e.keyCode;

      if (key == KEYCODE_ESC) AbortGame(), e.preventDefault();
      if (key == KEYCODE_R) ResetGame(), e.preventDefault();

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
  var SCREEN_LOADING = 0;
  var SCREEN_LEVEL_SELECTION = 1;
  var SCREEN_GAME = 2;
  var game_screen = SCREEN_LOADING;

  var levels_data;
  var level_names;

  var game_start;
  var game_duration;

  var level_i;
  var level_j;
  var level_name;
  var author;
  var game_width;
  var game_height;
  var blocks;
  var goals;

  function CleanLevelText(text) {
    return $.map($.trim(text).split('\n'), $.trim);
  }

  function StartGame(i,j) {
    var name = level_names[i][j];
    if (!name) return;

    game_screen = SCREEN_GAME;
    game_start = new Date();
    game_duration = undefined;

    var level = $(levels_data).find('level[name='+name+']');
    level_i = i;
    level_j = j;
    level_name = level.attr('name');
    author = level.find('author').text();
    game_width = parseInt(level.find('width').text());
    game_height = parseInt(level.find('height').text());
    blocks = CleanLevelText(level.find('blocks').text());
    goals = CleanLevelText(level.find('goals').text());

    Draw();
  }

  function ResetGame() {
    StartGame(level_i, level_j);
  }

  function AbortGame() {
    EndGame();
  }

  function EndGame() {
    game_screen = SCREEN_LEVEL_SELECTION;
    game_duration = new Date() - game_start;
    game_start = undefined;

    Draw();
  }

  // Load level data.
  $.ajax({
    url: 'levels.xml',
    dataType: 'xml',
    success: function(data) {
      levels_data = data;
      level_names = [];
      $(data).find('world').each(function(i, world) {
        level_names[i] = [];
        $(world).find('level').each(function(j, level) {
          level_names[i][j] = $(level).attr('name');
        });
      });

      game_screen = SCREEN_LEVEL_SELECTION;
      Draw();
    }
  });

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

    width = scale*840;
    height = scale*525;
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
    // FIXME: This is currently unused.
    var deciseconds = Math.round(game_duration / 100);
    var seconds = Math.floor(deciseconds / 10);
    deciseconds -= 10 * seconds;
    var minutes = Math.floor(seconds / 60);
    seconds -= 60 * minutes;

    SetCentreText(sprintf("You win in %d:%02d.%d. Click to restart.", minutes, seconds, deciseconds));
  }

  function DrawLoading() {
    SetCentreText("Loading levels...");
  }

  var BLACK = '#000000';
  var WALL = '#c0c0c0';
  var RED = '#ff3737';
  var YELLOW = '#ffda37';
  var BLUE = '#5f66f5';
  var GOAL_RED = '#c00000';
  var GOAL_BLUE = '#000080';
  var GOAL_YELLOW = '#ffc90e';
  var ERROR_COLOUR = '#FF00FF';

  var LS_OUTER_MARGIN = scale * 64;
  var LS_LEVEL_SIZE = scale * 32;
  var LS_INNER_MARGIN = scale * 16;
  var LS_TEXT_COLOUR = "#FFFFFF";

  function GetWorldColour(i) {
    var colour_name = $(levels_data).find('world').slice(i).attr('color');
    if (colour_name == 'red') return RED;
    if (colour_name == 'yellow') return YELLOW;
    if (colour_name == 'blue') return BLUE;
    return ERROR_COLOUR;
  }

  function DrawLevelSelection() {
    SetCentreText("");

    $.each(level_names, function(i) {
      $.each(level_names[i], function(j) {
        ctx.beginPath();
        var x_offset = LS_OUTER_MARGIN + j * (LS_LEVEL_SIZE + LS_INNER_MARGIN);
        var y_offset = LS_OUTER_MARGIN + i * (LS_LEVEL_SIZE + LS_INNER_MARGIN);
        ctx.rect(x_offset, y_offset, LS_LEVEL_SIZE, LS_LEVEL_SIZE);
        ctx.fillStyle = GetWorldColour(i);
        ctx.fill();

        ctx.font = 'bold 12px "courier new", monospace';
        ctx.textBaseline = 'top';
        ctx.fillStyle = LS_TEXT_COLOUR;
        var level_text = sprintf("%d-%d", i+1, j+1);
        ctx.fillText(level_text, x_offset, y_offset);
      });
    });
  }

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

    if (game_screen == SCREEN_LOADING) {
      DrawLoading();
    } else if (game_screen == SCREEN_LEVEL_SELECTION) {
      DrawLevelSelection();
    } else if (game_screen == SCREEN_GAME) {
      DrawGame();
    }
  }

  Draw();
});
