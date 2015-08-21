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

describe('$mmSitesManager', function() {
    var $mmSitesManager,
        $mmSite,
        $timeout,
        $httpBackend,
        $mmSitesFactory,
        fakeService = 'myfakeservice',
        fakeExtService = 'fakeextservice',
        demoSites = {
            'my_fake_demo_site': {
                url: "http://myfakemoodle.net",
                username: "student",
                password: "password"
            }
        };

    // Convenience function to create a fake site.
    function createFakeSite() {
        var url = 'http://myfakemoodle.net/' + Math.floor((Math.random() * 100000)),
            token = 'token' + Math.floor((Math.random() * 100000)),
            infos = {
                fullname: 'fullname' + Math.floor((Math.random() * 100000)),
                sitename: 'sitename' + Math.floor((Math.random() * 100000)),
                userpictureurl: 'image' + Math.floor((Math.random() * 100000)),
                functions: [{name: 'component_strings'}],
                siteurl: url,
                username: 'username' + Math.floor((Math.random() * 100000)),
            },
            id = $mmSitesManager.createSiteID(infos.siteurl, infos.username);
        return $mmSitesFactory.makeSite(id, url, token, infos);
    }

    // Convenience function to clean a site added during a test.
    function cleanupAddedSite(siteid) {
        var interval = mmInterval($timeout.flush, 200); // Delete site has several async calls, use an interval.
        interval.start();
        return $mmSitesManager.deleteSite(siteid).finally(function() {
            interval.stop();
        });
    }

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmSitesManager_, _$timeout_, _$httpBackend_, _$mmSite_, _$mmSitesFactory_) {
        $mmSitesManager = _$mmSitesManager_;
        $timeout = _$timeout_;
        $httpBackend = _$httpBackend_;
        $mmSite = _$mmSite_;
        $mmSitesFactory = _$mmSitesFactory_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {
            demo_sites: demoSites,
            wsservice: fakeService,
            wsextservice: fakeExtService
        });

        $httpBackend.flush(); // Flush so language, config and so are loaded.
    }));

    describe('getDemoSiteData', function() {

        it('should return site data if demo site exists', function(done) {
            console.log(' ***** START $mmSitesManager getDemoSiteData - exists ***** ');

            var site = 'my_fake_demo_site';
            $mmSitesManager.getDemoSiteData(site).then(function(data) {
                expect(data).toEqual(demoSites[site]);
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager getDemoSiteData - exists ***** ');
                done();
            });

            $timeout.flush();
        });

        it('should fail if demo site doesn\'t exist', function(done) {
            console.log(' ***** START $mmSitesManager getDemoSiteData - no exists ***** ');

            var site = 'some_site';
            $mmSitesManager.getDemoSiteData(site).then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success.
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager getDemoSiteData - no exists ***** ');
                done();
            });

            $timeout.flush();
        });

    });

    describe('siteExists', function() {

        it('should succeed if site exists', function(done) {
            console.log(' ***** START $mmSitesManager siteExists - success ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*');

            $httpBackend.when('HEAD', regex).respond(200, '');

            $mmSitesManager.siteExists(siteurl).then(function() {
                // Success
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager siteExists - success ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should fail if site doesn\'t exist', function(done) {
            console.log(' ***** START $mmSitesManager siteExists - fail ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*');

            $httpBackend.when('HEAD', regex).respond(500, '');

            $mmSitesManager.siteExists(siteurl).then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager siteExists - fail ***** ');
                done();
            });

            $httpBackend.flush();
        });

    });

    describe('checkSite', function() {

        it('should fail if URL is not valid', function(done) {
            console.log(' ***** START $mmSitesManager checkSite - invalidURL ***** ');

            $mmSitesManager.checkSite('abcde').then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager checkSite - invalidURL ***** ');
                done();
            });

            $timeout.flush();
        });

        it('should fail if site doesn\'t exist', function(done) {
            console.log(' ***** START $mmSitesManager checkSite - no exists ***** ');

            var siteurl = 'myfakemoodle.net',
                regex = new RegExp('https?:\/\/'+siteurl+'.*');

            $httpBackend.when('HEAD', regex).respond(500, '');

            $mmSitesManager.checkSite(siteurl).then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager checkSite - no exists ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should return the URL with the right protocol', function(done) {
            console.log(' ***** START $mmSitesManager checkSite - right protocol ***** ');

            var siteurl = 'myfakemoodle.net',
                httpsRegex = new RegExp('https:\/\/'+siteurl+'.*'),
                httpRegex = new RegExp('http:\/\/'+siteurl+'.*'),
                httpsRequest = $httpBackend.when('HEAD', httpsRegex),
                httpRequest = $httpBackend.when('HEAD', httpRegex);

            // local_mobile not installed.
            $httpBackend.when('POST', httpsRegex).respond(500, '');
            $httpBackend.when('POST', httpRegex).respond(500, '');

            // Set https exists and not http.
            httpsRequest.respond(200, '');
            httpRequest.respond(500, '');

            $mmSitesManager.checkSite(siteurl).then(function(data) {
                expect(data.siteurl.indexOf('https://')).not.toEqual(-1);

                // Let's check the opposite now.
                httpsRequest.respond(500, '');
                httpRequest.respond(200, '');

                return $mmSitesManager.checkSite(siteurl).then(function(data) {
                    expect(data.siteurl.indexOf('http://')).not.toEqual(-1);
                });
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager checkSite - right protocol ***** ');
                done();
            });

            $httpBackend.flush();
        });

    });

    describe('_determineService', function() {

        it('should return basic service by default', function(done) {
            console.log(' ***** START $mmSitesManager _determineService ***** ');

            $mmSitesManager._determineService('mymoodle.net').then(function(service) {
                expect(service).toEqual(fakeService);
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager _determineService ***** ');
                done();
            });

            $timeout.flush();
        });

        it('should return extended service if check site determines that one should be used', function(done) {
            console.log(' ***** START $mmSitesManager _determineService - extended ***** ');

            var siteurl = 'myfakemoodle.net',
                regex = new RegExp('https?:\/\/'+siteurl+'.*');

            // local_mobile not installed.
            $httpBackend.when('HEAD', regex).respond(200, '');
            $httpBackend.when('POST', regex).respond(200, {code: 0}); // local_mobile installed

            $mmSitesManager.checkSite(siteurl).then(function(data) {
                expect(data.code).toEqual(0);
                return $mmSitesManager._determineService(data.siteurl).then(function(service) {
                    expect(service).toEqual(fakeExtService);
                });
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager _determineService - extended ***** ');
                done();
            });

            $httpBackend.flush();
        });

    });

    describe('getUserToken', function() {

        it('should fail if server request fails', function(done) {
            console.log(' ***** START $mmSitesManager getUserToken - fail request ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*');

            $httpBackend.when('POST', regex).respond(500, '');

            $mmSitesManager.getUserToken(siteurl, 'a', 'a').then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager getUserToken - fail request ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should fail if server doesn\'t return token', function(done) {
            console.log(' ***** START $mmSitesManager getUserToken - no token ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*');

            $httpBackend.when('POST', regex).respond(200, '');

            $mmSitesManager.getUserToken(siteurl, 'a', 'a').then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager getUserToken - no token ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should fail with error returned by server if any', function(done) {
            console.log(' ***** START $mmSitesManager getUserToken - error ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*'),
                error = 'Some error';

            $httpBackend.when('POST', regex).respond(200, {error: error});

            $mmSitesManager.getUserToken(siteurl, 'a', 'a').then(function() {
                expect(true).toEqual(false);
            }).catch(function(err) {
                // Success
                expect(err).toEqual(error);
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager getUserToken - error ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should return token in success', function(done) {
            console.log(' ***** START $mmSitesManager getUserToken - success ***** ');

            var siteurl = 'http://myfakemoodle.net',
                urlRegex = new RegExp(siteurl+'.*'),
                paramsRegex = /(?=.*\busername=a\b)(?=.*\bpassword=a\b).*/,
                token = 'abcde';

            $httpBackend.when('POST', urlRegex, paramsRegex).respond(200, {token: token});

            $mmSitesManager.getUserToken(siteurl, 'a', 'a').then(function(tkn) {
                expect(tkn).toEqual(token);
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager getUserToken - success ***** ');
                done();
            });

            $httpBackend.flush();
        });

    });

    describe('createSiteID', function() {

        it('should create unique IDs', function() {
            console.log(' ***** START $mmSitesManager createSiteID ***** ');
            var ids = [],
                sites = ['site1', 'site2', 'site3', 'whatever'],
                usernames = ['user1', 'user2', 'user3', 'someone'];

            function validateId(siteurl, username, shouldExist) {
                var id = $mmSitesManager.createSiteID(siteurl, username);
                expect(typeof(id)).toEqual('string');
                if (shouldExist) {
                    expect(ids.indexOf(id)).not.toEqual(-1);
                } else {
                    expect(ids.indexOf(id)).toEqual(-1);
                    ids.push(id);
                }
            }

            // Validate all IDs are different.
            for (var i = 0; i < sites.length; i++) {
                for (var j = 0; j < usernames.length; j++) {
                    validateId(sites[i], usernames[j]);
                }
            }

            // Check that using same values generate the same ID.
            validateId(sites[0], usernames[0], true);

            console.log(' ***** FINISH $mmSitesManager createSiteID ***** ');
        });

    });

    describe('newSite', function() {

        it('should fail if cannot fetch site info', function(done) {
            console.log(' ***** START $mmSitesManager newSite - fail fetchSiteInfo ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*');

            $httpBackend.when('POST', regex).respond(500, '');

            $mmSitesManager.newSite(siteurl, 'abcde').then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager getUserToken - fail fetchSiteInfo ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should fail if Moodle version is not valid', function(done) {
            console.log(' ***** START $mmSitesManager newSite - invalid Moodle version ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*');

            $httpBackend.when('POST', regex).respond(200, {functions: []});

            $mmSitesManager.newSite(siteurl, 'abcde').then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager newSite - invalid Moodle version ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should fail if download files is disabled', function(done) {
            console.log(' ***** START $mmSitesManager newSite - download disabled ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*'),
                siteInfo = {
                    functions: [{name: 'component_strings'}],
                    downloadfiles: 0
                };

            $httpBackend.when('POST', regex).respond(200, siteInfo);

            $mmSitesManager.newSite(siteurl, 'abcde').then(function() {
                expect(true).toEqual(false);
            }).catch(function() {
                // Success
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager newSite - download disabled ***** ');
                done();
            });

            $httpBackend.flush();
        });

        it('should store new site as current site in success', function(done) {
            console.log(' ***** START $mmSitesManager newSite - success ***** ');

            var siteurl = 'http://myfakemoodle.net',
                regex = new RegExp(siteurl+'.*'),
                token = 'abcde',
                siteInfo = {
                    functions: [{name: 'component_strings'}],
                    siteurl: siteurl,
                    username: 'myuser'
                },
                siteid;

            $httpBackend.when('POST', regex).respond(200, siteInfo);

            $mmSitesManager.newSite(siteurl, token).then(function() {
                var currentSite = $mmSitesManager.getCurrentSite();
                siteid = currentSite.getId();
                expect(currentSite.getURL()).toEqual(siteurl);
                expect(currentSite.getToken()).toEqual(token);
                expect(currentSite.getInfo()).toEqual(siteInfo);
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                // If a site was created, clean it up to leave it like it was at the start.
                if (siteid) {
                    cleanupAddedSite(siteid).then(function() {
                        console.log(' ***** FINISH $mmSitesManager newSite - success ***** ');
                        done();
                    });
                } else {
                    console.log(' ***** FINISH $mmSitesManager newSite - success ***** ');
                    done();
                }
            });

            $httpBackend.flush();
        });

    });

    describe('getCurrentSite/setCurrentSite', function() {

        it('should be able to get and set current site', function() {
            console.log(' ***** START $mmSitesManager getCurrentSite/setCurrentSite ***** ');
            var site = createFakeSite(),
                site2 = createFakeSite();

            $mmSitesManager.setCurrentSite(site);
            expect($mmSitesManager.getCurrentSite()).toEqual(site);
            $mmSitesManager.setCurrentSite(site2);
            expect($mmSitesManager.getCurrentSite()).toEqual(site2);
            $mmSitesManager.setCurrentSite(undefined);
            expect($mmSitesManager.getCurrentSite()).toEqual(undefined);

            console.log(' ***** FINISH $mmSitesManager getCurrentSite/setCurrentSite ***** ');
        });

    });

    describe('addSite/getSite', function() {

        it('should be able to add and get a site', function(done) {
            console.log(' ***** START $mmSitesManager addSite/getSite ***** ');
            var site = createFakeSite();

            // getSite should fail now.
            $mmSitesManager.getSite(site.id).then(function() {
                expect(true).toBe(false);
            }).catch(function() {

                // Add the site now.
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                    // Check that getSite now succeeds.
                    mmFlush($timeout.flush, 200);
                    return $mmSitesManager.getSite(site.id).then(function(s) {
                        expect(s).toEqual(site);
                    });
                }).catch(function() {
                    expect(true).toBe(false);
                });
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager addSite/getSite ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('deleteSite', function() {

        it('should be able to delete a site', function(done) {
            console.log(' ***** START $mmSitesManager deleteSite ***** ');
            var site = createFakeSite(),
                interval = mmInterval($timeout.flush, 200); // Delete site has several async calls, use an interval.

            // Add a site to delete it later.
            $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                // Check that getSite succeeds.
                return $mmSitesManager.getSite(site.id).then(function(s) {
                    expect(s).toEqual(site);

                    // Now delete the site.
                    return $mmSitesManager.deleteSite(site.id).then(function() {
                        // Validate that site has been deleted.
                        return $mmSitesManager.getSite(site.id).then(function() {
                            expect(true).toBe(false);
                        }).catch(function() {
                            // Success.
                        });
                    });
                });
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(function() {
                interval.stop();
                console.log(' ***** FINISH $mmSitesManager deleteSite ***** ');
                done();
            });

            interval.start();
        });

        it('should logout if site deleted is the current site', function(done) {
            console.log(' ***** START $mmSitesManager deleteSite - current ***** ');
            var site = createFakeSite(),
                interval = mmInterval($timeout.flush, 200); // Delete site has several async calls, use an interval.

            // Add a site to delete it later.
            $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                // Check that getSite succeeds.
                return $mmSitesManager.getSite(site.id).then(function(s) {
                    expect(s).toEqual(site);
                    // Set current site.
                    $mmSitesManager.setCurrentSite(s);
                    expect($mmSite.isLoggedIn()).toEqual(true);

                    // Now delete the site.
                    return $mmSitesManager.deleteSite(site.id).then(function() {
                        // Validate that we're not logged in anymore.
                        expect($mmSite.isLoggedIn()).toEqual(false);
                    });
                });
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(function() {
                interval.stop();
                console.log(' ***** FINISH $mmSitesManager deleteSite - current ***** ');
                done();
            });

            interval.start();
        });

    });

    describe('hasSites', function() {

        it('should be able to tell if there are sites', function(done) {
            console.log(' ***** START $mmSitesManager hasSites ***** ');
            var site = createFakeSite();

            // Shouldn't have sites at start.
            $mmSitesManager.hasSites().then(function() {
                expect(true).toBe(false);
            }).catch(function() {

                // Add a site now.
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                    // Check that hasSites is now resolved.
                    mmFlush($timeout.flush, 200);
                    return $mmSitesManager.hasSites();
                }).catch(function() {
                    expect(true).toBe(false);
                });
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager hasSites ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('hasNoSites', function() {

        it('should be able to tell if there are no sites', function(done) {
            console.log(' ***** START $mmSitesManager hasNoSites ***** ');
            var site = createFakeSite();

            // Shouldn't have sites at start.
            $mmSitesManager.hasNoSites().then(function() {

                // Add a site now.
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                    // Check that hasNoSites is now rejected.
                    mmFlush($timeout.flush, 200);
                    return $mmSitesManager.hasNoSites().then(function() {
                        expect(true).toBe(false);
                    }).catch(function() {
                        // Success.
                    });
                });
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager hasNoSites ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('getSiteDb', function() {

        it('should return a site DB', function(done) {
            console.log(' ***** START $mmSitesManager getSiteDb ***** ');
            var site = createFakeSite();

            // getSiteDb should fail now.
            $mmSitesManager.getSiteDb(site.id).then(function() {
                expect(true).toBe(false);
            }).catch(function() {

                // Add the site now.
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                    // Check that getSiteDb now succeeds.
                    mmFlush($timeout.flush, 200);
                    return $mmSitesManager.getSiteDb(site.id).then(function(db) {
                        expect(db).not.toEqual(undefined);
                        expect(db.getName()).toEqual(site.db.getName());
                    });
                }).catch(function() {
                    expect(true).toBe(false);
                });
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager getSiteDb ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('getSites', function() {

        it('should return all sites stored', function(done) {
            console.log(' ***** START $mmSitesManager getSites ***** ');
            var sites = [createFakeSite(), createFakeSite()],
                sitesReturned = [];

            // Create sitesReturned array based on sites.
            angular.forEach(sites, function(site) {
                sitesReturned.push({
                    id: site.id,
                    siteurl: site.siteurl,
                    fullname: site.infos.fullname,
                    sitename: site.infos.sitename,
                    avatar: site.infos.userpictureurl
                });
            });

            // Function to sort arrays of sites.
            function sortById(a, b) {
                return a.id > b.id;
            }

            // Should return an empty array now.
            $mmSitesManager.getSites().then(function(s) {
                expect(s).toEqual([]);

                // Add two sites.
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.addSite(sites[0].id, sites[0].siteurl, sites[0].token, sites[0].infos).then(function() {
                    mmFlush($timeout.flush, 200);
                    return $mmSitesManager.addSite(sites[1].id, sites[1].siteurl, sites[1].token, sites[1].infos).then(function() {

                        // Check that getSites now returns the sites.
                        mmFlush($timeout.flush, 200);
                        return $mmSitesManager.getSites().then(function(s) {
                            expect(s.sort(sortById)).toEqual(sitesReturned.sort(sortById));
                        });
                    }).catch(function() {
                        expect(true).toBe(false);
                    });
                });
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(sites[0].id).then(function() {
                    cleanupAddedSite(sites[1].id).then(function() {
                        console.log(' ***** FINISH $mmSitesManager getSites ***** ');
                        done();
                    });
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('getSitesIds', function() {

        it('should return IDs of all sites stored', function(done) {
            console.log(' ***** START $mmSitesManager getSites ***** ');
            var sites = [createFakeSite(), createFakeSite()],
                idsReturned = [];

            // Create sitesReturned array based on sites.
            angular.forEach(sites, function(site) {
                idsReturned.push(site.id);
            });

            // Should return an empty array now.
            $mmSitesManager.getSitesIds().then(function(ids) {
                expect(ids).toEqual([]);

                // Add two sites.
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.addSite(sites[0].id, sites[0].siteurl, sites[0].token, sites[0].infos).then(function() {
                    mmFlush($timeout.flush, 200);
                    return $mmSitesManager.addSite(sites[1].id, sites[1].siteurl, sites[1].token, sites[1].infos).then(function() {

                        // Check that getSitesIds now returns the ids.
                        mmFlush($timeout.flush, 200);
                        return $mmSitesManager.getSitesIds().then(function(ids) {
                            expect(ids.sort()).toEqual(idsReturned.sort());
                        });
                    }).catch(function() {
                        expect(true).toBe(false);
                    });
                });
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(sites[0].id).then(function() {
                    cleanupAddedSite(sites[1].id).then(function() {
                        console.log(' ***** FINISH $mmSitesManager getSites ***** ');
                        done();
                    });
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('login/logout', function() {

        it('should be able to login and logout the user', function(done) {
            console.log(' ***** START $mmSitesManager login/logout ***** ');
            var siteid = 'some_fake_site_id';

            // Check that there's no site stored as current site.
            $mmSitesManager._getCurrentSiteIdStored().then(function() {
                expect(true).toBe(false);
            }).catch(function() {

                // Login and check that the siteid is stored.
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.login(siteid).then(function() {
                    mmFlush($timeout.flush, 200);
                    return $mmSitesManager._getCurrentSiteIdStored().then(function(id) {
                        expect(id).toEqual(siteid);

                        // Now logout and check that the siteid is no longer stored.
                        mmFlush($timeout.flush, 200);
                        return $mmSitesManager.logout().then(function() {
                            mmFlush($timeout.flush, 200);
                            return $mmSitesManager._getCurrentSiteIdStored().then(function() {
                                expect(true).toBe(false);
                            }).catch(function() {
                                // Success.
                            });
                        });
                    }).catch(function() {
                        expect(true).toBe(false);
                    });
                });
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager login/logout ***** ');
                done();
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('loadSite', function() {

        it('should fail if site doesn\'t exist', function(done) {
            console.log(' ***** START $mmSitesManager loadSite - no exists ***** ');

            // Try to load a site that doesn't exist.
            $mmSitesManager.loadSite('some_site_no_exists').then(function() {
                expect(true).toBe(false);
            }).catch(function() {
                // Success.
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager loadSite - no exists ***** ');
                done();
            });

            mmFlush($timeout.flush, 200);
        });

        it('should succeed if site exists', function(done) {
            console.log(' ***** START $mmSitesManager loadSite - exists ***** ');
            var site = createFakeSite();

            $httpBackend.when('POST', new RegExp(site.siteurl + '.*')).respond(500, {}); // All requests fail.

            // Add the site.
            $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {
                mmFlush($httpBackend.flush, 200);
                return $mmSitesManager.loadSite(site.id).then(function() {
                    expect($mmSite.isLoggedIn()).toEqual(true);
                    expect($mmSite.getId()).toEqual(site.id);
                });
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager loadSite - exists ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('restoreSession', function() {

        it('should fail if there\'s no site stored as current site', function(done) {
            console.log(' ***** START $mmSitesManager restoreSession - no site ***** ');

            $mmSitesManager.restoreSession().then(function() {
                expect(true).toBe(false);
            }).catch(function() {
                // Success.
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager restoreSession - no site ***** ');
                done();
            });

            mmFlush($timeout.flush, 200);
        });

        it('should succeed if there\'s a session to restore', function(done) {
            console.log(' ***** START $mmSitesManager restoreSession - success ***** ');
            var site = createFakeSite();

            $httpBackend.when('POST', new RegExp(site.siteurl + '.*')).respond(500, {}); // All requests fail.

            // Add the site and store it so it can be restored.
            $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {
                mmFlush($timeout.flush, 200);
                return $mmSitesManager.login(site.id).then(function() {
                    // Check that we're not logged in.
                    expect($mmSite.isLoggedIn()).toEqual(false);

                    // Restore session and check that current site is set.
                    mmFlush($timeout.flush, 200);
                    mmFlush(function() {
                        $timeout.flush();
                        $httpBackend.flush();
                    }, 400);
                    return $mmSitesManager.restoreSession().then(function() {
                        expect($mmSite.isLoggedIn()).toEqual(true);
                        expect($mmSite.getId()).toEqual(site.id);
                    });
                });
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(function() {
                // Delete the site to leave it like it was at the start.
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager restoreSession - success ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('updateSiteToken', function() {

        it('should fail if site doesn\'t exist', function(done) {
            console.log(' ***** START $mmSitesManager updateSiteToken - no exists ***** ');

            $mmSitesManager.updateSiteToken('fakesite', 'fakeuser', 'a').then(function() {
                expect(true).toBe(false);
            }).catch(function() {
                // Success.
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager updateSiteToken - no exists ***** ');
                done();
            });

            mmFlush($timeout.flush, 200);
        });

        it('should update the site\'s token', function(done) {
            console.log(' ***** START $mmSitesManager updateSiteToken - success ***** ');
            var site = createFakeSite(),
                originalToken = site.getToken(),
                newToken = 'a brand new token';

            // Add the site
            $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                // Update its token.
                mmFlush(function() {
                    $timeout.flush();
                    mmFlush($timeout.flush, 200);
                }, 200);
                return $mmSitesManager.updateSiteToken(site.siteurl, site.getInfo().username, newToken).then(function() {

                    // Check that the site token has been updated.
                    return $mmSitesManager.getSite(site.id).then(function(s) {
                        expect(s.getToken()).toEqual(newToken);
                        expect(s.getToken()).not.toEqual(originalToken);
                    });
                });
            }).catch(function() {
                // Success.
            }).finally(function() {
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager updateSiteToken - success ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });

    });

    describe('updateSiteInfo', function() {

        it('should fail if site doesn\'t exist', function(done) {
            console.log(' ***** START $mmSitesManager updateSiteInfo - no exists ***** ');

            $mmSitesManager.updateSiteInfo('some_site_no_exists').then(function() {
                expect(true).toBe(false);
            }).catch(function() {
                // Success.
            }).finally(function() {
                console.log(' ***** FINISH $mmSitesManager updateSiteInfo - no exists ***** ');
                done();
            });

            mmFlush($timeout.flush, 200);
        });

        it('should fetch the new info and store it', function(done) {
            console.log(' ***** START $mmSitesManager updateSiteInfo - success ***** ');
            var site = createFakeSite(),
                newInfo = {
                    a: 'b'
                };

            $httpBackend.when('POST', new RegExp(site.siteurl+'.*')).respond(200, newInfo);

            // Add the site
            $mmSitesManager.addSite(site.id, site.siteurl, site.token, site.infos).then(function() {

                // Update info.
                mmFlush(function() {
                    $timeout.flush();
                    mmFlush($timeout.flush, 200);
                    // mmFlush($timeout.flush, 200);
                }, 200);
                return $mmSitesManager.updateSiteInfo(site.id).then(function() {

                    // Check that the site info has been updated.
                    return $mmSitesManager.getSite(site.id).then(function(s) {
                        expect(s.getInfo()).toEqual(newInfo);
                    });
                });
            }).catch(function() {
                // Success.
            }).finally(function() {
                cleanupAddedSite(site.id).then(function() {
                    console.log(' ***** FINISH $mmSitesManager updateSiteInfo - success ***** ');
                    done();
                });
            });

            mmFlush($timeout.flush, 200);
        });
    });

});
