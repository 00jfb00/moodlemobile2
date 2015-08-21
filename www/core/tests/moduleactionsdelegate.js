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

describe('$mmModuleActionsDelegate', function() {
    var $mmModuleActionsDelegate;

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmModuleActionsDelegate_, $httpBackend) {
        $mmModuleActionsDelegate = _$mmModuleActionsDelegate_;

        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('register/getActionsFor', function() {

        it('should be able to register a module handler and get its actions', function() {
            console.log(' ***** START $mmModuleActionsDelegate register/getActionsFor ***** ');
            var name = 'my_fake_url_observer',
                url = 'some.url',
                courseid = 99,
                actions = {
                    a: 'b'
                };

            $mmModuleActionsDelegate.registerModuleHandler(name, function(u, cid) {
                expect(u).toEqual(url);
                expect(cid).toEqual(courseid);
                return actions;
            });
            var a = $mmModuleActionsDelegate.getActionsFor(url, courseid);
            expect(a).toEqual(actions);
            console.log(' ***** FINISH $mmModuleActionsDelegate register/getActionsFor ***** ');
        });

        it('should stop notifying observers when one returns actions', function() {
            console.log(' ***** START $mmModuleActionsDelegate register/getActionsFor - stop notifying ***** ');
            var receivedFirst = false,
                receivedSecond = false,
                url = 'some.url',
                courseid = 99,
                actions = {
                    a: 'b'
                };

            $mmModuleActionsDelegate.registerModuleHandler('first', function() {
                // This one doesn't return actions.
                receivedFirst = true;
            });
            $mmModuleActionsDelegate.registerModuleHandler('second', function() {
                receivedSecond = true;
                return actions; // This one returns the actions.
            });
            $mmModuleActionsDelegate.registerModuleHandler('third', function() {
                expect('Last observer called').toEqual(false); // This one should not be called.
            });
            var a = $mmModuleActionsDelegate.getActionsFor(url, courseid);
            expect(a).toEqual(actions);
            expect(receivedFirst).toEqual(true);
            expect(receivedSecond).toEqual(true);
            console.log(' ***** FINISH $mmModuleActionsDelegate register/getActionsFor - stop notifying ***** ');
        });

    });

});
