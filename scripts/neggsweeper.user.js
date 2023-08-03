// ==UserScript==
// @name         Vira's Neggsweeper Solver
// @namespace    Violentmonkey Scripts
// @version      0.4
// @description  Plays Neggsweeper pretty well
// @author       You
// @match        https://www.neopets.com/games/neggsweeper/neggsweeper.phtml*
// @match        https://www.neopets.com/games/neggsweeper/index.phtml
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @require      ./common/ui.js
// @require      ./common/helpers.js
// @resource someCss ../resources/html/some.css
// @resource headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// Ideas for improvements:
// Toggle switches for if we want to do: Autoplay or just mark greens, if we actually flag the mine spots
// A debug toggle, plays one step and logs possbile interesting things
// a hint button for if we get stuck

var KEY_PLAY = 'playNeggSweeper';
const DIFFICULTY = 1; // 1 = EASY, 2 = MEDIUM (Unsupported), 3 = HARD
const STATS = "stats";
const TO_CLEAR = "to_clear";
const TO_FLAG = "to_flag";
var DEBUG = false;
var FAST_MODE = true; // this will only do the math once, so not all next steps will be highlighted
var NP_LIMIT = 3000; // change to large number if you want to play forever
// useful array for getting adjacent nodes, i.e. neighbours
const NEIGHBOUR_OFFSET = [[1,-1],[1,0],[1,1],[0,-1],[0,1],[-1,-1],[-1,0],[-1,1]];
const SAFE_IMAGE = "https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/green_bean.gif";
const POP_IMAGE = "https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/target_bean.gif";
const UNSAFE_IMAGE = "https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/red_bean.gif";
const HIDDEN = -1;
const SAFE = -2;
const FLAGGED = -3;
const UNSAFE = -4;
// full grid node
var grid;
// all nodes
var td;
// length of one side of the board
var size;
// the coordinates of where we click
var input_position;
// if set, when we click it will be flagged instead of revealed
var input_flag;
/// Matrix of Current state of the board
var board;
// Matrix with nof mines surrounding this node
var mines;
// Matrix with nof unrevealed nodes surrounding this node
var hidden;
// cosmetic preview
var images;

// mark as safe nodes. [[x,y]]
var to_clear = [];
// mark as unsafe nodes. [[x,y]]
var to_flag = [];

if(DEBUG) {
    clear_solved();
}

add_header();
add_buttons();
add_statsbox();

if (JSON.parse(localStorage.getItem(KEY_PLAY))) {
    // setTimeout(start, 2000 * (1 + Math.random())); // 1-2 seconds
    start();
}

function read_page() {
    grid = document.getElementsByName("grid")[0];
    // console.log(grid);
    input_position = grid.querySelector('input[name="position"]');
    input_flag = grid.querySelector('input[name="flag_negg"]');
    // let table = grid.getElementsByTagName("table");
    // console.log(table);
    // let tr = grid.getElementsByTagName("tr");
    // console.log(tr);
    td = grid.querySelectorAll('td[width="30"]');
    // console.log(td);
    let board_size = td.length;
    size = Math.sqrt(board_size);
    board = Array.from(Array(size), () => new Array(size));
    mines = Array.from(Array(size), () => new Array(size));
    hidden = Array.from(Array(size), () => new Array(size));
    images = Array.from(Array(size), () => new Array(size));

    for (var i=0; i < board_size; i++) {
        let r = Math.floor(i / size);
        let c = i % size;
        let unknown_node = td[i].querySelector('img[src$="/gn.gif"]');
        let bomb = td[i].querySelector('img[src$="/flagnegg.gif"]');
        // let numbered = td[i].getElementsByTagName("b");
        if (unknown_node) {
            board[r][c] = HIDDEN;
            images[r][c] = unknown_node;
        } else if (bomb) {
            board[r][c] = FLAGGED;
            images[r][c] = bomb;
        } else  {
            var nr = parseInt(td[i].textContent);
            if (isNaN(nr)) {
                nr = 0;
            }
            board[r][c] = parseInt(nr);
        }
    }

}

function get_neighbours(x,y) {
    return NEIGHBOUR_OFFSET.map((v) => [v[0] + x, v[1] + y]).filter(is_inside_board);
}
function is_inside_board(v) {
    return v[0] >= 0 && v[0] < size &&
           v[1] >= 0 && v[1] < size;
}
function is_numbered(n) {
    return board[n[1]][n[0]] > 0;
}
function is_hidden(n) {
    return board[n[1]][n[0]] == HIDDEN;
}
function is_mine(n) {
    return board[n[1]][n[0]] <= FLAGGED;
}
function parse_board() {
    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            let neighbours = get_neighbours(x,y);
            // console.log(neighbours);
            // let numbered = neighbours.filter(is_numbered);
            let nof_mines = neighbours.filter(is_mine).length;
            let nof_unresolved = neighbours.filter(is_hidden).length;
            mines[y][x] = nof_mines;
            hidden[y][x] = nof_unresolved;
        }
    }
}
function fancy_images(n) {
    images[n[1]][n[0]].src = this.image;
}
function update_grid_images(to_pop) {
    to_flag.forEach(fancy_images, {image: UNSAFE_IMAGE});
    to_clear.forEach(fancy_images, {image: SAFE_IMAGE});
    [to_pop].forEach(fancy_images, {image: POP_IMAGE});
}
function update_board(n) {
    board[n[1]][n[0]] = this.value;
}

function save_solved() {
    // UNSAFE
    var saved_flags = JSON.parse(localStorage.getItem(TO_FLAG));
    if (!saved_flags) {
        saved_flags = [];
    }
    saved_flags = saved_flags.concat(to_flag);
    saved_flags.forEach(fancy_images, {image: UNSAFE_IMAGE});
    localStorage.setItem(TO_FLAG, JSON.stringify(saved_flags));

    // SAFE
    localStorage.setItem(TO_CLEAR, JSON.stringify(to_clear));
}
function load_solved() {
    // UNSAFE
    var saved_flags = JSON.parse(localStorage.getItem(TO_FLAG));
    if (!saved_flags) {
        saved_flags = [];
    }
    saved_flags.forEach(update_board, {value: UNSAFE});

    // SAFE
    to_clear = JSON.parse(localStorage.getItem(TO_CLEAR));
    if (!to_clear) {
        to_clear = [];
    }
}
function clear_solved() {
    localStorage.removeItem(TO_FLAG);
    localStorage.removeItem(TO_CLEAR);
}

function my_solve() {
    to_flag = [];
    // to_clear = [];
    read_page();
    load_solved();
    to_clear = to_clear.filter(is_hidden);
    to_clear.forEach(update_board, {value: SAFE});
    // fast mode just clicks right away if we can
    if (!(FAST_MODE && to_clear.length > 0)) {
        parse_board();
        easy_solve();
        parse_board();
        matrix_solve();
    }

    if (to_clear.length == 0) {
        parse_board();
        guess();
    }

    var to_pop;
    if(!DEBUG) {
        to_pop = to_clear.pop();
        clear(to_pop[0], to_pop[1]);
    } else {
        to_pop = to_clear[to_clear.length-1];
        console.debug(to_clear);
    }
    save_solved();
    update_grid_images(to_pop);
}

// this shouldnt be needed, but reduced form jumbles lines sometimes
// and hey, maybe we save some time by making matrix smaller?
function easy_solve() {
    for (var y=0; y < size; y++) {
        for (var x=0; x < size; x++) {
            if (board[y][x] > 0) {
                let neighbours = get_neighbours(x,y);
                let unres = neighbours.filter(is_hidden);
                let nof_mines = neighbours.filter(is_mine).length;
                let hidden_mine_count = board[y][x] - nof_mines;
                if (unres.length > 0 && hidden_mine_count == 0) {
                    to_clear = to_clear.concat(unres);
                    unres.forEach(update_board, {value: SAFE});
                } else if (unres.length > 0 && unres.length == hidden_mine_count) {
                    to_flag = to_flag.concat(unres);
                    unres.forEach(update_board, {value: UNSAFE});
                }
            }
        }
    }
}

function matrix_solve() {
    // A,B,C = unrevealed nodes around a numbered node
    // N = current nodes number - reveald mines around it
    // A + B + C = N
    // _all unrevealed nodes_ = nof_mines_left // this is a bonus row
    // all_numbered filter must have a neighbour with an unrevealed (or it is useless)
    // set = unrevealed.flatten()
    // so a matrix row is
    var nodes = [];
    var abc = [];
    var n = [];
    for (var y=0; y < size; y++) {
        for (var x=0; x < size; x++) {
            if (board[y][x] > 0) {
                let neighbours = get_neighbours(x,y);
                let unres = neighbours.filter(is_hidden);
                let hidden_mine_count = board[y][x] - mines[y][x];
                // Add all neighbouring nodes
                if (unres.length > 0) {
                    unres.forEach(function(u) {
                        // this is really ugly, but we're just making sure we only add each node once...
                        if (!nodes.some(function(a) {return (a[0] == u[0] && a[1] == u[1])}) && board[u[1]][u[0]] == HIDDEN ) {
                            nodes.push(u);
                        }
                    })
                    n.push(hidden_mine_count);
                    abc.push(unres);
                }
            }
        }
    }
    // now we have enough info to create matrix:
    var matrix = [];
    for (var i=0; i < n.length; i++) {
        var row = new Array(nodes.length).fill(0);
        let ones = abc[i].map(function(u) {return arrayInArray(u, nodes)});
        for(var j = 0; j < ones.length; j++) {
            row[ones[j]] = 1;
        }
        row.push(n[i]);
        matrix.push(row);
    }
    // I dont think sorting does anything
   // sort for reduced row from function;
    //nodes.sort(function(a,b) {
    //  if (a[1] < b[1] || (a[1] == b[1] && a[0] < b[0] ) ) {
    //   return -1;
    //  } else if (a[1] > b [1] || (a[1] ==  b[1] && a[0] > b[0])) {
    //    return 1;
    //  }
    //  return 0;
    //});

    // if we are solving a matrix with all nodes on the board, we can use mine count to solve matrix
    let nof_hidden = total_nof_hidden();
    if (nof_hidden == nodes.length) {
        let nof_flagged = total_nof_flagged();
        let bonus_row = new Array(nodes.length).fill(1);
        // console.debug(nof_flagged);
        bonus_row.push(total_nof_mines() - nof_flagged);
        matrix.push(bonus_row);
    }
    // I dont think sorting does anything
  //    matrix.sort(function(a,b) {
  //    let ai = a.indexOf(1);
  //    let bi = b.indexOf(1);
  //    if (ai > bi) {
  //      return 1;
  //    } else if (ai < bi) {
  //      return -1;
  //    }
  //    return 0;
  //});
    let reduced = reducedRowEchelonForm(matrix);
    if(DEBUG) {
        console.debug("nodes:")
        console.debug(nodes);
        console.debug("matrix:")
        console.debug(matrix);
        console.debug("reduced:")
        console.debug(reduced);
    }
    for(var i=0; i < matrix.length; i++) {
        var pos_indexes = [];
        var neg_indexes = [];
        let n_index = nodes.length;
        for(var j=0; j < nodes.length; j++) {
            if(reduced[i][j] == 1) {
                pos_indexes.push(j);
            }
            if(reduced[i][j] == -1) {
                neg_indexes.push(j);
            }
        }
        // Rules we have to cover here
        // X + Y = 0  => all nodes are clear
        // X + Y + Z = 3 => all nodes are mines
        // -X - Y = -2 => all nodes are mines
        // X - Y = -1 => X is clear and Y is mine
        // X - Y - Z = 1 => X is mine, Y and Z are clear (sum of positives)

        // If none of that is true we can get probability
        // X + Y     = 1 => 1 / 2 = 50%
        // X + Y + Z = 1 => 1 / 3 = 33.33%
        // X - Y - Z = 0 =>  0 0 0 / 1 1 0 / 1 0 1 => X = 66% Y/Z = 33% forumla becomes => sum_opposite / (sum_sign + sum_opposite)
        // X + Y - Z = 1 =>  1 0 0 / 0 1 0 / 1 1 1 => X/Y = 50% Z = 33% sum_opposite / (sum_sign + sum_opposite ) 2 / 4
        // X + Y + Z - W = 1 => 110 1/101 1/100 0/010 0/001 0 => X/Y/Z = 2/5 W = 2/5    3 - 1 = 1
        // X + Y + Z - W = 2 => 1100/1010/0110/1111 => X/Y/Z = 3/5 W = 1/5    3 - 1 = 2
        // A + B + C + D - X = 2 =>

        // 3 positive 2 negative = 1 => 1 pos 0 neg /

        var pos_clear = false;
        var neg_clear = false;
        var pos_flag = false;
        var neg_flag = false;
        if (-neg_indexes.length == reduced[i][n_index]) {
            pos_clear = true;
            neg_flag = true;
        } else if (pos_indexes.length == reduced[i][n_index]) {
            pos_flag = true;
            neg_clear = true;
        }
        if (pos_clear) {
            var safe_nodes = pos_indexes.map(function(u) { return nodes[u]});
            // console.debug("from row: " + i + " Found pos nodes to clear: " + safe_nodes);
            to_clear = to_clear.concat(safe_nodes);
        }
        if (neg_clear) {
            var safe_nodes = neg_indexes.map(function(u) { return nodes[u]});
            // console.debug("from row: " + i + " Found neg nodes to clear: " + safe_nodes);
            to_clear = to_clear.concat(safe_nodes);
        }
        if (pos_flag) {
            var flag_nodes = pos_indexes.map(function(u) { return nodes[u]});
            // console.debug("from row: " + i + " Found pos nodes to flag: " + flag_nodes);
            to_flag = to_flag.concat(flag_nodes);
        }
        if (neg_flag) {
            var flag_nodes = neg_indexes.map(function(u) { return nodes[u]});
            // console.debug("from row: " + i + " Found neg nodes to clear: " + flag_nodes);
            to_flag = to_flag.concat(flag_nodes);
        }
    }
}

function arrayInArray(needle, haystack) {
    for (var i=0; i < haystack.length; i++) {
        if (needle[0] == haystack[i][0] && needle[1] == haystack[i][1] ) {
            return i;
        }
    }
    return -1;
}

function reducedRowEchelonForm(matrix) {
  var knownPivotColumns = []; // this is our one piece of iffy state-keeping :(

  // Copy the input matrix (reusing the variable name) so we have a local copy to work on
  matrix = matrix.map(function (row) { return row.slice() });

  // Now, go through the matrix and do the reduction.
  // We're using forEach here, because we want to update the matrix
  // in-place, whereas `map()` will work on a separate instance
  matrix.forEach(function (row, _rowIndex) {

    // Find the row's pivot
    // This is wrapped in an IIFE just for structure
    var pivot = (function () {
      // using a regular for-loop, since we may want to break out of it early
      for(var i = 0, l = row.length ; i < l ; i++ ) {
        if(!row[i] || knownPivotColumns[i]) { continue } // skip column if it's zero or its index is taken
        knownPivotColumns[i] = true;                     // "reserve" the column
        return { index: i, value: row[i] };              // return the pivot data
      }
      return null; // no pivot found
    }());

    // if there's no pivot, there's nothing else to do for this row
    if(!pivot) { return }

    // scale the row, if necessary
    if(pivot.value !== 1) {
      // using forEach as a "map in place" here
      row.forEach(function (_, i) { row[i] /= pivot.value });
    }

    // now reduce the other rows (calling them "siblings" here)
    matrix.forEach(function (sibling) {
      var siblingPivotValue = sibling[pivot.index];

      if(sibling === row || siblingPivotValue === 0) { return } // skip if possible

      // subtract the sibling-pivot-scaled row from the sibling
      // (another "forEach as map-in-place")
      sibling.forEach(function (_, i) { sibling[i] -= row[i] * siblingPivotValue });
    });
  });

  return matrix;
}

function start() {
    if(document.URL.indexOf("games/neggsweeper/neggsweeper.phtml") != -1) {
        if (new_game()) {
            return;
        }
        my_solve();
    }
}

function new_game() {
    var select = document.evaluate("//form/select[@name='game_level']", document,
    		null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

    if (select.snapshotLength > 0) {
        clear_solved();
        select = select.snapshotItem(0);
        select.selectedIndex = DIFFICULTY;	// Difficulty

        if (KEY_PLAY)	// Determine if we will keep playing
        {
            var page_content = select.parentNode;
            var np_today = 0;

            while (page_content) {
                if (page_content.nodeName == "B") {
                    break;
                }
                page_content = page_content.previousSibling;

                if (!page_content) {
                    console.info("Could not find NP designator.");
                    return;
                }
            }
            var stats = GM_getValue(STATS, {easy: {wins: 0, losses: 0}, medium: {wins: 0, losses: 0, played: 0, winrate: 0}, hard: {wins: 0, losses: 0, played: 0, winrate: 0}, current_difficulty: select.selectedIndex, daily_best: 0, daily_total: 0});
            if (page_content.innerHTML != "You Lose!!!") {
                switch(stats.current_difficulty) {
                    case 1:
                        stats.easy.wins++;
                        break;
                    case 2:
                        stats.medium.wins++;
                        break;
                    case 3:
                        stats.hard.wins++;
                        break;
                }
                np_today = parseInt(page_content.innerHTML);
                stats.daily_total = np_today;

                //console.info("We made "+np_today+" NP today.");

            } else {
                switch(stats.current_difficulty) {
                    case 1:
                        stats.easy.losses++;
                        break;
                    case 2:
                        stats.medium.losses++;
                        break;
                    case 3:
                        stats.hard.losses++;
                        break;
                }
            }
            update_stats();
            update_statsbox_text();
            stats.current_difficulty = select.selectedIndex;
            GM_setValue(STATS, stats);
            if(!DEBUG && np_today < NP_LIMIT) {
                delay(function(){select.parentNode.submit();}, [1.1,1.3]);
            }
        }

        return 1;
    }
    return 0;

}

function clear(x,y) {
    input_flag.value = '';
    // td[pos_to_td(x,y)].click();
    input_position.value = x + '-' + y;
    delay(function(){grid.submit();}, [0.314,0.712]);

}
function flag(x,y) {
    if (board[y][x] > HIDDEN || x >= size || y >= size) {
        console.error("Trying to flag known node");
    }
    input_flag.value = 1;
    // td[pos_to_td(x,y)].click();
    input_position.value = x + '-' + y;
    delay(function(){grid.submit();}, [0.314,0.712]);
}
function pos_to_td(x,y) {
    return y * size + x;
}

function total_nof_mines() {
    switch (size) {
        case 9: return 10;
        case 14: return 40;
        default: 40;
    }
}
function total_nof_hidden() {
    return board.reduce(function(acc, r) { return acc + r.reduce(function(acc, v){return acc + (v === HIDDEN) },0)},0);
}
function total_nof_flagged() {
    return board.reduce(function(acc, r) { return acc + r.reduce(function(acc, v){return acc + (v <= FLAGGED) },0)},0);
}

// This will start guessing in the corners, hoping for a blowup
// If tha fails it will get the simple probabilities (looking only at neighbours)
// and pick a random one with the lowest of those
function guess() {
    let nof_hidden = total_nof_hidden();
    // if we have to start guessing in early game, pick corners


    // chance of clicking mine by randomly picking
    let random_pick = (nof_hidden - (total_nof_mines() - total_nof_flagged())) / nof_hidden;
    var best_prob = random_pick;
    var eligble = [];
    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            // if on numbered we can do simple probability for neighbours
            // if on hidden and no numbered neighbours it is as good as random
            if (board[y][x] > 0 && hidden[y][x] > 0) {
                let mines_left = board[y][x] - mines[y][x];
                let prob = (hidden[y][x] - mines_left) / hidden[y][x];
                for (var i = -1; i <= 1; i++) {
                    let yi = y+i;
                    if (yi < 0 || yi > size -1) {
                        continue
                    }

                    for (var j = -1; j <= 1; j++) {
                        let xj = x+j;
                        if (xj < 0 || xj > size -1 ) {
                            continue
                        }
                        if (board[yi][xj] != HIDDEN) {
                            continue
                        }

                        // probability is measured in "chance of clicking a safe node"
                        // So higher is better
                        if (prob > best_prob) {
                            best_prob = prob;
                            eligble = [[xj,yi]]; // why do i store it like this..
                        } else if (best_prob == prob) {
                            if (!eligble.some(function(a) {return (a[0] == xj && a[1] == yi)})) {
                                eligble.push([xj,yi]); // why do i store it like this..
                            }
                        }
                    }
                }
            } else if (board[y][x] == HIDDEN && best_prob == random_pick) {
                let n = get_neighbours(x,y);
                if (n.filter(is_numbered).length == 0) {
                    eligble.push([x,y]);
                }
            }
        }
    }

    let corners = eligble.filter(function(value) {return (value[0] == 0 && (value[1] == 0 || value[1] == size-1 )) 
            || (value[0] == size-1 && (value[1] == 0 || value[1] == size-1 )) 
            || (value[1] == 0 && (value[0] == 0 || value[0] == size-1 )) 
            || (value[1] == size-1 && (value[0] == 0 || value[0] == size-1 )) 
        });
    if (corners.length > 0) {
        eligble = corners;        
    } else {
        // http://mrgris.com/projects/minesweepr/ guessing along the edghes should improve winrate by 4%
        let edges = eligble.filter(function(value) {return (value[0] == 0 || value[0] == size-1 || value[1] == 0 || value[1] == size-1)});
        if (edges.length > 0) {
            eligble = edges;        
        }
        // another good heurisitc would be to pick a low probability hidden close to a numbered node
    }
    // pick a random square to click
    let pick = Math.floor(Math.random()*(eligble.length - 1));
    console.info("Guessing: " + eligble[pick]);
    to_clear.push(eligble[pick]);
}

// ---------------SETUP UI --------------------


function add_buttons() {
    var toggleButton = document.createElement('button');
    toggleButton.id = 'autoplayer';
    toggleButton.style.display = 'block';
    toggleButton.style.margin = '0 auto';
    toggleButton.addEventListener('click', toggle_auto);

    var content = document.getElementsByClassName('div-stuff')[0];
    if (content) {
        content.append(toggleButton);
    }
    update_play_button();
}

function add_statsbox() {
    var stats_box = document.createElement('div');
    stats_box.id = 'statsbox';
    stats_box.style.display = 'block';
    stats_box.style.margin = '5 auto';
    stats_box.style.textAlign = 'center';
    var content = document.getElementsByClassName('div-stuff')[0];
    content.prepend(stats_box);
    update_statsbox_text();
}

function update_stats() {
    var stats = GM_getValue(STATS, null);
    if (!stats) {
        document.getElementById('statsbox').innerHTML = "No stats available yet";
    } else {
        stats.easy.played = stats.easy.wins + stats.easy.losses;
        stats.easy.winrate = (stats.easy.wins / stats.easy.played).toFixed(4);
        stats.medium.played = stats.medium.wins + stats.medium.losses;
        stats.medium.winrate = (stats.medium.wins / stats.medium.played).toFixed(4);
        stats.hard.played = stats.hard.wins + stats.hard.losses;
        stats.hard.winrate = (stats.hard.wins / stats.hard.played).toFixed(4);
    }
    GM_setValue(STATS, stats);
}

function update_statsbox_text() {
    var stats = GM_getValue(STATS, null);
    if (!stats) {
        document.getElementById('statsbox').innerHTML = "No stats available yet";
    } else {
        let html_start = "<table><tr><th>Difficulty</th><th>Winrate</th><th>Games</th></tr>";
        let html_end = "</table>";
        var html_middle = "";
        if (stats.easy.played > 0) {
            html_middle += "<tr><td>Easy:</td><td>" + stats.easy.winrate + "</td><td>" + stats.easy.played + "</td></tr>";
        }
        if (stats.medium.played > 0) {
            html_middle += "<tr><td>Medium:</td><td>" + stats.medium.winrate + "</td><td>" + stats.medium.played + "</td></tr>";
        }
        if (stats.hard.played > 0) {
            html_middle += "<tr><td>Hard:</td><td>" + stats.hard.winrate + "</td><td>" + stats.hard.played + "</td></tr>";
        }
        html_end+= "<br><br> Daily Total: " + stats.daily_total;

        document.getElementById('statsbox').innerHTML = html_start + html_middle + html_end;
    }
}

function update_play_button() {
    var autoplayIsOn = !!JSON.parse(localStorage.getItem(KEY_PLAY));
    document.getElementById('autoplayer').innerHTML = (autoplayIsOn ? 'Stop' : 'Start');
}

function toggle_auto() {
    var autoplayIsOn = !!JSON.parse(localStorage.getItem(KEY_PLAY));
    localStorage.setItem(KEY_PLAY, !autoplayIsOn);
    update_play_button();

    if (!autoplayIsOn) {
        // setTimeout(start, 1000 * (1 + Math.random()));
        start();
    }
}

