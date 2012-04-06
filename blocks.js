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
  var KEYCODE_R = 82;

  var KEYCODE_LEFT = 37;
  var KEYCODE_UP = 38;
  var KEYCODE_RIGHT = 39;
  var KEYCODE_DOWN = 40;
  var ARROW_KEYS = [37, 38, 39, 40];

  function IsArrowKey(key) {
    return 37 <= key && key <= 40;
  }

  var game_key_depressed; // FIXME: can we access this directly?
  var game_ismoving;
  var move_dr, move_dc, move_start_date;
  var MOVE_DURATION_MS = 150;

  $("").keydown(function(e){
    if (game_screen == SCREEN_GAME) {
      var key = e.keyCode;

      if (key == KEYCODE_ESC) e.preventDefault(), AbortGame();
      if (key == KEYCODE_R) e.preventDefault(), ResetGame();

      if (IsArrowKey(key)) {
        e.preventDefault();
        game_key_depressed[key] = true;

        if (!game_ismoving) {
          Move(key);
        }
      }
    }
  });

  $("").keyup(function(e){
    if (game_screen == SCREEN_GAME) {
      var key = e.keyCode;
      if (IsArrowKey(key)) {
        game_key_depressed[key] = false;
        e.preventDefault();
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

  var mark;
  var winning;
  var happy;

  var WIN_PAUSE_MS = 1000;
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
    winning = true;
    complete[level_i][level_j] = true;

    $.doTimeout(WIN_PAUSE_MS, function() {
      // Make sure we don't go to the next level if the user
      // hit R or ESC.
      if (winning && !StartGame(level_i, level_j+1)) {
        EndGame();
      }
    });
  }

  function GetRowsOrdering(dr) {
    var rows = Iota(game_height);
    if (dr == 1) rows.reverse();
    return rows;
  }

  function GetColsOrdering(dc) {
    var cols = Iota(game_width);
    if (dc == 1) cols.reverse();
    return cols;
  }

  function Move(key) {
    if (winning) return;

    var dr,dc;

    if (key == KEYCODE_LEFT)  dr =  0, dc = -1;
    if (key == KEYCODE_UP)    dr = -1, dc =  0;
    if (key == KEYCODE_RIGHT) dr =  0, dc =  1;
    if (key == KEYCODE_DOWN)  dr =  1, dc =  0;

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
    var rows = GetRowsOrdering(dr), cols = GetColsOrdering(dc);

    var stuck = [];

    $.each(rows, function(ir, r) {
      stuck[r] = [];
      $.each(cols, function(ic, c) {
        var ch = blocks[r][c];
        stuck[r][c] = ch != '.' && (ch == '#' || stuck[r+dr][c+dc]);
      });
    });

    // propagate movement
    mark = [];
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
    happy = !!q.length;
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

    // begin movement
    if (happy) {
      game_ismoving = true;
      move_dr = dr;
      move_dc = dc;
      move_start_date = new Date();
    }
  }

  function CompleteMove() {
    // complete movement
    var dr = move_dr, dc = move_dc;
    var rows = GetRowsOrdering(dr), cols = GetColsOrdering(dc);

    $.each(rows, function(ir, r) {
      $.each(cols, function(ic, c) {
        if (mark[r][c]) {
          // assert blocks[r+dr][c+dc] == '.'
          blocks[r+dr][c+dc] = blocks[r][c];
          blocks[r][c] = '.';
        }
      });
    });
    mark = [];
    game_ismoving = false;
    move_dr = move_dc = move_start_date = undefined;

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

    if (!level_names[i]) return false;
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

    winning = false;
    happy = true;

    game_key_depressed = [];
    game_ismoving = false;

    GameLoop();

    return true;
  }

  function GetMoveProgress() {
    // assert game_ismoving
    cur_date = new Date();
    return Math.min(1.0, (cur_date - move_start_date) / MOVE_DURATION_MS);
  }

  function GameLoop() {
    if (game_screen != SCREEN_GAME) return;
    window.requestAnimationFrame(GameLoop);

    if (game_ismoving && GetMoveProgress() >= 1.0) {
      CompleteMove();
    }

    $.each(ARROW_KEYS, function(i, key) {
      if (!game_ismoving && game_key_depressed[key]) {
        Move(key);
      }
    });

    Draw();
  }

  function ResetGame() {
    StartGame(level_i, level_j);
  }

  function AbortGame() {
    winning = false;
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

  $(".setsize").css('width', width);
  $(".setsize").css('height', height);

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
  var happyface_img = $("#happyface")[0];
  var sadface_img = $("#sadface")[0];

  var GOAL_RED = ctx.createPattern(redgoal_img, 'repeat');
  var GOAL_BLUE = ctx.createPattern(bluegoal_img, 'repeat');
  var GOAL_YELLOW = ctx.createPattern(yellowgoal_img, 'repeat');
  var HAPPYFACE = ctx.createPattern(happyface_img, 'repeat');
  var SADFACE = ctx.createPattern(sadface_img, 'repeat');

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

  function DrawLevelStampAt(i, j, x_offset, y_offset) {
    ctx.beginPath();
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
  }

  function DrawLevelSelection() {
    SetCentreText("");

    $.each(level_names, function(i) {
      $.each(level_names[i], function(j) {
        var x_offset = LS_OUTER_MARGIN + j * (LS_LEVEL_SIZE + LS_INNER_MARGIN);
        var y_offset = LS_OUTER_MARGIN + i * (LS_LEVEL_SIZE + LS_INNER_MARGIN);

        DrawLevelStampAt(i, j, x_offset, y_offset);
      });
    });
  }

  var RAW_SIZE = 32;
  var SIZE = scale * RAW_SIZE;

  var TILE_TYPE_GOAL = 0;
  var TILE_TYPE_BLOCK = 1;
  var TILE_TYPE_MOVING = 2;

  function GetFill(tile_type, ch) {
    ch = ch.toLowerCase();
    if (ch == '#') return WALL;

    if (tile_type == TILE_TYPE_GOAL) {
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

  function DrawTile(r, c, tile_type) {
    var tile;
    if (tile_type == TILE_TYPE_GOAL) tile = goals[r][c];
    else tile = blocks[r][c];

    if (game_ismoving) {
      if (mark[r][c] && tile_type == TILE_TYPE_BLOCK) return;
      if (!mark[r][c] && tile_type == TILE_TYPE_MOVING) return;
    }

    // Walls should be consistent between goals and blocks.
    // If they aren't, that's an error.
    // This shows up as a magenta smiley.
    if ((goals[r][c] == '#') != (blocks[r][c] == '#')) tile = 'ERROR';

    if (tile == '.') return;

    ctx.beginPath();
    ctx.rect(SIZE * c, SIZE * r, SIZE, SIZE);
    ctx.fillStyle = GetFill(tile_type, tile);
    ctx.fill();

    if (IsUpper(tile)) {
      ctx.beginPath();
      ctx.rect(SIZE * c, SIZE * r, SIZE, SIZE);
      if (happy) {
        ctx.fillStyle = HAPPYFACE;
      } else {
        ctx.fillStyle = SADFACE;
      }
      ctx.fill();
    }
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
        DrawTile(r,c,TILE_TYPE_GOAL);
        DrawTile(r,c,TILE_TYPE_BLOCK);
      }
    }

    if (game_ismoving) {
      // Adhere to pixel boundaries to get prettier results.
      var progress = GetMoveProgress();
      var numerator = Math.round(progress * scaled_size);
      progress = numerator / scaled_size;

      ctx.save();
      ctx.translate(SIZE*move_dc*progress, SIZE*move_dr*progress);
      for (var r = 0; r < game_height; ++r) {
        for (var c = 0; c < game_width; ++c) {
          DrawTile(r,c,TILE_TYPE_MOVING);
        }
      }
      ctx.restore();
    }
  }

  var LEFT_MARGIN = scale * 20;
  var RIGHT_MARGIN = scale * 20;
  var TOP_MARGIN = scale * 74;
  var BOTTOM_MARGIN = scale * 35;

  var MAX_GAME_WIDTH = width - LEFT_MARGIN - RIGHT_MARGIN;
  var MAX_GAME_HEIGHT = height - TOP_MARGIN - BOTTOM_MARGIN;

  var LEVEL_STAMP_X_OFFSET = scale * 16;
  var LEVEL_STAMP_Y_OFFSET = scale * 16;

  var LEVEL_NAME_X_OFFSET = LEVEL_STAMP_X_OFFSET + LS_LEVEL_SIZE + scale*10;
  var LEVEL_NAME_Y_OFFSET = scale*40;

  var BYLINE_X_OFFSET = width - scale*150;
  var BYLINE_Y_OFFSET = scale*40;

  var TEXT_COLOUR = '#000000';

  var scaled_size;

  function DrawGame() {
    SetCentreText("");

    // level stamp
    DrawLevelStampAt(level_i, level_j, LEVEL_STAMP_X_OFFSET, LEVEL_STAMP_Y_OFFSET);

    // level name
    $("#levelname").text(level_name);
    $("#levelname").css('left', LEVEL_NAME_X_OFFSET+'px');
    $("#levelname").css('bottom', (height-LEVEL_NAME_Y_OFFSET)+'px');

    // byline
    $("#byline").text("by "+author);
    $("#byline").css('left', BYLINE_X_OFFSET+'px');
    $("#byline").css('bottom', (height-BYLINE_Y_OFFSET)+'px');

    // playing area
    ctx.save();

    var logical_width = PlayingAreaWidth();
    var logical_height = PlayingAreaHeight();
    var hscale = MAX_GAME_WIDTH / logical_width;
    var vscale = MAX_GAME_HEIGHT / logical_height;
    var scale = Math.min(hscale, vscale);

    var actual_width = logical_width, actual_height = logical_height;
    scaled_size = SIZE;
    if (scale < 1) {
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

    $("#levelname").text('');
    $("#byline").text('');

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
