// ==UserScript==
// @name         Vira's Neggsweeper Solver
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.neopets.com/games/neggsweeper/neggsweeper.phtml*
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @require      ./common/ui.js
// @resource someCss ../resources/html/some.css
// @resource headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

var KEY_PLAY = 'playNeggSweeper';
// useful array for getting adjacent nodes, i.e. neighbours
var NEIGHBOUR_OFFSET = [[1,-1],[1,0],[1,1],[0,-1],[0,1],[-1,-1],[-1,0],[-1,1]];
var SAFE_IMAGE = "https://i.imgur.com/IvJ4RyN.gif";
var UNSAFE_IMAGE = "https://i.imgur.com/2oyFeS3.gif";
var HIDDEN = -1;
var FLAGGED = -2;
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

add_header();
addToggleButton();

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
function update_grid_images() {
    to_clear.forEach(fancy_images, {image: SAFE_IMAGE});
    to_flag.forEach(fancy_images, {image: UNSAFE_IMAGE});
}
function fast_flagging() {
    to_flag.forEach(update_board, {value: -3});
}
function update_board(f) {
    board[f[1]][f[0]] = this.value;
}


function my_solve() {
    read_page();
    // TODO: first check if we have something saved in to_clear and to_flag
    update_grid_images();
    to_clear = [];
    do {
        to_flag = [];
        parse_board();
        matrix_solve();
        update_grid_images();
        fast_flagging();
    } while (to_flag.length > 0);
    // TODO: save to_clear and to_flag
    if (to_clear.length == 0) {
        guess();
    }
     clear(to_clear[0][0], to_clear[0][1]);
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
                if (unres.length > 0) {
                    unres.forEach(function(u) {
                        // this is really ugly, but we're just making sure we only add each node once...
                        if (!nodes.some(function(a) {return (a[0] == u[0] && a[1] == u[1])})) {
                            nodes.push(u);
                        }
                    })
                    n.push(board[y][x] - mines[y][x]);
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
    // console.debug("nodes:")
    // console.debug(nodes);
    // console.debug("matrix:")
    // console.debug(matrix);
    let reduced = reducedRowEchelonForm(matrix);
    // console.debug("reduced:")
    // console.debug(reduced);
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
        if (pick_hardest()) {
            return;
        }
        my_solve();
    }
}

function pick_hardest() {
    var select = document.evaluate("//form/select[@name='game_level']", document,
    		null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

    if (select.snapshotLength > 0) {
        select = select.snapshotItem(0);
        select.selectedIndex = select.length - 1;	// Choose last item (Hard)

        if (KEY_PLAY)	// Determine if we will keep playing
        {
            var page_content = select.parentNode;

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
            if (page_content.innerHTML != "You Lose!!!") {
                page_content = parseInt(page_content.innerHTML);

                console.info("We made "+page_content+" NP today.");

                if (page_content >= NP_LIMIT) {
                    return 1;
                }
            }
            window.setTimeout(function(){select.parentNode.submit();}, 1000);
        }

        return 1;
    }
    return 0;
    
}

function clear(x,y) {
    if (board[y][x] != HIDDEN || x >= size || y >= size) {
        console.error("Trying to clear known node");
    }
    input_flag.value = '';
    // td[pos_to_td(x,y)].click();
    input_position.value = x + '-' + y;
    window.setTimeout(function(){grid.submit();}, 1500 * (1 + Math.random()));

}
function flag(x,y) {
    if (board[y][x] > HIDDEN || x >= size || y >= size) {
        console.error("Trying to flag known node");
    }
    input_flag.value = 1;
    // td[pos_to_td(x,y)].click();
    input_position.value = x + '-' + y;
    window.setTimeout(function(){grid.submit();}, 1500 * (1 + Math.random()));
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

// This will start guessing in the corners, hoping for a blowup
// If tha fails it will get the simple probabilities (looking only at neighbours)
// and pick a random one with the lowest of those
function guess() {
    var r, c;
    var nof_flagged = 0;
    var nof_unresolved = 0;
    var max_prob = 0;
    for (r = 0; r < size; r++) {
        for (c = 0; c < size; c++) {
            if (board[r][c] == -1 ) {
                nof_unresolved++;
            } else if ( board[r][c] <= -2) {
                nof_flagged++;
            }
            mines[r][c] = (board[r][c] != -1);
            hidden[r][c] = 0.0;
        }
    }
    // if we have to start guessing in early game, pick corners
    if (nof_unresolved > size*size - 4) {
        if (board[0][0] == HIDDEN) {
            to_clear = [[0,0]];
            return;
        } else if (board[0][size-1] == HIDDEN) {
            to_clear = [[size-1,0]];
            return;
        } else if (board[size-1][0] == HIDDEN) {
            to_clear = [[0,size-1]];
            return;
        } else if (board[size-1][size-1] == HIDDEN) {
            to_clear = [[size-1,size-1]];
            return;
        }
    }

    
    let default_prob = nof_unresolved / (total_nof_mines() - nof_flagged);

    let prob_map = board.map((row,y) => {
        row.map((b,x) => {
            let prob = b == HIDDEN ? 0 : Math.min((hidden[y][x] - mines[y][x]) / mines[y][x], default_prob);
            max_prob = Math.max(prob, max_prob);
        })
    })

    max_prob = Math.max(max_prob, default_prob);
    // set default probability  for all the ones we have no other info for
    // if (p_max < default_prob) {
        for (r = 0; r < size; r++) {
            for (c = 0; c < size; c++) {
                if (!mines[r][c]) {
                    hidden[r][c] = default_prob;
                }
            }
        }
    // }
    var eligble = [];
    // compile list of highest probability
    for (r = 0; r < size; r++) {
        for (c = 0; c < size; c++) {
            if (prob_map[r][c] == max_prob) {
                eligble.push([r,c]);
            }
        }
    }
    // pick a random square to click
    let i = Math.floor(Math.random()*eligble.length);
    console.info("Guessing: " + eligble[i]);
    to_clear.push(eligble[i][0], eligble[i][1]);
}

// ---------------SETUP UI --------------------


function addToggleButton() {
    var toggleButton = document.createElement('button');
    toggleButton.id = 'autoplayer';
    toggleButton.style.display = 'block';
    toggleButton.style.margin = '0 auto';
    toggleButton.addEventListener('click', toggleAutoPlay);

    var content = document.getElementsByClassName('div-stuff')[0];
    if (content) {
        content.append(toggleButton);
    }
    updateButtonText();
}

function updateButtonText() {
    var autoplayIsOn = !!JSON.parse(localStorage.getItem(KEY_PLAY));
    document.getElementById('autoplayer').innerHTML = (autoplayIsOn ? 'Stop AutoPlay' : 'Start AutoPlay');
}

function toggleAutoPlay() {
    var autoplayIsOn = !!JSON.parse(localStorage.getItem(KEY_PLAY));
    localStorage.setItem(KEY_PLAY, !autoplayIsOn);
    updateButtonText();

    if (!autoplayIsOn) {
        // setTimeout(start, 1000 * (1 + Math.random()));
        start();
    }
}
