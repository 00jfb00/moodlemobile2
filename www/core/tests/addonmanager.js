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

describe('$mmAddonManager', function() {
    var $mmAddonManager, $timeout, $mmUtil;

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmAddonManager_, _$timeout_, _$mmUtil_, $httpBackend) {
        $mmAddonManager = _$mmAddonManager_;
        $timeout = _$timeout_;
        $mmUtil = _$mmUtil_;

        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('isAvailable', function() {

        it('should be able to detect available services', function() {
            expect($mmAddonManager.isAvailable()).toEqual(false);
            expect($mmAddonManager.isAvailable('$mmUtil')).toEqual(true); // Test with core because addons can be removed.
            expect($mmAddonManager.isAvailable('$mmSomeFakeService')).toEqual(false);
        });

    });

    describe('get', function() {

        it('should be able to get available services', function() {
            expect($mmAddonManager.get()).toEqual(undefined);
            expect($mmAddonManager.get('$mmUtil')).toEqual($mmUtil); // Test with core because addons can be removed.
            expect($mmAddonManager.get('$mmSomeFakeService')).toEqual(undefined);
        });

    });

});
