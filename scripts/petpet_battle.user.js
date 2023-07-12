// ==UserScript==
// @name         Vira's PetPet Battler
// @namespace    Violentmonkey Scripts
// @version      0.2.1
// @description  Plays petpet battle using strategy of some random guy on the internet
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
// @grant        GM_xmlhttpRequest
// ==/UserScript==

var KEY_PLAY = 'playPetPetBattle';
var PETPET_STATS = 'PETPET_STATS';
var HEALTH = 'PETPET_HEALTH';
var ATTACK = 'PETPET_ATTACK'; // previousĺy used attack
var STRONG = "placeholder_strong"; // DONT FORET TO UPDATE THESE. TODO: make textfield inputs
var WEAK = "placeholder_weak";
var ACTIVE = "ACTIVE_PET";
const STRATEGY = false;

const health_regex = (str) => {
    const re = /(\d+) %/g
    let res = re.exec(str);
    return res ? res[1] : "";
}

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
    let health = get_health();
    var attack = JSON.parse(localStorage.getItem(ATTACK));
    var headshot = document.getElementsByName("FightHS");
    var bodyblow = document.getElementsByName("FightBB");
    var shield = document.getElementsByName("Shield");
    shield = shield.length != 0 ? shield : bodyblow;

    // This "strategy" that is described on the internet has given me very poor winrate
    if (health != null && attack !== null && STRATEGY) {
        // Use shield if enemy is low
        // Switch attack if we missed
        if (health.current < 20 && shield.length != 0) {
            attack = 2;
        } else if (health.current >= health.prev) {
            attack = attack ? 0 : 1;
        } else if (shield.length == 0) {
            attack = 0;
        }
    } else {
        attack = Math.floor(Math.random() * (3-1)) + 1;
    }
    var button;
    switch (attack) {
        case 2: {button = shield[0]; break;}
        case 1: {button = headshot[0]; break;}
        default: {button = bodyblow[0]; break;}
    };
    localStorage.setItem(ATTACK, JSON.stringify(attack));
    button.click();
}

function get_health() {
    // var my_health = document.querySelectorAll('td > img[src$="red_bar.gif"]')[0].parentNode.textContent;
    var opponent_health = document.querySelectorAll('td > img[src$="blue_bar.gif"]');
    // if (my_health) {
    //     my_health = health_regex(my_health);
    // }
    if (opponent_health) {
        opponent_health = health_regex(opponent_health[0].parentElement.textContent);
        var health = JSON.parse(localStorage.getItem(HEALTH));
        if (health) {
            health.prev = health.current;
            health.current = opponent_health;
        } else {
            health = {prev: opponent_health, current: opponent_health};
        }
        localStorage.setItem(HEALTH, JSON.stringify(health));
        return health;
    }
    return null;
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
    var attack = JSON.parse(localStorage.getItem(ATTACK));
    attack = attack == null ? "None" : attack;
    if (!stats) {
        document.getElementById('statsbox').innerHTML = "No stats available yet";
    } else {
        document.getElementById('statsbox').innerHTML = "Current Score: " + stats.score +
            "<br>Ratio:" + stats.ratio[0] + "/" + stats.ratio[1] +
            "<br>Attacked with: " + attack
            ;
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