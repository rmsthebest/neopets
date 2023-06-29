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

var KEY_PLAY = 'playPotatoCount';

add_header();
addToggleButton();

if (JSON.parse(localStorage.getItem(KEY_PLAY))) {
    setTimeout(play, 10 * (1 + Math.random())); // Todo if i add auto clicking
}

function play() {
    var inputs = document.getElementsByName("guess");
    for(var i = 0; i < inputs.length; i++) {
        if(inputs[i].type.toLowerCase() == 'text') {
           var textInput = inputs[i];
            textInput.value = count();
        }
    }
}

const regex_thing = (str) => {
  const re = /medieval\/potato[0-9].gif/g
  return ((str || '').match(re) || []).length
}

function count() {
    let tables = document.getElementsByTagName("table");
    //console.log(tables);

    // skip early tables because they contain fake data
    // at the moment potatoes are in table 10, but that could maybe change so we do it like this...
    for (let i = 5; i < tables.length; i++) {
        let c = regex_thing(tables[i].innerHTML);
        //console.log("table " + i + " has_c = " + c);
         if (c != 0) {
             return c;
         }
    }

    return -1;
}


