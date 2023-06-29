// This is a library for userscripts
// to use it you need to add two grants to your script: GM_addStyle and GM_getResourceText
// also need to add two resources headerHTML and someCss
function add_header() {
    var div = document.createElement("div");
    let html = GM_getResourceText("headerHTML");
    div.innerHTML = html;
    let css = GM_getResourceText("someCss");
    let style = GM_addStyle(css);
    var content = document.getElementsByClassName('content')[0];
    content.prepend(style);
    content.prepend(div);
}
