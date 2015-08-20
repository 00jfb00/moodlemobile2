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

describe('$mmLocalNotifications', function() {
    var $mmLocalNotifications,
        $timeout,
        $q;

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmLocalNotifications_, _$timeout_, _$q_, $httpBackend) {
        $mmLocalNotifications = _$mmLocalNotifications_;
        $timeout = _$timeout_;
        $q = _$q_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('isAvailable', function() {

        it('should return false in browser', function() {
            console.log(' ***** START $mmLocalNotifications isAvailable ***** ');
            expect($mmLocalNotifications.isAvailable()).toEqual(false);
            console.log(' ***** FINISH $mmLocalNotifications isAvailable ***** ');
        });

    });

    describe('_getUniqueNotificationId', function() {

        it('should return different IDs', function(done) {
            console.log(' ***** START $mmLocalNotifications _getUniqueNotificationId ***** ');
            var ids = [],
                component1 = 'fakeComponent1',
                component2 = 'fakeComponent2',
                site1 = 'fakeSite1',
                site2 = 'fakeSite2',
                promise = $q.when(),
                interval = mmInterval($timeout.flush, 100);

            function validateId(notifid, component, siteid, shouldExist) {
                // Promises need to be chained, otherwise different sites/components might get the same ID.
                promise = promise.then(function() {
                    return $mmLocalNotifications._getUniqueNotificationId(notifid, component, siteid).then(function(id) {
                        if (shouldExist) {
                            expect(ids.indexOf(id)).not.toEqual(-1);
                        } else {
                            expect(ids.indexOf(id)).toEqual(-1);
                            ids.push(id);
                        }
                    }).catch(function() {
                        expect(true).toEqual(false);
                    });
                });
            }

            // Check that all the IDs are different.
            validateId(1, component1, site1);
            validateId(1, component2, site1);
            validateId(1, component1, site2);
            validateId(1, component2, site2);
            validateId(2, component1, site1);
            validateId(2, component1, site2);
            validateId(2, component2, site1);
            validateId(2, component2, site2);

            // Check that it also works for big numbers.
            validateId(999999999, component1, site1);

            // Check that using the same params creates the same ID.
            validateId(1, component1, site1, true);

            promise.finally(function() {
                console.log(' ***** FINISH $mmLocalNotifications _getUniqueNotificationId ***** ');
                interval.stop();
                done();
            });

            // Call $timeout.flush periodically until the test finishes.
            interval.start();
        });

    });

    describe('schedule', function() {
        var originalSchedule,
            scheduled;

        beforeEach(inject(function($cordovaLocalNotification) {
            originalSchedule = $cordovaLocalNotification.schedule;
            // Mock $cordovaLocalNotification.schedule.
            $cordovaLocalNotification.schedule = function(notification) {
                scheduled = notification;
            };
        }));

        afterEach(inject(function($cordovaLocalNotification) {
            $cordovaLocalNotification.schedule = originalSchedule;
        }));

        it('should schedule a notification', function(done) {
            console.log(' ***** START $mmLocalNotifications schedule ***** ');
            scheduled = undefined;
            var interval = mmInterval($timeout.flush, 100),
                notification = {
                    id: 1,
                    title: 'Fake title',
                    message: 'Fake message'
                };

            $mmLocalNotifications.schedule(notification, 'sched_test_component', 'sched_test_site').then(function() {
                expect(scheduled.title).toEqual(notification.title);
                expect(scheduled.message).toEqual(notification.message);
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmLocalNotifications schedule ***** ');
                interval.stop();
                done();
            });

            // Call $timeout.flush periodically until the test finishes.
            interval.start();
        });

        it('should not schedule an already triggered notification', function(done) {
            console.log(' ***** START $mmLocalNotifications schedule - triggered ***** ');
            scheduled = undefined;
            var interval = mmInterval($timeout.flush, 100),
                originalIsTriggered = $mmLocalNotifications.isTriggered,
                notification = {
                    id: 1,
                    title: 'Fake title',
                    message: 'Fake message'
                };

            // Mock isTriggered to always return false.
            $mmLocalNotifications.isTriggered = function() {
                return $q.when(true);
            };

            $mmLocalNotifications.schedule(notification, 'sched_test_component', 'sched_test_site').then(function() {
                expect(scheduled).toEqual(undefined);
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmLocalNotifications schedule - triggered ***** ');
                interval.stop();
                $mmLocalNotifications.isTriggered = originalIsTriggered;
                done();
            });

            // Call $timeout.flush periodically until the test finishes.
            interval.start();
        });

    });

    describe('cancel', function() {
        var originalSchedule,
            originalCancel,
            scheduledId,
            canceledId;

        beforeEach(inject(function($cordovaLocalNotification) {
            originalSchedule = $cordovaLocalNotification.schedule;
            originalCancel = $cordovaLocalNotification.cancel;
            // Mock $cordovaLocalNotification.
            $cordovaLocalNotification.schedule = function(notification) {
                scheduledId = notification.id;
            };
            $cordovaLocalNotification.cancel = function(id) {
                canceledId = id;
            };
        }));

        afterEach(inject(function($cordovaLocalNotification) {
            $cordovaLocalNotification.schedule = originalSchedule;
            $cordovaLocalNotification.cancel = originalCancel;
        }));

        it('should cancel a notification', function(done) {
            console.log(' ***** START $mmLocalNotifications schedule ***** ');
            var component = 'cancel_test_component',
                siteid = 'cancel_test_site',
                notifID = 1,
                interval = mmInterval($timeout.flush, 100),
                notification = {
                    id: notifID,
                    title: 'Fake title',
                    message: 'Fake message'
                };

            $mmLocalNotifications.schedule(notification, component, siteid).then(function() {
                return $mmLocalNotifications.cancel(notifID, component, siteid).then(function() {
                    expect(canceledId).not.toEqual(undefined);
                    expect(canceledId).toEqual(scheduledId);
                });
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmLocalNotifications schedule ***** ');
                interval.stop();
                done();
            });

            // Call $timeout.flush periodically until the test finishes.
            interval.start();
        });

    });

    describe('trigger/isTriggered', function() {

        it('should mark a notification as triggered and detect if it is marked', function(done) {
            console.log(' ***** START $mmLocalNotifications trigger/isTriggered ***** ');
            var notifID = 1234,
                notifTime = 0,
                notificationToCheck = {
                    id: notifID,
                    at: new Date(notifTime)
                },
                notificationToTrigger = {
                    id: notifID,
                    at: notifTime
                };

            // Check that notification is marked as not triggered.
            $mmLocalNotifications.isTriggered(notificationToCheck).then(function(isTriggered) {
                expect(isTriggered).toEqual(false);

                // Trigger notification and check that now is marked as triggered.
                mmFlush($timeout.flush, 100);
                return $mmLocalNotifications.trigger(notificationToTrigger).then(function() {
                    mmFlush($timeout.flush, 100);
                    return $mmLocalNotifications.isTriggered(notificationToCheck).then(function(isTriggered) {
                        expect(isTriggered).toEqual(true);
                    });
                });
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                $mmLocalNotifications.removeTriggered(notifID).then(function() {
                    console.log(' ***** FINISH $mmLocalNotifications trigger/isTriggered ***** ');
                    done();
                });
                mmFlush($timeout.flush, 100);
            });

            mmFlush($timeout.flush, 100);
        });

        it('should detect a notification is not triggered if time has changed', function(done) {
            console.log(' ***** START $mmLocalNotifications trigger/isTriggered - time changed ***** ');
            var notifID = 1234,
                notificationToCheck = {
                    id: notifID,
                    at: new Date(0)
                },
                notificationToTrigger = {
                    id: notifID,
                    at: 1
                };

            // Trigger notification and check if the same ID but with a different time is marked as triggered.
            $mmLocalNotifications.trigger(notificationToTrigger).then(function() {
                mmFlush($timeout.flush, 100);
                return $mmLocalNotifications.isTriggered(notificationToCheck).then(function(isTriggered) {
                    expect(isTriggered).toEqual(false);
                });
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                $mmLocalNotifications.removeTriggered(notifID).then(function() {
                    console.log(' ***** FINISH $mmLocalNotifications trigger/isTriggered - time changed ***** ');
                    done();
                });
                mmFlush($timeout.flush, 100);
            });

            mmFlush($timeout.flush, 100);
        });

    });

    describe('trigger/removeTriggered', function() {

        it('should remove a triggered mark on a notification', function(done) {
            console.log(' ***** START $mmLocalNotifications trigger/removeTriggered ***** ');
            var notifID = 1234,
                notifTime = 0,
                notificationToCheck = {
                    id: notifID,
                    at: new Date(notifTime)
                },
                notificationToTrigger = {
                    id: notifID,
                    at: notifTime
                };

            // Trigger notification and check that it is marked as triggered.
            $mmLocalNotifications.trigger(notificationToTrigger).then(function() {
                mmFlush($timeout.flush, 100);
                return $mmLocalNotifications.isTriggered(notificationToCheck).then(function(isTriggered) {
                    expect(isTriggered).toEqual(true);

                    // Now remove it and check that it's no longer marked as triggered.
                    mmFlush($timeout.flush, 100);
                    return $mmLocalNotifications.removeTriggered(notifID).then(function() {
                        mmFlush($timeout.flush, 100);
                        return $mmLocalNotifications.isTriggered(notificationToCheck).then(function(isTriggered) {
                            expect(isTriggered).toEqual(false);
                        });
                    });
                });
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                console.log(' ***** FINISH $mmLocalNotifications trigger/removeTriggered ***** ');
                done();
            });

            mmFlush($timeout.flush, 100);
        });

    });

    describe('registerClick/notifyClick', function() {

        it('should be able to register observers and notify them', function(done) {
            console.log(' ***** START $mmLocalNotifications registerClick/notifyClick ***** ');

            $mmLocalNotifications.registerClick('my_fake_component', function() {
                console.log(' ***** FINISH $mmLocalNotifications registerClick/notifyClick ***** ');
                done();
            });
            $mmLocalNotifications.notifyClick({component: 'my_fake_component'});
        });

        it('should notify only the right component', function(done) {
            console.log(' ***** START $mmLocalNotifications registerClick/notifyClick - only right component ***** ');

            $mmLocalNotifications.registerClick('another_fake_component', function() {
                expect(false).toEqual(true);
            });
            $mmLocalNotifications.registerClick('my_fake_component', function() {
                console.log(' ***** FINISH $mmLocalNotifications registerClick/notifyClick - only right component ***** ');
                done();
            });
            $mmLocalNotifications.notifyClick({component: 'my_fake_component'});
        });

    });

});