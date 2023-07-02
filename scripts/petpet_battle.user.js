// ==UserScript==
// @name         Vira's PetPet Battler
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  Plays petpet battle by randomly pressing the buttons
// @author       rmsthebest
// @match        https://www.neopets.com/games/petpet_battle/ppb1.phtml*
// @match        https://www.neopets.com/quickref.phtml
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @inject-into auto
// @require      ./common/ui.js
// @resource someCss ../resources/html/some.css
// @resource headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

var KEY_PLAY = 'playPetPetBattle';
var PETPET_STATS= 'PETPET_STATS';
var STRONG = "NAME OF PET WITH STRONG PETPET"; // DONT FORET TO UPDATE THESE. TODO: make textfield inputs
var WEAK = "NAME OF PET WITH WEAK PETPET";
var ACTIVE = "ACTIVE_PET";

add_header();
addToggleButton();
add_statsbox();

if (JSON.parse(localStorage.getItem(KEY_PLAY))) {
    setTimeout(play, 2000 * (1 + Math.random())); // 1-2 seconds
}

function play() {
    if(document.URL.indexOf("quickref.phtml") != -1) {
        location.replace("https://www.neopets.com/games/petpet_battle/ppb1.phtml");
    } else if(document.URL.indexOf("games/petpet_battle/ppb1.phtml") != -1) {
        let new_game = document.getElementsByName("New_Game");
        if (new_game.length != 0) {
            let content = document.getElementsByClassName("content")[0].innerHTML.toString();
            var ratio_pattern = /Your won\/lost ratio today is \d+\/\d+/g;
            var score_pattern = /Your present score is \d+/g;
            var nr_pattern = /\d+/g;
            let ratio = content.match(ratio_pattern);
            let score = content.match(score_pattern);
            if (score && ratio ) {
                let stats = {ratio : ratio.toString().match(nr_pattern), score : score.toString().match(nr_pattern)};
                let stats_json = JSON.stringify(stats);
                localStorage.setItem(PETPET_STATS, stats_json);
                update_statsbox_text();
            }
            // cant play more than 30 games
            var stats = JSON.parse(localStorage.getItem(PETPET_STATS));
            if (stats) {
                if (parseInt(stats.ratio[0]) + parseInt(stats.ratio[1]) >= 30) {
                    console.log("Reached max number of games for today (30)")
                    return;
                }
            }
            let active = GM_getValue(ACTIVE, STRONG);
            if (active == STRONG) {
                GM_setValue(ACTIVE, WEAK);
                location.replace("https://www.neopets.com/process_changepet.phtml?new_active_pet=" + WEAK);
            } else {
                new_game[0].click();
            }
        } else {
            let active = GM_getValue(ACTIVE, WEAK);
            if (active == WEAK) {
                GM_setValue(ACTIVE, STRONG);
                location.replace("https://www.neopets.com/process_changepet.phtml?new_active_pet=" + STRONG);
                return;
            }
            fight();
        }
    }
}

function fight() {
    var choice = Math.floor(Math.random() * (3-1)) + 1;
    switch (choice) {
        case 1: {let shield = document.getElementsByName("Shield"); 
            if (shield.length != 0) {
                shield[0].click();
            } else {
                document.getElementsByName("FightBB")[0].click();
            }
        };
        case 2: document.getElementsByName("FightHS")[0].click();
        default: document.getElementsByName("FightBB")[0].click();
    };
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
    var stats = JSON.parse(localStorage.getItem(PETPET_STATS));
    if (!stats) {
        document.getElementById('statsbox').innerHTML = "No stats available yet";
    } else {
        document.getElementById('statsbox').innerHTML = "Current Score: " + stats.score + "\nRatio:" + stats.ratio[0] + "/" + stats.ratio[1];
    }
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
        // setTimeout(start, 1000 * (1 + Math.random()));
        play();
    }
}