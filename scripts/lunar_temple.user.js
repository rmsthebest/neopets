// ==UserScript==
// @name         Vira's Lunar Temple Solver
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  Counts potatoes
// @author       rmsthebest
// @match        https://www.neopets.com/shenkuu/lunar/?show=puzzle
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @require      ./common/ui.js
// @resource     someCss ../resources/html/some.css
// @resource     headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

add_header();


// I don't think this is needed...
waitForFlash().then((phase) => {
    play(phase);
});

function waitForFlash() {
    var phase = document.querySelectorAll("input[name='phase_choice']");
    return new Promise(resolve => {
        if (phase) {
            return resolve(phase);
        } else {
          add_status("<p>You need to load flash</p>");
        }

        const observer = new MutationObserver( () => {
            if (phase) {
                resolve(phase);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function play(phase) {
    var angle = document.body.innerHTML.match(/angleKreludor=(\d+)/)[1];
    let answer = (8 + Math.round(angle / 22.5)) % 16;
   // let phase = document.querySelectorAll("input[name='phase_choice']")[answer];

    if (phase) {
        add_status("<p>Ohhh moon stuff. I know this one!</p>");
        setTimeout(function() {phase[answer].click()}, 5000 * (1+Math.random()));
    } else {
        add_status("<p>I don't know what to do :(</p>");
    }
}
function add_status(msg) {
    var content = document.getElementsByClassName('div-stuff')[0];
    content.innerHTML = msg;
}
