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

describe('$mmSite', function() {
    var mmSite,
        mmSitesManager,
        mmSitesFactory,
        httpBackend,
        timeout,
        fakeStoreName = 'fake_test_store';

    // Let's create a fake module so we can retrieve $mmSitesFactoryProvider.
    beforeEach(function() {
        var fakeModule = angular.module('fake.test.module', function() {});
        fakeModule.config(['$mmSitesFactoryProvider', function($mmSitesFactoryProvider) {
            var store = {
                name: fakeStoreName,
                keyPath: 'id'
            };
            $mmSitesFactoryProvider.registerStore(store);
        }]);
    });

    beforeEach(module('mm.core', 'fake.test.module'));

    beforeEach(inject(function($mmSite, $mmSitesManager, $mmSitesFactory, $httpBackend, $timeout, mmCoreWSCacheStore) {
        mmSite = $mmSite;
        mmSitesManager = $mmSitesManager;
        mmSitesFactory = $mmSitesFactory;
        httpBackend = $httpBackend;
        timeout = $timeout;
        cacheStoreName = mmCoreWSCacheStore;

        // Capture loading of templates and json files.
        $httpBackend.whenGET(/.*\/templates.*/).respond(200, '');
        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET('config.json').respond(200, {cache_expiration_time: 300000});

        // Some WS calls
        $httpBackend.when('POST', 'http://somesite.example/webservice/rest/server.php?moodlewsrestformat=json', /.*some_read_ws.*/).respond(200, {success: true});
    }));

    it('a user is not logged in by default', function() {
        console.log(' ***** START $mmSite isLoggedIn - not by default ***** ');
        expect(mmSite.isLoggedIn()).toEqual(false);
        console.log(' ***** FINISH $mmSite isLoggedIn - not by default ***** ');
    });

    it('a site can be logged in to', function() {
        console.log(' ***** START $mmSite isLoggedIn - can log in ***** ');
        var site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', {});
        mmSitesManager.setCurrentSite(site);
        expect(mmSite.isLoggedIn()).toEqual(true);
        expect(mmSite.getId()).toEqual('siteId');
        console.log(' ***** FINISH $mmSite isLoggedIn - can log in ***** ');
    });

    it('a site can be logged out', function() {
        console.log(' ***** START $mmSite isLoggedIn - can logout ***** ');
        var site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', {});
        mmSitesManager.setCurrentSite(site);
        expect(mmSite.isLoggedIn()).toEqual(true);
        mmSitesManager.logout();
        expect(mmSite.isLoggedIn()).toEqual(false);
        console.log(' ***** FINISH $mmSite isLoggedIn - can logout ***** ');
    });

    it('a site can return details about its config', function() {
        console.log(' ***** START $mmSite get data ***** ');
        var infos = {a: 'b', c: 4, userid: 12},
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos);
        mmSitesManager.setCurrentSite(site);

        expect(mmSite.getId()).toEqual('siteId');
        expect(mmSite.getURL()).toEqual('http://somesite.example');
        expect(mmSite.getToken()).toEqual('abc');
        expect(mmSite.getInfo()).toEqual(infos);
        expect(mmSite.getUserId()).toEqual(12);
        console.log(' ***** FINISH $mmSite get data ***** ');
    });

    it('site id, token and info can be modified', function() {
        console.log(' ***** START $mmSite modify id, token and info ***** ');
        var infos = {a: 'b', c: 4, userid: 12},
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos);
        mmSitesManager.setCurrentSite(site);

        expect(mmSite.getId()).toEqual('siteId');
        expect(mmSite.getToken()).toEqual('abc');
        expect(mmSite.getInfo()).toEqual(infos);

        infos = {b: 'c'};
        mmSite.setId('newSiteId');
        mmSite.setToken('newToken');
        mmSite.setInfo(infos);

        expect(mmSite.getId()).toEqual('newSiteId');
        expect(mmSite.getToken()).toEqual('newToken');
        expect(mmSite.getInfo()).toEqual(infos);
        console.log(' ***** FINISH $mmSite modify id, token and info ***** ');
    });

    it('a site knows about transfer parameters', function() {
        console.log(' ***** START $mmSite transfer params ***** ');
        var infos = {
                uploadfiles: true,
                downloadfiles: true,
                usercanmanageownfiles: true
            },
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos);
        mmSitesManager.setCurrentSite(site);

        expect(mmSite.canUploadFiles()).toEqual(true);
        expect(mmSite.canDownloadFiles()).toEqual(true);
        expect(mmSite.canAccessMyFiles()).toEqual(true);

        infos = {
            uploadfiles: false,
            downloadfiles: false,
            usercanmanageownfiles: false
        };
        mmSite.setInfo(infos);

        expect(mmSite.canUploadFiles()).toEqual(false);
        expect(mmSite.canDownloadFiles()).toEqual(false);
        expect(mmSite.canAccessMyFiles()).toEqual(false);

        infos = {
            uploadfiles: false,
            downloadfiles: false,
        };
        mmSite.setInfo(infos);

        expect(mmSite.canAccessMyFiles()).toEqual(true);
        console.log(' ***** FINISH $mmSite transfer params ***** ');
    });

    it('a site knows which web services are available', function() {
        console.log(' ***** START $mmSite wsAvailable ***** ');
        var infos = {
                functions: [
                    { name: 'core_some_function' },
                    { name: 'local_mobile_core_extra_function' }
                ]
            },
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos);
        mmSitesManager.setCurrentSite(site);

        expect(mmSite.wsAvailable('core_some_function', true)).toEqual(true);
        expect(mmSite.wsAvailable('core_some_function', false)).toEqual(true);

        expect(mmSite.wsAvailable('core_extra_function', false)).toEqual(false);
        expect(mmSite.wsAvailable('core_extra_function', true)).toEqual(true);

        expect(mmSite.wsAvailable('core_invalid_function', true)).toEqual(false);
        expect(mmSite.wsAvailable('core_invalid_function', true)).toEqual(false);
        console.log(' ***** FINISH $mmSite wsAvailable ***** ');
    });

    it('stores can be added to site DB', function(done) {
        console.log(' ***** START $mmSite stores added ***** ');
        // At the start of the test we created a new fake store. Let's try to insert something in it to check it succeeded.
        var site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', {}),
            db = site.getDb();

        db.insert(fakeStoreName, {id: 1, name: 'a'}).then(function() {

            mmFlush(timeout.flush, 100);

            // Check we can retrieve the data.
            return db.get(fakeStoreName, 1).then(function(data) {
                expect(data.name).toEqual('a');
            });
        }).catch(function() {
            // Failed test.
            expect(false).toEqual(true);
        }).finally(function() {
            console.log(' ***** FINISH $mmSite stores added ***** ');
            done();
        });

        mmFlush(timeout.flush, 100);
    });

    it('a site db can be deleted', function(done) {
        console.log(' ***** START $mmSite site db deleted ***** ');
        var site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', {}),
            db = site.getDb();

        // Lets insert something in the db (fake store).
        db.insert(fakeStoreName, {id: 2, a: 'saas'}).then(function() {

            mmFlush(timeout.flush, 100);

            // Delete DB.
            return site.deleteDB().then(function() {
                // Re-create DB (otherwise we cannot query it).
                site.setId('siteId');
                db = site.getDb();

                mmFlush(timeout.flush, 100);

                // Try to get the value.
                return db.get(fakeStoreName, 2).then(function() {
                    // Failed test, value is still there.
                    expect(false).toEqual(true);
                }).catch(function() {
                    // Not found, test succeeded.
                });
            });
        }).catch(function() {
            // Failed test.
            expect(false).toEqual(true);
        }).finally(function() {
            console.log(' ***** FINISH $mmSite site db deleted ***** ');
            done();
        });

        mmFlush(timeout.flush, 100);
    });

    it('a site can get data from WS if function is available', function(done) {
        console.log(' ***** START $mmSite read WS ***** ');
        var infos = {
                functions: [] // No functions available.
            },
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos);
        mmSitesManager.setCurrentSite(site);

        mmSite.read('some_read_ws', {}).then(function() {
            // Failed test, call should fail since function isn't available.
            expect(false).toEqual(true);
        }).catch(function(error) {
            expect(error).toEqual('mm.core.wsfunctionnotavailable');

            // Add the function and try again.
            infos.functions.push({name: 'some_read_ws'});
            site.setInfo(infos);

            mmFlush(timeout.flush, 100);
            mmFlush(httpBackend.flush, 200);

            return mmSite.read('some_read_ws', {}).then(function(data) {
                expect(data.success).toEqual(true);
            }).catch(function() {
                // Failed test, call should fail since function isn't available.
                expect(false).toEqual(true);
            });
        }).finally(function() {
            // Delete DB to have a clean DB for next tests (or re-execute this one).
            site.deleteDB().finally(function() {
                console.log(' ***** FINISH $mmSite read WS ***** ');
                done();
            });
            mmFlush(timeout.flush, 100);
        });

        httpBackend.flush();
        timeout.flush();
    });

    it('a site can get data from cache', function(done) {
        console.log(' ***** START $mmSite read cache ***** ');
        var infos = {
                functions: [
                    {name: 'new_read_ws'}
                ]
            },
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos),
            mockRequest = httpBackend.when('POST', 'http://somesite.example/webservice/rest/server.php?moodlewsrestformat=json', /.*new_read_ws.*/);
        mmSitesManager.setCurrentSite(site);

        // Setup call as successful so it's cached.
        mockRequest.respond(200, {success: true});

        // Call WS so response is cached.
        mmSite.read('new_read_ws', {}).then(function() {
            // Wait 50 ms for saveToCache to finish (it doesn't block data return).
            mmFlush(timeout.flush, 50);
            return timeout(function() {

                // Make http request to fail now.
                mockRequest.respond(500);

                mmFlush(function() {
                    timeout.flush();
                    httpBackend.flush();
                }, 100);

                // Lets do a request without cache to make sure WS call fails.
                return mmSite.read('new_read_ws', {}, {getFromCache: false, emergencyCache: false}).then(function() {
                    // Failed test, request should have failed.
                    expect(false).toEqual(true);
                }).catch(function() {
                    // We've verified that WS is now failing. Let's try to get the response from cache.

                    mmFlush(timeout.flush, 100);

                    return mmSite.read('new_read_ws', {}).then(function(data) {
                        expect(data.success).toBe(true);
                    }).catch(function() {
                        // Failed test, request should have succeeded.
                        expect(false).toEqual(true);
                    });
                });
            });

        }).catch(function() {
            // Failed test, request should be successful.
            expect(false).toEqual(true);
        }).finally(function() {
            // Delete DB to have a clean DB for next tests (or re-execute this one).
            site.deleteDB().finally(function() {
                console.log(' ***** FINISH $mmSite read cache ***** ');
                done();
            });
            mmFlush(timeout.flush, 100);
        });

        timeout.flush();
        mmFlush(httpBackend.flush, 100);
    });

    it('site write doesn\'t store data in cache', function(done) {
        console.log(' ***** START $mmSite write - doesn\'t store cache ***** ');
        var infos = {
                functions: [
                    {name: 'new_write_ws'}
                ]
            },
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos),
            mockRequest = httpBackend.when('POST', 'http://somesite.example/webservice/rest/server.php?moodlewsrestformat=json', /.*new_write_ws.*/);
        mmSitesManager.setCurrentSite(site);

        // Setup call as successful so it's cached.
        mockRequest.respond(200, {success: true});

        // Call WS, response shouldn't be cached.
        mmSite.write('new_write_ws', {}).then(function() {

            // Make http request to fail now.
            mockRequest.respond(500);

            mmFlush(timeout.flush, 100); // We don't need httpBackend.flush, I don't know why :S

            return mmSite.write('new_write_ws', {}).then(function() {
                // Failed test, request should have failed.
                expect(false).toEqual(true);
            }).catch(function() {
                // Success test.
            });

        }).catch(function() {
            // Failed test, request should be successful.
            expect(false).toEqual(true);
        }).finally(function() {
            // Delete DB to have a clean DB for next tests (or re-execute this one).
            site.deleteDB().finally(function() {
                console.log(' ***** FINISH $mmSite write - doesn\'t store cache ***** ');
                done();
            });
            mmFlush(timeout.flush, 100);
        });

        timeout.flush();
        mmFlush(httpBackend.flush, 100);
    });

    it('a site cache can be invalidated', function(done) {
        console.log(' ***** START $mmSite invalidate cache ***** ');
        var infos = {
                functions: [
                    {name: 'new_read_ws'}
                ]
            },
            site = mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', infos),
            mockRequest = httpBackend.when('POST', 'http://somesite.example/webservice/rest/server.php?moodlewsrestformat=json', /.*new_read_ws.*/);
        mmSitesManager.setCurrentSite(site);

        // Setup call as successful so it's cached.
        mockRequest.respond(200, {a: 'b'});

        // Call WS so response is cached.
        mmSite.read('new_read_ws', {}).then(function(data) {
            expect(data.a).toEqual('b');

            // Wait 50 ms for saveToCache to finish (it doesn't block data return).
            mmFlush(timeout.flush, 50);
            return timeout(function() {

                // Invalidate cache.
                mmFlush(timeout.flush, 100); // Flush get all to invalidate.
                mmFlush(timeout.flush, 200); // Flush invalidate.

                return mmSite.invalidateWsCache().then(function() {

                    // Make http request to fail now.
                    mockRequest.respond(200, {a: 'new_value'});

                    // Perform request again and check that it gets the new value.
                    mmFlush(function() {
                        timeout.flush();
                        httpBackend.flush();
                    }, 100);
                    return mmSite.read('new_read_ws', {}).then(function(data) {
                        expect(data.a).toEqual('new_value');
                    });
                });
            });
        }).catch(function() {
            // Failed test, request should be successful.
            expect(false).toEqual(true);
        }).finally(function() {
            // Delete DB to have a clean DB for next tests (or re-execute this one).
            site.deleteDB().finally(function() {
                console.log(' ***** FINISH $mmSite invalidate cache ***** ');
                done();
            });
            mmFlush(timeout.flush, 100);
        });

        mmFlush(function() {
            httpBackend.flush();
        }, 100);
    });

});
