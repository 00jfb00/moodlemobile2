// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var flushes = [];

/**
 * Call a function after a certain delay. All waiting processes will be deleted once a test finishes.
 *
 * @param {Function} fn    Function to call.
 * @param {Number}   delay Delay in ms.
 */
function mmFlush(fn, delay) {
    flushes.push(setTimeout(fn, delay));
}

/**
 * Call a function every certain time. The process can be started and stopped (once stopped, it cannot be started again).
 *
 * @param {Function} fn    Function to call.
 * @param {Number}   delay Delay in ms.
 * @return {Object}        Object wit start and stop methods.
 */
function mmInterval(fn, delay) {
    var finished = false,
        started = false;

    function execute() {
        if (!finished) {
            mmFlush(function() {
                fn();
                execute();
            }, delay);
        }
    }

    return {
        start: function() {
            if (!started) {
                started = true;
                execute();
            }
        },
        stop: function() {
            finished = true;
        }
    };
}

(function() {

    beforeEach(function() {
        flushes = [];
    });
    afterEach(function() {
        angular.forEach(flushes, function(id) {
            clearTimeout(id);
        });
    });

})();