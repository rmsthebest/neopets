// ==UserScript==
// @name         Vira's NeoQuest II
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  Allows keyboard navigation
// @author       rmsthebest
// @match        https://www.neopets.com/games/nq2/nq2.phtml*
// @icon         https://raw.githubusercontent.com/rmsthebest/neopets/master/resources/images/favicon/favicon-32x32.png
// ==/UserScript==


window.addEventListener("keyup", (event) => {
    if (event.defaultPrevented) {
        return;
    }
    switch (event.code) {
      case "KeyQ":
      case "Numpad7":
            dosub(5);
            break;
      case "KeyE":
      case "Numpad9":
            dosub(7);
            break;
      case "KeyZ":
      case "Numpad1":
            dosub(6);
            break;
      case "KeyC":
      case "Numpad3":
            dosub(8);
            break;
      case "KeyS":
      case "ArrowDown":
      case "Numpad2":
            dosub(2);
        break;
      case "KeyW":
      case "ArrowUp":
      case "Numpad8":
            dosub(1);
        break;
      case "KeyA":
      case "ArrowLeft":
      case "Numpad4":
            dosub(3);
        break;
      case "KeyD":
      case "ArrowRight":
      case "Numpad6":
            dosub(4);
        break;
            default:
            console.debug(event.code);

    }
});



