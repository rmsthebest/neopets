/**
 *  Delay calling function by a random amount.
 * @param fn Callback function
 * @param interval [min,max] seconds
 */
function delay(fn, interval) {
    let d = ((interval[1] - interval[0]) * Math.random() + interval[0]) * 1000;
    unreliable_load(fn,d);
}

/**
 *  Neopet pages fails to load all the time.
 *  Cancel and re-try to avoid getting stuck.
 * @param fn Callback function
 * @param d delay in milliseconds
 */
function unreliable_load(fn, d) {
    setTimeout(fn, d);
    setTimeout(function() {
      window.stop();
      unreliable_load(fn,d+10); // wait a little extra each time
    }, d+8000);
}


/**
 * get time today in seconds
 */
function secs_today() {
    let date = new Date();
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

  
/**
 * Wait for an element to exist
 * https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
 * @param fn Callback function to select your element
 */
function wait_for(fn) {
    let elem = fn();
    return new Promise(resolve => {
        if (elem) {
            return resolve(elem);
        }

        const observer = new MutationObserver( () => {
            if (elem) {
                resolve(elem);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}


/**
 * To be used with reduce to sum up value of array
 * @param accumulator sum so far
 * @param value new value
 */
function add(accumulator, value) {
    return accumulator + value;
}

/**
 *  computes the of an array
 * @param arr the arry we want to get the sum of
 */
function sum(arr) {
    return arr.reduce(add, 0);
}

/**
 * computes the hash of a string
 * @param s string to hash
 * @returns hash of s
*/
function hash(s) {
  return s.split("").reduce(function(a, b) {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}
