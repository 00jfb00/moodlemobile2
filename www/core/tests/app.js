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

describe('$mmApp', function() {
    var $mmApp,
        $timeout,
        $state,
        $mmInitDelegate,
        $q,
        fakeStoreName = 'fake_test_store';

    // Let's create a fake module so we can retrieve $mmAppProvider.
    beforeEach(function() {
        var fakeModule = angular.module('fake.test.module', function() {});
        fakeModule.config(['$mmAppProvider', function($mmAppProvider) {
            var store = {
                name: fakeStoreName,
                keyPath: 'id'
            };
            $mmAppProvider.registerStore(store);
        }]);
    });

    beforeEach(module('mm.core', 'fake.test.module'));

    beforeEach(inject(function(_$mmApp_, _$timeout_, _$state_, $httpBackend, _$mmInitDelegate_, _$q_) {
        $mmApp = _$mmApp_;
        $timeout = _$timeout_;
        $state = _$state_;
        $mmInitDelegate = _$mmInitDelegate_;
        $q = _$q_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('createState', function() {

        it('should be able to create a new state', function() {
            console.log(' ***** START $mmApp createState ***** ');
            var stateName = 'my-fake-state',
                url = '/myFakeStateUrl',
                state;
            $mmApp.createState(stateName, {url: url});
            state = $state.get(stateName);
            expect(state).not.toBe(undefined);
            expect(state).not.toBe(null);
            expect(state.url).toEqual(url);
            console.log(' ***** FINISH $mmApp createState ***** ');
        });

    });

    describe('getDB', function() {

        it('should return the app DB', function() {
            console.log(' ***** START $mmApp getDB ***** ');
            var db = $mmApp.getDB();
            expect(db).not.toBe(undefined);
            expect(db.getName()).toEqual('MoodleMobile');
            console.log(' ***** FINISH $mmApp getDB ***** ');
        });

    });

    describe('getSchema', function() {

        it('should return the DB schema', function() {
            console.log(' ***** START $mmApp getSchema ***** ');
            var schema = $mmApp.getSchema(),
                found = false;
            expect(schema).not.toBe(undefined);
            angular.forEach(schema.stores, function(store) {
                if (store.name === fakeStoreName) {
                    found = true;
                }
            });
            expect(found).toEqual(true);
            console.log(' ***** FINISH $mmApp getSchema ***** ');
        });

    });

    describe('initProcess', function() {

        it('should finish', function(done) {
            console.log(' ***** START $mmApp initProcess ***** ');
            var promise = $mmApp.initProcess();
            promise.then(function() {
                // Success.
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmApp initProcess ***** ');
                done();
            });

            $timeout.flush();
            setTimeout($timeout.flush, 100);
        });

    });

    describe('isOnline', function() {

        it('should return true in browser', function() {
            console.log(' ***** START $mmApp isOnline ***** ');
            // In browser it returns true because we're not able to check connection.
            expect($mmApp.isOnline()).toEqual(true);
            console.log(' ***** FINISH $mmApp isOnline ***** ');
        });

    });

    describe('isNetworkAccessLimited', function() {

        it('should return false in browser', function() {
            console.log(' ***** START $mmApp isNetworkAccessLimited ***** ');
            // In browser it returns false because we're not able to check connection.
            expect($mmApp.isNetworkAccessLimited()).toEqual(false);
            console.log(' ***** FINISH $mmApp isNetworkAccessLimited ***** ');
        });

    });

    describe('isReady', function() {

        it('should be able to tell if app is ready', function() {
            console.log(' ***** START $mmApp isReady ***** ');
            // False at start.
            expect($mmApp.isReady()).toEqual(false);

            // Mock $mmInitDelegate to return a resolved promise.
            $mmInitDelegate.ready = function() {
                // For some reason returning $q.when is not detected right.
                var deferred = $q.defer();
                deferred.resolve();
                return deferred.promise;
            };
            expect($mmApp.isReady()).toEqual(true);
            console.log(' ***** FINISH $mmApp isReady ***** ');
        });

    });

    describe('ready', function() {

        it('should be resolved when app is ready', function(done) {
            console.log(' ***** START $mmApp ready ***** ');
            var deferred = $q.defer(),
                promise;

            // Mock $mmInitDelegate to return our promise.
            $mmInitDelegate.ready = function() {
                return deferred.promise;
            };

            promise = $mmApp.ready();
            promise.then(function() {
                // Success.
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmApp ready ***** ');
                done();
            });

            deferred.resolve();
            $timeout.flush();
        });

    });

});
