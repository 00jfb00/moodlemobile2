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

describe('$mmWS', function() {
    var $mmWS,
        $timeout,
        $httpBackend,
        $q,
        $mmApp,
        siteurl = 'http://somesite.example',
        siteurlws = siteurl + '/webservice/rest/server.php?moodlewsrestformat=json',
        wsName = 'some_fake_ws_for_ws';

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmWS_, _$timeout_, _$httpBackend_, _$q_, _$mmApp_) {
        $mmWS = _$mmWS_;
        $timeout = _$timeout_;
        $httpBackend = _$httpBackend_;
        $q = _$q_;
        $mmApp = _$mmApp_;

        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('call', function() {

        it('should fail if token and siteurl are not passed', function(done) {
            console.log(' ***** START $mmWS call - Mising params ***** ');
            var p1, p2, p3;

            p1 = $mmWS.call(wsName, {}).then(function() {
                expect(false).toEqual(true);
            }).catch(function() {
                // OK.
            });

            p2 = $mmWS.call(wsName, {}, {wstoken: 'a'}).then(function() {
                expect(false).toEqual(true);
            }).catch(function() {
                // OK.
            });


            p3 = $mmWS.call(wsName, {}, {siteurl: 'b'}).then(function() {
                expect(false).toEqual(true);
            }).catch(function() {
                // OK.
            });

            setTimeout($httpBackend.flush, 100); // We need $httpBackend.flush for $translate.

            $q.all([p1, p2, p3]).finally(function() {
                console.log(' ***** FINISH $mmWS call - Mising params ***** ');
                done();
            });
        });

        it('should fail if app is offline', function(done) {
            console.log(' ***** START $mmWS call - Offline ***** ');
            // Mock $mmApp.isOnline to return false.
            var isOnlineFunction = $mmApp.isOnline;
            $mmApp.isOnline = function() {
                return false;
            };

            $mmWS.call(wsName, {}, {wstoken: 'a', siteurl: 'b'}).then(function() {
                expect(false).toEqual(true);
            }).catch(function() {
                // OK.
            }).finally(function() {
                $mmApp.isOnline = isOnlineFunction;
                console.log(' ***** FINISH $mmWS call - Offline ***** ');
                done();
            });

            setTimeout($httpBackend.flush, 100); // We need $httpBackend.flush for $translate.
        });

        it('should fail if server call fails', function(done) {
            console.log(' ***** START $mmWS call - Failed request ***** ');
            $httpBackend.when('POST', siteurlws, new RegExp(wsName)).respond(500);

            $mmWS.call(wsName, {}, {wstoken: 'abc', siteurl: siteurl}).then(function() {
                expect(false).toEqual(true);
            }).catch(function() {
                // OK.
            }).finally(function() {
                console.log(' ***** FINISH $mmWS call - Failed request ***** ');
                done();
            });

            setTimeout($httpBackend.flush, 100);
        });

        it('should return error message if server returns one', function(done) {
            console.log(' ***** START $mmWS call - Error returned ***** ');
            var errorMessage = 'Some error message';
            $httpBackend.when('POST', siteurlws, new RegExp(wsName)).respond(200, {exception: 'someexception', message: errorMessage});

            $mmWS.call(wsName, {}, {wstoken: 'abc', siteurl: siteurl}).then(function() {
                expect(false).toEqual(true);
            }).catch(function(error) {
                expect(error).toEqual(errorMessage);
            }).finally(function() {
                console.log(' ***** FINISH $mmWS call - Error returned ***** ');
                done();
            });

            setTimeout($httpBackend.flush, 100);
        });

        it('should return data returned by server in success', function(done) {
            console.log(' ***** START $mmWS call - Successful request ***** ');
            var returnData = {a: 'b', c: 'd', extra: true};
            $httpBackend.when('POST', siteurlws, new RegExp(wsName)).respond(200, returnData);

            $mmWS.call(wsName, {}, {wstoken: 'abc', siteurl: siteurl}).then(function(data) {
                expect(data).toEqual(returnData);
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmWS call - Successful request ***** ');
                done();
            });

            setTimeout($httpBackend.flush, 100);
        });

        it('should send parameters to server', function(done) {
            console.log(' ***** START $mmWS call - Check parameters ***** ');
            var params = {a: 'b', extra: true},
                regex = new RegExp('(?=.*\\bwsfunction='+wsName+'\\b)(?=.*\\ba=b\\b)(?=.*\\bextra=true\\b).*'),
                returnData = {paramsReceived: true};
            $httpBackend.when('POST', siteurlws, regex).respond(200, returnData);

            $mmWS.call(wsName, params, {wstoken: 'abc', siteurl: siteurl}).then(function(data) {
                expect(data).toEqual(returnData);
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmWS call - Check parameters ***** ');
                done();
            });

            setTimeout($httpBackend.flush, 100);
        });

    });

});
