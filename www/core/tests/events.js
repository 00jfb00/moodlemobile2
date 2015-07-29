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

describe('$mmEvents', function() {
    var $mmEvents;

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmEvents_, $httpBackend) {
        $mmEvents = _$mmEvents_;

        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('regular events', function() {

        it('should be able to trigger and receive a single event', function() {
            var received = false,
                eventName = 'my_fake_test_event',
                observer;

            observer = $mmEvents.on(eventName, function() {
                received = true;
            });
            $mmEvents.trigger(eventName);
            expect(received).toEqual(true);
            observer.off();
        });

        it('should be able to send data with events', function() {
            var received = false,
                eventName = 'my_fake_test_event',
                observer;

            observer = $mmEvents.on(eventName, function(success) {
                received = true;
                expect(success).toBe(true);
            });
            $mmEvents.trigger(eventName, true);
            expect(received).toEqual(true);
            observer.off();
        });

        it('should be able to unregister observers', function() {
            var received = false,
                eventName = 'my_fake_test_event',
                observer;

            // First we test that observer is receiving events.
            observer = $mmEvents.on(eventName, function() {
                received = true;
            });
            $mmEvents.trigger(eventName);
            expect(received).toEqual(true);

            // Now disable it and check that it no longer receives them.
            received = false;
            observer.off();
            $mmEvents.trigger(eventName);
            expect(received).toEqual(false);
        });

        it('should notify only the right observers', function() {
            var receivedA = false,
                receivedB = false,
                receivedC = false,
                eventName = 'my_fake_test_event',
                eventName2 = 'my_fake_test_event_2',
                observerA,
                observerB,
                observerC;

            observerA = $mmEvents.on(eventName, function() {
                receivedA = true;
            });
            observerB = $mmEvents.on(eventName, function() {
                receivedB = true;
            });
            observerC = $mmEvents.on(eventName2, function() {
                receivedC = true;
            });

            $mmEvents.trigger(eventName);
            expect(receivedA).toEqual(true);
            expect(receivedB).toEqual(true);
            expect(receivedC).toEqual(false);

            receivedA = false;
            receivedB = false;
            $mmEvents.trigger(eventName2);
            expect(receivedA).toEqual(false);
            expect(receivedB).toEqual(false);
            expect(receivedC).toEqual(true);

            observerA.off();
            observerB.off();
            observerC.off();
        });

        it('should not notify observers set after event is triggered', function() {
            var received = false,
                eventName = 'my_fake_unique_event',
                observer;

            // Trigger the event before observer is set.
            $mmEvents.trigger(eventName);
            observer = $mmEvents.on(eventName, function() {
                received = true;
            });
            expect(received).toEqual(false);
            observer.off();
        });

    });

    describe('unique events', function() {

        it('should be able to receive a unique event triggered after observer is set', function() {
            var received = false,
                eventName = 'my_fake_unique_event',
                observer;

            observer = $mmEvents.on(eventName, function() {
                received = true;
            });
            $mmEvents.triggerUnique(eventName);
            expect(received).toEqual(true);
            observer.off();
        });

        it('should trigger unique events only once', function() {
            var received = false,
                eventName = 'my_fake_unique_event',
                observer;

            // Trigger unique event.
            observer = $mmEvents.on(eventName, function() {
                received = true;
            });
            $mmEvents.triggerUnique(eventName);
            expect(received).toEqual(true);

            // Let's test if it can be triggered again.
            received = false;
            $mmEvents.triggerUnique(eventName);
            expect(received).toEqual(false);

            observer.off();
        });

        it('should notify observers set after unique event is triggered', function() {
            var received = false,
                eventName = 'my_fake_unique_event',
                observer;

            // Trigger the event before observer is set.
            $mmEvents.triggerUnique(eventName);
            observer = $mmEvents.on(eventName, function() {
                received = true;
            });
            expect(received).toEqual(true);
            observer.off();
        });

    });

});
