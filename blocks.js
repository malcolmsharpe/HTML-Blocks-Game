$(window).load(function(){
  // Offer to reload the page on update.
  // FIXME: In iOS, this often asks for a reload twice. Sometimes the user ends
  // up seeing the old page.
  $(window.applicationCache).bind('updateready', function(e){
    if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
      window.applicationCache.swapCache();
      if (confirm("Update detected. Load new app?")) {
        window.location.reload();
      }
    }
  });

  // util
  function IsUpper(ch) {
    return !!(/[A-Z]/.exec(ch));
  }

  function Iota(n) {
    var ret = [];
    for (var i = 0; i < n; ++i) ret[i] = i;
    return ret;
  }

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
        Move(dr, dc);
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
  var complete;

  var level_i;
  var level_j;
  var level_name;
  var author;
  var game_width;
  var game_height;
  var blocks;
  var goals;

  function CheckWin() {
    var won = true;
    for (var r = 0; r < game_height; ++r) {
      for (var c = 0; c < game_width; ++c) {
        if (goals[r][c] != '.' && goals[r][c].toLowerCase() != blocks[r][c].toLowerCase()) {
          won = false;
        }
      }
    }

    if (!won) return;
    complete[level_i][level_j] = true;
    if (StartGame(level_i, level_j+1)) return;
    EndGame();
  }

  function Move(dr, dc) {
    // find smiley
    var smiley_r, smiley_c;
    for (var r = 0; r < game_height; ++r) {
      for (var c = 0; c < game_width; ++c) {
        if (IsUpper(blocks[r][c])) {
          smiley_r = r;
          smiley_c = c;
        }
      }
    }

    // propagate stuckness
    var rows = Iota(game_height), cols = Iota(game_width);
    if (dr == 1) rows.reverse();
    if (dc == 1) cols.reverse();

    var stuck = [];

    $.each(rows, function(ir, r) {
      stuck[r] = [];
      $.each(cols, function(ic, c) {
        var ch = blocks[r][c];
        stuck[r][c] = ch != '.' && (ch == '#' || stuck[r+dr][c+dc]);
      });
    });

    // propagate movement
    var mark = [];
    $.each(rows, function(ir, r) {
      mark[r] = [];
    });

    var q = [];
    function pushq(r,c) {
      if (!mark[r][c] && !stuck[r][c] && blocks[r][c] != '.') {
        q.push([r,c]);
        mark[r][c] = true;
      }
    }

    var K = 4;
    var DR = [1, 0, -1, 0];
    var DC = [0, 1, 0, -1];

    pushq(smiley_r, smiley_c);
    while (q.length) {
      var cur = q.pop();
      var r = cur[0], c = cur[1];

      for (var k = 0; k < K; ++k) {
        var r2 = r + DR[k], c2 = c + DC[k];

        var me = blocks[r][c].toLowerCase();
        var him = blocks[r2][c2].toLowerCase();

        var sticks = false;
        if (DR[k] == dr && DC[k] == dc) sticks = true;
        if (me == 'r' && him == 'r') sticks = true;
        if (me == 'y' && him == 'y') sticks = true;
        if (me == 'y' && him == 'b') sticks = true;

        if (sticks) pushq(r2,c2);
      }
    }

    // execute movement
    $.each(rows, function(ir, r) {
      $.each(cols, function(ic, c) {
        if (mark[r][c]) {
          // assert blocks[r+dr][c+dc] == '.'
          blocks[r+dr][c+dc] = blocks[r][c];
          blocks[r][c] = '.';
        }
      });
    });

    Draw();

    CheckWin();
  }

  function ParseLevelText(text) {
    return $.map($.map($.trim(text).split('\n'), $.trim), function(s) {
      // jQuery.map flattens returned arrays, so we need to wrap in
      // a length-1 array to get desired behaviour.
      return [s.split('')];
    });
  }

  function StartGame(i,j) {
    // Try to start a game in world i level j.
    // Return true if the level exists, otherwise false.

    var name = level_names[i][j];
    if (!name) return false;

    game_screen = SCREEN_GAME;

    var level = $(levels_data).find('level[name='+name+']');
    level_i = i;
    level_j = j;
    level_name = level.attr('name');
    author = level.find('author').text();
    game_width = parseInt(level.find('width').text());
    game_height = parseInt(level.find('height').text());
    blocks = ParseLevelText(level.find('blocks').text());
    goals = ParseLevelText(level.find('goals').text());

    Draw();

    return true;
  }

  function ResetGame() {
    StartGame(level_i, level_j);
  }

  function AbortGame() {
    EndGame();
  }

  function EndGame() {
    game_screen = SCREEN_LEVEL_SELECTION;

    Draw();
  }

  // Load level data.
  $.ajax({
    url: 'levels.xml',
    dataType: 'xml',
    success: function(data) {
      levels_data = data;
      level_names = [];
      complete = [];
      $(data).find('world').each(function(i, world) {
        level_names[i] = [];
        complete[i] = [];
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

  function DrawLoading() {
    SetCentreText("Loading levels...");
  }

  var BLACK = '#000000';
  var WALL = '#c0c0c0';

  var RED = 'rgba(255, 0, 0, 0.78)';
  var YELLOW = 'rgba(255, 207, 0, 0.78)';
  var BLUE = 'rgba(51, 59, 242, 0.78)';

  var redgoal_img = $("#redgoal")[0];
  var bluegoal_img = $("#bluegoal")[0];
  var yellowgoal_img = $("#yellowgoal")[0];

  var GOAL_RED = ctx.createPattern(redgoal_img, 'repeat');
  var GOAL_BLUE = ctx.createPattern(bluegoal_img, 'repeat');
  var GOAL_YELLOW = ctx.createPattern(yellowgoal_img, 'repeat');

  var ERROR_COLOUR = '#FF00FF';

  var LS_OUTER_MARGIN = scale * 64;
  var LS_LEVEL_SIZE = scale * 32;
  var LS_INNER_MARGIN = scale * 16;
  var LS_TEXT_COLOUR = "#FFFFFF";

  var LS_CK_WIDTH = scale * 3;
  var LS_CK_LEFT_TOP_X = scale * 22.5;
  var LS_CK_LEFT_TOP_Y = scale * 23.5;
  var LS_CK_BOTTOM_X = scale * 25.5;
  var LS_CK_BOTTOM_Y = scale * 26.5;
  var LS_CK_RIGHT_TOP_X = scale * 33.5;
  var LS_CK_RIGHT_TOP_Y = scale * 13.5;
  var LS_CK_COLOUR = '#000000';

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

        if (complete[i][j]) {
          ctx.beginPath();
          ctx.moveTo(x_offset+LS_CK_LEFT_TOP_X, y_offset+LS_CK_LEFT_TOP_Y);
          ctx.lineTo(x_offset+LS_CK_BOTTOM_X, y_offset+LS_CK_BOTTOM_Y);
          ctx.lineTo(x_offset+LS_CK_RIGHT_TOP_X, y_offset+LS_CK_RIGHT_TOP_Y);
          ctx.lineWidth = LS_CK_WIDTH;
          ctx.lineCap = 'square';
          ctx.strokeStyle = LS_CK_COLOUR;
          ctx.stroke();
        }
      });
    });
  }

  var RAW_SIZE = 32;
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

  function DrawTile(r, c, goal) {
    var tile;
    if (goal) tile = goals[r][c];
    else tile = blocks[r][c];

    if (tile == '.') return;

    ctx.beginPath();
    ctx.rect(SIZE * c, SIZE * r, SIZE, SIZE);
    ctx.fillStyle = GetFill(goal, tile);
    ctx.fill();
  }

  function PlayingAreaWidth() {
    return SIZE*game_width;
  }

  function PlayingAreaHeight() {
    return SIZE*game_height;
  }

  function DrawPlayingArea() {
    // Draws full-size, starting from 0,0.
    for (var r = 0; r < game_height; ++r) {
      for (var c = 0; c < game_width; ++c) {
        DrawTile(r,c,true);
        DrawTile(r,c,false);
      }
    }
  }

  var LEFT_MARGIN = scale * 20;
  var RIGHT_MARGIN = scale * 20;
  var TOP_MARGIN = scale * 74;
  var BOTTOM_MARGIN = scale * 35;

  var MAX_GAME_WIDTH = width - LEFT_MARGIN - RIGHT_MARGIN;
  var MAX_GAME_HEIGHT = height - TOP_MARGIN - BOTTOM_MARGIN;

  function DrawGame() {
    SetCentreText("");

    ctx.save();

    var logical_width = PlayingAreaWidth();
    var logical_height = PlayingAreaHeight();
    var hscale = MAX_GAME_WIDTH / logical_width;
    var vscale = MAX_GAME_HEIGHT / logical_height;
    var scale = Math.min(hscale, vscale);

    var actual_width = logical_width, actual_height = logical_height;
    if (scale < 1) {
      var scaled_size = SIZE;
      while (scaled_size/SIZE > scale) --scaled_size;
      scale = scaled_size/SIZE;

      actual_width *= scale;
      actual_height *= scale;
    }

    x_offset = Math.floor(width/2 - actual_width/2);
    y_offset = Math.floor(height/2 - actual_height/2);
    ctx.translate(x_offset, y_offset);
    if (scale < 1) {
      ctx.scale(scale, scale);
    }

    DrawPlayingArea();
    ctx.restore();
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
