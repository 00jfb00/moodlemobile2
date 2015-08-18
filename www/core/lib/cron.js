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

angular.module('mm.core')

.constant('mmCoreCronInterval', 300000) // Default interval is 5 minutes.
.constant('mmCoreCronStore', 'cron')

/**
 * Service to handle cron processes. The registered processes will be executed every certain time.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmCronDelegate
 */
.factory('$mmCronDelegate', function($log, $mmConfig, $mmApp, $timeout, $q, mmCoreCronInterval, mmCoreCronStore,
            mmCoreSettingsSyncOnlyOnWifi) {

    $log = $log.getInstance('$mmCronDelegate');

    var hooks = {},
        self = {},
        cronPromise;

    /**
     * Call a hook's handler.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_callHandler
     * @param {String} name Hook's name.
     * @return {Promise}    Promise resolved if handler is a success, false otherwise.
     * @protected
     */
    self._callHandler = function(name) {
        if (hooks[name] && angular.isFunction(hooks[name].handler)) {
            $log.debug('Calling handler of hook: ' + name);
            return hooks[name].handler().then(function() {
                self._setHookLastExecutionTime(name);
            });
        } else {
            $log.debug('Cannot call handler of hook: ' + name);
            return $q.reject();
        }
    };

    /**
     * Get a hook's last execution ID.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_getHookLastExecutionId
     * @param {String} name Hook's name.
     * @return {String}     Hook's last execution ID.
     * @protected
     */
    self._getHookLastExecutionId = function(name) {
        return 'last_execution_'+name;
    };

    /**
     * Get a hook's last execution time. If not defined, return 0.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_getHookLastExecutionTime
     * @param {String} name Hook's name.
     * @return {Promise}    Promise resolved with the hook's last execution time.
     * @protected
     */
    self._getHookLastExecutionTime = function(name) {
        var id = self._getHookLastExecutionId(name);
        return $mmApp.getDB().get(mmCoreCronStore, id).then(function(entry) {
            var time = parseInt(entry.value);
            return isNaN(time) ? 0 : time;
        }).catch(function() {
            return 0; // Not set, return 0.
        });
    };

    /**
     * Register a hook to be executed every certain time.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#register
     * @param {String} name         Hook's name. Must be unique.
     * @param {Number} interval     Hook's interval in milliseconds.
     * @param {Boolean} usesNetwork True if this hook performs network operations.
     * @param {Function} handler    Function to call when the interval has passed. Should return a promise. Important: Rejecting
     *                              this promise means that the handler will be called again often, it shouldn't be abused.
     */
    self.register = function(name, interval, usesNetwork, handler) {
        if (typeof hooks[name] != 'undefined') {
            $log.debug('The cron hook \''+name+'\' is already registered.');
            return;
        }

        $log.debug('Register hook \''+name+'\' in cron.');

        if (!interval || parseInt(interval) < mmCoreCronInterval) {
            $log.debug('Setting interval to default value.');
            interval = mmCoreCronInterval;
        }

        hooks[name] = {
            interval: interval,
            handler: handler,
            network: usesNetwork
        };

        if (typeof cronPromise != 'undefined') {
            // Cron process already executed. Cancel scheduled and execute it again to treat the new hook.
            $timeout.cancel(cronPromise);
            self._cronProcess();
        }
    };

    /**
     * Set a hook's last execution time to current time.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_setHookLastExecutionTime
     * @param {String} name Hook's name.
     * @return {Promise}    Promise resolved when the execution time is saved.
     * @protected
     */
    self._setHookLastExecutionTime = function(name) {
        var id = self._getHookLastExecutionId(name),
            entry = {
                id: id,
                value: new Date().getTime()
            };

        return $mmApp.getDB().insert(mmCoreCronStore, entry);
    };

    /**
     * Check if there's any hook that needs to be executed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_cronProcess
     * @protected
     */
    self._cronProcess = function() {
        var currentTime = new Date().getTime(),
            canSync,
            timeCheckPromises = [],
            executionQueue = $q.when(), // Hooks will be run one after the other. This promise starts the chain of promises.
            nextCheck = 99999999999; // Time until next execution of _cronProcess. Initialize with a really big value.

        cronPromise = undefined;

        $log.debug('Check cron hooks. Current time: ' + currentTime);

        $mmConfig.get(mmCoreSettingsSyncOnlyOnWifi, false).catch(function() {
            return false; // Shouldn't happen.
        }).then(function(syncOnlyOnWifi) {
            canSync = !syncOnlyOnWifi || !$mmApp.isNetworkAccessLimited();

            angular.forEach(hooks, function(hook, name) {
                var promise,
                    nextExecution;

                promise = self._getHookLastExecutionTime(name).then(function(lastExecution) {
                    $log.debug('\'' + name + '\' last execution: ' + lastExecution + ', Interval: ' + hook.interval);
                    nextExecution = lastExecution + parseInt(hook.interval);

                    if (hook.network && !canSync) {
                        $log.debug('Not connected to WiFi, cannot run hook ' + name);
                        // If the nextExecution for this hook is less than mmCoreCronInterval, set it to mmCoreCronInterval.
                        var nextCheckForThisHook = Math.max(nextExecution - currentTime, mmCoreCronInterval);
                        nextCheck = Math.min(nextCheck, nextCheckForThisHook);
                    } else if (currentTime >= nextExecution) {
                        $log.debug('Adding hook \'' + name + '\' to the execution queue.');
                        // Hook needs to be executed. Add it to the end of the queue.
                        executionQueue = executionQueue.finally(function() {
                            return self._callHandler(name).then(function() {
                                $log.debug('Handler of hook \'' + name + '\' was a success.');
                                nextCheck = Math.min(nextCheck, hook.interval);
                            }, function() {
                                // Handler call failed. Retry in mmCoreCronInterval instead of interval.
                                $log.debug('Handler of hook \'' + name + '\' failed.');
                                nextCheck = Math.min(nextCheck, mmCoreCronInterval);
                            });
                        });
                    } else {
                        // Hook doesn't need to be executed yet.
                        nextCheck = Math.min(nextCheck, nextExecution - currentTime);
                    }
                });

                timeCheckPromises.push(promise);
            });

            $q.all(timeCheckPromises).finally(function() {
                executionQueue.finally(function() {
                    // All the hooks have been treated, schedule next execution.
                    nextCheck = nextCheck === 99999999999 ? mmCoreCronInterval : nextCheck; // If no hooks treated, default value.
                    $log.debug('Time until next execution of cron process: ' + nextCheck + 'ms');
                    cronPromise = $timeout(self._cronProcess, nextCheck);
                });
            });
        });
    };

    return self;
})

.config(function($mmAppProvider, mmCoreCronStore) {
    var stores = [
        {
            name: mmCoreCronStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

.run(function($mmApp, $mmCronDelegate) {
    $mmApp.ready().then(function() {
        $mmCronDelegate._cronProcess();
    });
});
