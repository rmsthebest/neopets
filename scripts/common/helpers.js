/**
 *  Delay calling function by a random amount.
 * @param fn Callback function
 * @param interval [min,max] seconds
 */
function delay(fn, interval) {
  setTimeout(fn, 1000 * ((interval[1] - interval[0]) * Math.random() + interval[0]));
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
 * Sum of an array
 * @param arr the arry we want to get the sum of
 */
function sum(arr) {
  return arr.reduce(add, 0);
}
