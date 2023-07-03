// ==UserScript==
// @name         Vira's Potato Counter
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  Counts potatoes
// @author       rmsthebest
// @match        https://www.neopets.com/medieval/potatocounter.phtml*
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @require      ./common/ui.js
// @resource someCss ../resources/html/some.css
// @resource headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

// TODO: Add flavour text to complain about having to count potatoes
// Also click play again until he says "Arr, you can only guess me potatoes three times a day!"

const regex_thing = (str) => {
  const re = /medieval\/potato[0-9].gif/g
  return ((str || '').match(re) || []).length
}

add_header();

play();

function play() {
    var guess_button = document.querySelector("input[type='submit'][value='Guess!']")
    if (guess_button) {
        var guess = document.getElementsByName("guess");
        for(var i = 0; i < guess.length; i++) {
            if(guess[i].type.toLowerCase() == 'text') {
                guess= guess[i];
                break;
            }
        }
        let res = count();
        if (res > 0 && res < 80) {
            guess.value = res;
            setTimeout(function() {guess_button.click()}, 3500 * (1 + Math.random()));
        } else {
            setTimeout(function() {location.reload()}, 3500 * (1 + Math.random()));
        }
    }
    var again = document.querySelector("input[type='submit'][value='Play Again']");
    if (again) {
        setTimeout(function() {again.click()}, 3500 * (1 + Math.random()));
    }
}


function count() {
    let tables = document.getElementsByTagName("table");
    // skip early tables because they contain fake data
    // at the moment potatoes are in table 10, but that could maybe change so we do it like this...
    for (var i = 5; i < tables.length; i++) {
        let c = regex_thing(tables[i].innerHTML);
        //console.log("table " + i + " has_c = " + c);
         if (c != 0) {
             return c;
         }
    }

    return -1;
}

