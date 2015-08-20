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

describe('$mmLog', function() {
    var $mmLog,
        $timeout;

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmLog_, _$timeout_, $httpBackend) {
        $mmLog = _$mmLog_;
        $timeout = _$timeout_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('enabled/isEnabled', function() {

        it('should enable/disable logging and check its state', function() {
            console.log(' ***** START $mmLog enabled/isEnabled ***** ');
            $mmLog.enabled(false);
            expect($mmLog.isEnabled()).toEqual(false);
            $mmLog.enabled(true);
            expect($mmLog.isEnabled()).toEqual(true);
            console.log(' ***** FINISH $mmLog enabled/isEnabled ***** ');
        });

    });

});