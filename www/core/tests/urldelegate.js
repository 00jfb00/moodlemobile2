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

describe('$mmURLDelegate', function() {
    var $mmURLDelegate;

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmURLDelegate_, $httpBackend) {
        $mmURLDelegate = _$mmURLDelegate_;

        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('register/notify', function() {

        it('should be able to register an observer and notify it', function() {
            console.log(' ***** START $mmURLDelegate register/notify ***** ');
            var received = false,
                name = 'my_fake_url_observer',
                url = 'some.url';

            $mmURLDelegate.register(name, function(urlReceived) {
                received = true;
                expect(urlReceived).toEqual(url);
                return true;
            });
            $mmURLDelegate.notify(url);
            expect(received).toEqual(true);
            console.log(' ***** FINISH $mmURLDelegate register/notify ***** ');
        });

        it('should stop notifying observers when one accepts the URL', function() {
            console.log(' ***** START $mmURLDelegate register/notify - stop notifying ***** ');
            var receivedFirst = false,
                receivedSecond = false,
                url = 'some.url';

            $mmURLDelegate.register('first', function() {
                // This one doesn't treat the URL.
                receivedFirst = true;
            });
            $mmURLDelegate.register('second', function() {
                receivedSecond = true;
                return true; // This one treats the URL.
            });
            $mmURLDelegate.register('third', function() {
                expect('Last observer called').toEqual(false); // This one should not be called.
            });
            $mmURLDelegate.notify(url);
            expect(receivedFirst).toEqual(true);
            expect(receivedSecond).toEqual(true);
            console.log(' ***** FINISH $mmURLDelegate register/notify - stop notifying ***** ');
        });

    });

});
