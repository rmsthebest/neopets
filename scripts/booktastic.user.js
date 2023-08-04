// ==UserScript==
// @name         Vira's Booktastic Shopper
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  Highlights books you might want to buy
// @author       rmsthebest
// @match        https://www.neopets.com/objects.phtml?obj_type=70&type=shop
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// @require      ./common/ui.js
// @require      ./common/helpers.js
// @resource     someCss ../resources/html/some.css
// @resource     headerHTML ../resources/html/default_box.html
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

const PET_NAME = "CHANGE_ME"
const READ_BOOKS = "RBKEY";

add_header();
add_all_ui();
highlight_read_books();

function highlight_read_books() {
  let read_books = load_read_books();
  if (read_books.size == 0) {
      return;
  }
  let shop_items = document.querySelectorAll(".shop-grid > .shop-item");
  shop_items.forEach(match_book, {read_books});
}

function match_book(item) {
  let url = item.querySelector("div[class='item-img']").style.backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
  let book = url_to_hash(url);
  if (this.read_books.has(book)) {
    item.querySelectorAll(".item-name").forEach(function(p){p.style.backgroundColor = "green"});
  } else {
    item.querySelectorAll(".item-name").forEach(function(p){p.style.backgroundColor = "red"});
  }
}

function update_read_books() {
  GM_xmlhttpRequest({
    method: "GET",
    url: "https://www.neopets.com/moon/books_read.phtml?pet_name=" + PET_NAME,
    // headers: {
    //   "User-Agent": "Mozilla/5.0", // If not specified, navigator.userAgent will be used.
    //   "Accept": "text/html" // If not specified, browser defaults will be used.
    // },
    responseType: "document",
    onload: function (response) {
      // Attempt to create responseXML, if absent, in supported browsers
      var responseXML = response.responseXML;
      if (!responseXML) {
        try {
          responseXML = new DOMParser().parseFromString(response.responseText, "text/html");
        }
        catch (err) {}
      }
      var read_books = [];
      let images = responseXML.querySelectorAll("table[width='470'] > tbody > tr > td > img");
      images.forEach(function(img) {let v = url_to_hash(img.src); if(v) {read_books.push(v)}});
      GM_setValue(READ_BOOKS, read_books);
    }
  });
}

function load_read_books() {
    let arr = GM_getValue(READ_BOOKS, []);
    //console.debug(arr);
    var set = new Set();
    arr.forEach(function(v){set.add(v)});
    return set;
}

function url_to_hash(url) {
  let stripped = /[^/]*$/.exec(url);
  if (stripped.length > 0) {
  return hash(stripped[0]);
  } else {
    return null
  }
}



/// ----------- UI --------------------------------------------------
function add_all_ui() {
  add_statsbox();
  add_buttons();
}

function add_statsbox() {
    var stats_box = document.createElement('div');
    stats_box.id = 'statsbox';
    stats_box.style.display = 'block';
    stats_box.style.margin = '5 auto';
    stats_box.style.textAlign = 'center';
    update_stats_text(stats_box);
    var content = document.getElementsByClassName('div-stuff')[0];
    content.prepend(stats_box);
}

function update_stats_text(node) {
    let len = GM_getValue(READ_BOOKS, []).length;
    if (PET_NAME == "CHANGE_ME") {
        node.innerHTML = "<p>Edit script to add name of your pet</p>";
    } else {
        node.innerHTML = "<p>" + PET_NAME + " has read " + len + " books</p>";
    }
}


function add_buttons() {
    var updateRead = document.createElement('button');
    updateRead.innerHTML = "update";
    updateRead.id = 'update-read';
    updateRead.style.display = 'block';
    updateRead.style.margin = '0 auto';
    updateRead.addEventListener('click', update_read_books);

    var content = document.getElementsByClassName('div-stuff')[0];
    if (content) {
        content.append(updateRead);
    }
}

function update_read_button() {
    update_read_books();
    var stats_box = document.getElementsByClassName('statsbox')[0];
    update_stats_text(stats_box);
}



/*
  https://www.neopets.com/objects.phtml?obj_type=70&type=shop
<div class='shop-grid'><tr>
  <div class='shop-item'>
    <div tabindex='0' class='item-img' style='background-image:url("//images.neopets.com/items/boo_orangegrundo2.gif");'  
      alt="With so much lava around, there is always a use for this cook book." 
      title="With so much lava around, there is always a use for this cook book." 
      border='1' 
      onclick='confirmPurchase(this)' 
      onkeyup='clickElement(event)' 
      ta-name='105 Lava Cake Recipes' 
      data-price='1,187' data-link='haggle.phtml?obj_info_id=24575&stock_id=226690054&g=3'>
    </div>
     <p class='item-name'><B>105 Lava Cake Recipes</B></p>
    <p class='item-stock'>12 in stock</p>
    <p class='item-stock'>Cost: 1,187 NP</p>
  </div>
</div>

*/


/*
  https://www.neopets.com/moon/books_read.phtml?pet_name=x
<table align=center width=470 cellpadding=3 cellspacing=0 border=1>
  <tr>
    <td align=center width=90><b>Picture</b></td>
    <td align=center width=380><b>Description</b></td>
  </tr>
  <tr>
    <td align=center>
      <img src='//images.neopets.com/items/bbo_krelflag.gif' width=80 height=80 border=0>
      <br><font size=1>(1)</font>
    </td>
    <td align=center>
      <i>What does the flag mean?  Who created it and why is it so orange?
    </td>
  </tr>
*/
