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

describe('$mmConfig', function() {
    var mmConfig, httpBackend, timeout, randid;

    // Injecting.
    beforeEach(module('mm.core'));

    beforeEach(inject(function($mmConfig, $httpBackend, $timeout) {
        mmConfig = $mmConfig;
        httpBackend = $httpBackend;
        timeout = $timeout;

        // Capture loading of templates and json files.
        $httpBackend.whenGET(/.*\/templates.*/).respond(200, '');
        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.when('GET', 'config.json').respond(200, {'app_id': 'com.moodle.moodlemobile'});
    }));

    it('config from JSON can be read from config.json', function(done) {
        mmConfig.get('app_id').then(function(data) {
            expect(data).toEqual('com.moodle.moodlemobile');
        }).catch(function() {
            expect(false).toEqual(true);
        })
        .finally(done);

        httpBackend.flush();
        timeout.flush();
    });

    it('default value is returned if key not found', function(done) {
        mmConfig.get('invalid_key', 'default_value').then(function(data) {
            expect(data).toEqual('default_value');
        }).catch(function() {
            expect(false).toEqual(true);
        })
        .finally(done);

        httpBackend.flush();
        timeout.flush();
        setTimeout(timeout.flush, 100);
    });

    it('config from JSON cannot be overridden', function(done) {
        mmConfig.set('app_id').then(function() {
            expect(false).toEqual(true);
        }, function() {
            // Success.
        })
        .finally(done);

        httpBackend.flush();
        timeout.flush();
    });

    it('config can be saved to DB', function(done) {
        randid = 'randomkey' + Math.round(Math.random() * 1000000);
        mmConfig.set(randid, 'moodler').then(function() {
            // Success.
        }, function() {
            expect(false).toEqual(true);
        })
        .finally(done);

        httpBackend.flush();
        timeout.flush();
        setTimeout(timeout.flush, 100);
    });

    it('config can be retrieved from DB', function(done) {
        mmConfig.get(randid).then(function(data) {
            expect(data).toEqual('moodler');
        }, function() {
            expect(false).toEqual(true);
        })
        .finally(done);

        httpBackend.flush();
        timeout.flush();
        setTimeout(timeout.flush, 100);
    });

    it('config from JSON cannot be deleted', function(done) {
        mmConfig.delete('app_id').then(function() {
            expect(false).toEqual(true);
        }, function() {
            // Success.
        })
        .finally(done);

        httpBackend.flush();
        timeout.flush();
    });

    it('config can be deleted from DB', function(done) {
        mmConfig.delete(randid).then(function(data) {
            // Check it was deleted.
            setTimeout(timeout.flush, 100);
            return mmConfig.get(randid).then(function() {
                // Still in DB.
                expect(false).toEqual(true);
            }, function() {
                // Success
            });
        }, function() {
            expect(false).toEqual(true);
        })
        .finally(done);

        httpBackend.flush();
        timeout.flush();
        setTimeout(timeout.flush, 100);
    });

})
