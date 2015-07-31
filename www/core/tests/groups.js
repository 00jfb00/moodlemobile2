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

describe('$mmGroups', function() {
    var $mmGroups,
        $timeout,
        $httpBackend,
        $mmSitesManager,
        $mmSitesFactory,
        currentSite,
        otherSite,
        currentSiteGroupsC1 = [
            {id: 1, name: 'My group', description: 'My description'},
            {id: 2, name: 'Another group', description: ''}
        ],
        currentSiteGroupsC2 = [
            {id: 3, name: 'Course 2 group', description: 'Course 2 description'}
        ],
        otherSiteGroupsC1 = [
            {id: 1, name: 'Another site group', description: ''}
        ],
        currentSiteUser2GroupsC1 = [
            {id: 1, name: 'My group', description: 'My description'},
            {id: 6, name: 'A completely different group', description: ''}
        ];

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmGroups_, _$timeout_, _$httpBackend_, _$mmSitesFactory_, _$mmSitesManager_) {
        $mmGroups = _$mmGroups_;
        $timeout = _$timeout_;
        $httpBackend = _$httpBackend_;
        $mmSitesFactory = _$mmSitesFactory_;
        $mmSitesManager = _$mmSitesManager_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});

        // Group WS calls.
        var currentSiteUrl = 'http://somesite.example/webservice/rest/server.php?moodlewsrestformat=json',
            otherSiteUrl = 'http://anothersite.example/webservice/rest/server.php?moodlewsrestformat=json',
            currSiteC1Regex = /(?=.*\bwsfunction=core_group_get_course_user_groups\b)(?=.*\buserid=1\b)(?=.*\bcourseid=1\b).*/,
            currSiteC2Regex = /(?=.*\bwsfunction=core_group_get_course_user_groups\b)(?=.*\buserid=1\b)(?=.*\bcourseid=2\b).*/,
            otherSiteC1Regex = /(?=.*\bwsfunction=core_group_get_course_user_groups\b)(?=.*\buserid=99\b)(?=.*\bcourseid=1\b).*/,
            otherUserC1Regex = /(?=.*\bwsfunction=core_group_get_course_user_groups\b)(?=.*\buserid=10\b)(?=.*\bcourseid=1\b).*/;

        $httpBackend.when('POST', currentSiteUrl, currSiteC1Regex).respond(200, {groups: currentSiteGroupsC1});
        $httpBackend.when('POST', currentSiteUrl, currSiteC2Regex).respond(200, {groups: currentSiteGroupsC2});
        $httpBackend.when('POST', otherSiteUrl, otherSiteC1Regex).respond(200, {groups: otherSiteGroupsC1});
        $httpBackend.when('POST', currentSiteUrl, otherUserC1Regex).respond(200, {groups: currentSiteUser2GroupsC1});

    }));

    // Create sites to test.
    beforeEach(function(done) {
        var functions = [
                {name: 'core_group_get_course_user_groups'}
            ],
            currentSiteInfo = {
                userid: 1,
                functions: functions
            },
            otherSiteInfo = {
                userid: 99,
                functions: functions
            },
            promise;

        // Create current site.
        currentSite = $mmSitesFactory.makeSite('siteId', 'http://somesite.example', 'abc', currentSiteInfo);
        $mmSitesManager.addSite('siteId', 'http://somesite.example', 'abc', currentSiteInfo).then(function() {

            // Create another site.
            otherSite = $mmSitesFactory.makeSite('anotherSiteId', 'http://anothersite.example', '123', otherSiteInfo);
            promise = $mmSitesManager.addSite('anotherSiteId', 'http://anothersite.example', '123', otherSiteInfo).then(function() {
                $mmSitesManager.setCurrentSite(currentSite);
                done();
            }).catch(function() {
                console.log('ERROR');
            });

            setTimeout($timeout.flush, 500);
            return promise;

        }).catch(function() {
            console.log('****** Error creating sites to test $mmGroups ******');
        });

        setTimeout($timeout.flush, 500);
    });

    describe('getUserGroups', function() {

        it('should return current site and current user groups if not defined', function(done) {
            console.log(' ***** START $mmGroups getUserGroups - current ***** ');
            var promise = $mmGroups.getUserGroups([1, 2]);
            promise.then(function(groups) {
                expect(groups).toEqual(currentSiteGroupsC1.concat(currentSiteGroupsC2));
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmGroups getUserGroups - current ***** ');
                done();
            });

            setTimeout(function() {
                $httpBackend.flush();
                $timeout.flush();
            }, 100);
        });

        it('can return other site groups', function(done) {
            console.log(' ***** START $mmGroups getUserGroups - other site ***** ');
            var promise = $mmGroups.getUserGroups([1], false, otherSite.id);
            promise.then(function(groups) {
                expect(groups).toEqual(otherSiteGroupsC1);
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmGroups getUserGroups - other site ***** ');
                done();
            });

            setTimeout($timeout.flush, 50);
            setTimeout($httpBackend.flush, 100);
        });

        it('can return groups from a subset of courses', function(done) {
            console.log(' ***** START $mmGroups getUserGroups - subset ***** ');
            var promise = $mmGroups.getUserGroups([1]);
            promise.then(function(groups) {
                expect(groups).toEqual(currentSiteGroupsC1);
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmGroups getUserGroups - subset ***** ');
                done();
            });

            setTimeout(function() {
                $httpBackend.flush();
                $timeout.flush();
            }, 100);
        });

        it('can return groups from another user in a certain site', function(done) {
            console.log(' ***** START $mmGroups getUserGroups - other user ***** ');
            var promise = $mmGroups.getUserGroups([1], false, undefined, 10);
            promise.then(function(groups) {
                expect(groups).toEqual(currentSiteUser2GroupsC1);
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmGroups getUserGroups - other user ***** ');
                done();
            });

            setTimeout(function() {
                $httpBackend.flush();
                $timeout.flush();
            }, 100);
        });

    });

});
