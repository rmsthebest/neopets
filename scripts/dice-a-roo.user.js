// ==UserScript==
// @name         Vira's Dice-A-Roo Player
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  Rolls the dice
// @author       rmsthebest
// @match        https://www.neopets.com/games/play_dicearoo.phtml
// @match        https://www.neopets.com/games/dicearoo.phtml
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @require      ./common/ui.js
// @require      ./common/helpers.js
// @resource     someCss ../resources/html/some.css
// @resource     headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// TODO: Add flavour text to complain about having to count potatoes
// Also click play again until he says "Arr, you can only guess me potatoes three times a day!"

var KEY_PLAY = "DiceARooAuto"
var STATS = "DiceARooStats";
var INTERVAL = [1,5]; // wait between 1 and 5 seconds to roll again
// levels
var RED      = 0;
var BLUE     = 1;
var GREEN    = 2;
var YELLOW   = 3;
var SILVER   = 4;

const new_level = (str) => {
    const re = /(Red|Green|Blue|Yellow|Silver) Dice-A-Roo/g
    let res = re.exec(str);
    return res ? res[1] : "";
}

add_header();
add_statsbox();
addToggleButton();

if (JSON.parse(localStorage.getItem(KEY_PLAY))) {
    start();
}

function start() {
    if(document.URL.indexOf("games/dicearoo.phtml") != -1) {
        new_game_update_stats();
        delay(function(){ $("[value='Lets Play! (Costs 5 NP)']").click();}, INTERVAL);
    } else if(document.URL.indexOf("games/play_dicearoo.phtml") != -1) {
        play();
    }
}

function new_game_update_stats() {
    var stats = GM_getValue(STATS);
    if (!stats) {
        let current = { level: RED, rolls: 0 };
        let average = { level: RED, rolls: 0 };
        // let history = { level: [[],[],[],[],[]], rolls: [[],[],[],[],[]]}; // track how many rolls on each level?
        let history = { level: [], rolls: []};
        stats = { games: 0, current: current, average: average, history: history};

    } else {
        stats.games++;
    }
    
    update_statsbox_text();
    GM_setValue(STATS, stats);
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

function update_statsbox_text() {
    let stats = GM_getValue(STATS);
    if (!stats) {
        document.getElementById('statsbox').innerHTML = "No stats available yet";
    } else {
        document.getElementById('statsbox').innerHTML = "Rolls this round: " + stats.current.rolls +
            "<br>Average roll count: " + " rolls: " + Math.round(stats.average.rolls) +
            // "<br>Current Jackkpot: " + " rolls: " + Math.round(stats.average.rolls) +
            // "<br>Winnings: + sum(stats.history.jackpots) +
            "<br>Games Played: " + stats.games;
    }
}

function game_end(stats) {
        stats.history.level.push(stats.current.level);
        stats.history.rolls.push(stats.current.rolls);
        // if this becomes slow we should do incremental averages: 
        // https://math.stackexchange.com/questions/106700/incremental-averaging
        stats.average.level = sum(stats.history.level) / stats.history.level.length;
        stats.average.rolls = sum(stats.history.rolls) / stats.history.rolls.length;
        stats.current.level = RED;
        stats.current.rolls = 0;
        GM_setValue(STATS, stats);
}

function play() {
    var stats = GM_getValue(STATS);
    update_statsbox_text(stats);
    // Win!
    let content = document.getElementsByClassName("content")[0].outerHTML.toString();
    if (content.includes("JACKPOT")) {
        // let price = regex
        // stats.history.jackpots.push(prize);
        game_end(stats);
        alert("JACKPOT!!");
        return;
    }

    // Game Over
    let press_me = document.querySelector("input[value='Press Me']");
    if (press_me) {
        game_end(stats);
        delay(function() {press_me.click();}, INTERVAL);
    }

    // Normal Play
    switch(new_level(content)) {
        case "Red": {
            stats.current.level = RED;
            break;
        }
        case "Green": {
            stats.current.level = GREEN;
            break;
        }
        case "Blue": {
            stats.current.level = BLUE;
            break;
        }
        case "Yellow": {
            stats.current.level = YELLOW;
            break;
        }
        case "Silver": {
            stats.current.level = SILVER;
            break;
        }
        default: {
            // no change
        }
    }
    // if error return to start
    if (content.includes("errorOuter")){
		    location.href = "https://www.neopets.com/games/dicearoo.phtml";
    }
    let first_roll = document.querySelector("input[value='Play Dice-A-Roo']");
    if (first_roll) {
        stats.current.rolls++;
        delay(function() {first_roll.click();}, INTERVAL);
    }
    let roll_again = document.querySelector("input[value='Roll Again']");
    if (roll_again) {
        stats.current.rolls++;
        delay(function() {roll_again.click();}, INTERVAL);
    }
    GM_setValue(STATS, stats);
}


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
        start();
    }
}