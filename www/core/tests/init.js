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

describe('$mmInitDelegate', function() {
    var $mmInitDelegate,
        $timeout,
        fakeProcessFinished = false;

    // Let's create a fake module so we can retrieve $mmAppProvider.
    beforeEach(function() {
        var fakeModule = angular.module('fake.test.module', function() {});
        fakeModule.config(['$mmInitDelegateProvider', function($mmInitDelegateProvider) {
            // Register a fake process with a really high priority to make sure it's executed first.
            $mmInitDelegateProvider.registerProcess('fakeProcess', function() {
                fakeProcessFinished = true;
            }, 999999);
        }]);
    });

    beforeEach(module('mm.core', 'fake.test.module'));

    beforeEach(inject(function(_$mmInitDelegate_, _$timeout_, $httpBackend) {
        $mmInitDelegate = _$mmInitDelegate_;
        $timeout = _$timeout_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('registerProcess', function() {

        it('should register an init process with a certain priority', function() {
            console.log(' ***** START $mmInitDelegate registerProcess ***** ');
            expect(fakeProcessFinished).toEqual(false);
            $timeout.flush();
            expect(fakeProcessFinished).toEqual(true);
            console.log(' ***** FINISH $mmInitDelegate registerProcess ***** ');
        });

    });

});