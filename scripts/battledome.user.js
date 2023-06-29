// ==UserScript==
// @name         Vira's Battledome Friend
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  At the moment it is just re-ordering by difficulty
// @author       You
// @match        https://www.neopets.com/dome/fight.phtml
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @require      ./common/ui.js
// @resource someCss ../resources/html/some.css
// @resource headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

// https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
function waitForNpcTable() {
    let table = document.getElementById("npcTable");
    return new Promise(resolve => {
        if (table) {
            return resolve(table);
        }

        const observer = new MutationObserver( () => {
            if (table) {
                resolve(table);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}


function sort_challengers_list(table){
    // let table = document.getElementById("npcTable");
    // let tbody = table.querySelector("tbody");
    // let rows = Array.from(table.querySelectorAll("tr"));
    var switching = true;
    while(switching) {
        let rows = table.rows;
        switching = false;
        for(var i=2; i < (rows.length -1); i++) {
            let a = parseInt(rows[i].getElementsByClassName("diff")[0].innerHTML);
            let b = parseInt(rows[i + 1].getElementsByClassName("diff")[0].innerHTML);
            if (a > b) {
                switching = true;
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            }
        }
    }
    
}

add_header();
waitForNpcTable().then((elm) => {
    sort_challengers_list(elm);
});
