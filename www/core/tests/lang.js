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

describe('$mmLang', function() {
    var $mmLang,
        $timeout,
        $httpBackend,
        $translate,
        $q,
        englishStrings = {
            'first': 'First',
            'second': 'Second'
        },
        spanishStrings = {
            'first': 'Primero',
            'second': 'Segundo'
        },
        extraStrings = {
            'extra': 'An extra string'
        },
        configs = {
            'default_lang': 'en'
        };

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmLang_, _$timeout_, _$translate_, _$httpBackend_, $mmConfig, _$q_) {
        $mmLang = _$mmLang_;
        $timeout = _$timeout_;
        $httpBackend = _$httpBackend_;
        $translate = _$translate_;
        $q = _$q_;

        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, configs);

        // Mock language files.
        $httpBackend.whenGET(/build\/lang\/en.json/).respond(200, englishStrings);
        $httpBackend.whenGET(/build\/lang\/es.json/).respond(200, spanishStrings);
        $httpBackend.whenGET(/extralang\/en.json/).respond(200, extraStrings);

        // Make $translate load the current language.
        $timeout.flush();
        $httpBackend.flush();

        // Mock $mmConfig to make it faster and not depend on config.json file.
        $mmConfig.get = function(name) {
            if (typeof configs[name] != 'undefined') {
                return $q.when(configs[name]);
            } else {
                return $q.reject();
            }
        };
        $mmConfig.set = function(name, value) {
            configs[name] = value;
            return $q.when();
        };
    }));

    describe('getCurrentLanguage', function() {

        it('should return english as current language if it hasn\'t been set', function(done) {
            var promise;
            promise = $mmLang.getCurrentLanguage().then(function(language) {
                expect(language).toEqual('en');
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(done);

            $timeout.flush();
        });

        it('should return current language from config if it has been set', function(done) {
            var promise;

            configs['current_language'] = 'es';
            promise = $mmLang.getCurrentLanguage().then(function(language) {
                expect(language).toEqual('es');
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                delete configs['current_language'];
                done();
            });

            $timeout.flush();
        });

    });

    describe('changeCurrentLanguage', function() {

        it('should change current language', function(done) {
            var promise;
            // Change language to spanish.
            promise = $mmLang.changeCurrentLanguage('es').then(function() {
                var p1, p2;
                // Check that $translate is using spanish.
                expect($translate.use()).toEqual('es');
                p1 = $translate('first').then(function(string) {
                    expect(string).toEqual('Primero');
                });

                // Check that current language was changed.
                p2 = $mmLang.getCurrentLanguage().then(function(language) {
                    expect(language).toEqual('es');
                }).catch(function() {
                    expect(true).toEqual(false);
                });

                setTimeout(function() {
                    $httpBackend.flush();
                    $timeout.flush();
                }, 100);

                return $q.all([p1, p2]);
            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                delete configs['current_language'];
                done();
            });

            $timeout.flush();
            $httpBackend.flush();
        });

    });

    describe('registerLanguageFolder', function() {

        it('should be able to add extra language files to translation table', function(done) {
            var p1, p2;
            // Check that extra strings are not loaded.
            p1 = $translate('extra');
            p1.then(function(extrastring) {

                expect(extrastring).toEqual('extra');

                // Add the extra strings folder.
                return $mmLang.registerLanguageFolder('extralang').then(function() {
                    // Check that now the extra strings are available.
                    p2 = $translate('extra').then(function(extrastring) {
                        expect(extrastring).toEqual(extraStrings['extra']);
                    }).catch(function() {
                        expect(true).toEqual(false);
                    });

                    return p2;

                }).catch(function() {
                    expect(true).toEqual(false);
                });

            }).catch(function() {
                expect(true).toEqual(false);
            }).finally(function() {
                done();
            });

            $timeout.flush();
        });

    });

    describe('translateAndReject', function() {

        it('should be able to return a rejected promise with a translated string', function(done) {
            try {
                console.log(' ***** START $mmLang translateAndReject ***** ');
                $mmLang.translateAndReject('first').then(function() {
                    expect(false).toEqual(true);
                }).catch(function(string) {
                    expect(string).toEqual('First');
                }).finally(function() {
                    console.log(' ***** FINISH $mmLang translateAndReject ***** ');
                    done();
                });
                $timeout.flush();
            } catch(ex) {
                // Sometimes an empty exception {} is thrown after the test has finished. Filter those errors.
                if (ex && typeof ex == 'object' && Object.keys(ex).length > 0) {
                    console.log(ex);
                    expect(false).toEqual(true);
                    done();
                }
            }
        });

    });

    describe('translateAndRejectDeferred', function() {

        it('should be able to reject a deferred with a translated string', function(done) {
            try {
                console.log(' ***** START $mmLang translateAndRejectDeferred ***** ');
                var deferred = $q.defer();
                $mmLang.translateAndRejectDeferred(deferred, 'first');
                deferred.promise.then(function() {
                    expect(false).toEqual(true);
                }).catch(function(string) {
                    expect(string).toEqual('First');
                }).finally(function() {
                    console.log(' ***** FINISH $mmLang translateAndRejectDeferred ***** ');
                    done();
                });
                $timeout.flush();
            } catch(ex) {
                // Sometimes an empty exception {} is thrown after the test has finished. Filter those errors.
                if (ex && typeof ex == 'object' && Object.keys(ex).length > 0) {
                    console.log(ex);
                    expect(false).toEqual(true);
                    done();
                }
            }
        });

    });

});
