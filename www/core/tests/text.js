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

describe('$mmText', function() {
    var $mmText,
        translationMock = {
            'mm.core.notapplicable': 'N/A',
            'mm.core.humanreadablesize': '{{size}} {{unit}}',
            'mm.core.sizeb': 'bytes',
            'mm.core.sizegb': 'GB',
            'mm.core.sizekb': 'KB',
            'mm.core.sizemb': 'MB',
            'mm.core.sizetb': 'TB',
        };

    beforeEach(module('mm.core'));

    beforeEach(module('pascalprecht.translate', function($translateProvider) {
        $translateProvider.translations('en', translationMock).preferredLanguage('en');
    }));

    beforeEach(inject(function(_$mmText_, _$timeout_, $httpBackend) {
        $mmText = _$mmText_;
        $timeout = _$timeout_;

        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('bytesToSize', function() {

        it('should convert numbers to human readable sizes', function() {
            expect($mmText.bytesToSize(1)).toEqual('1 bytes');
            expect($mmText.bytesToSize(10)).toEqual('10 bytes');
            expect($mmText.bytesToSize(1024)).toEqual('1 KB');
            expect($mmText.bytesToSize(1100)).toEqual('1.07 KB');
            expect($mmText.bytesToSize(1100, 0)).toEqual('1 KB');
            expect($mmText.bytesToSize(1100, 5)).toEqual('1.07422 KB');
            expect($mmText.bytesToSize(1100, 5)).toEqual('1.07422 KB');
            expect($mmText.bytesToSize(12345678)).toEqual('11.77 MB');
            expect($mmText.bytesToSize(107360868001)).toEqual('99.99 GB');
            expect($mmText.bytesToSize(700000000000000)).toEqual('636.65 TB');
        });

        it('should return not applicable when the size is not a valid number', function() {
            expect($mmText.bytesToSize(-100)).toEqual(translationMock['mm.core.notapplicable']);
            expect($mmText.bytesToSize()).toEqual(translationMock['mm.core.notapplicable']);
        });

    });

    describe('cleanTags', function() {

        it('should remove HTML tags', function() {
            var texts = [
                {
                    before: '<div class="test"><img src="#" />Oranges are good.</div><span >Really good.</span>',
                    after: 'Oranges are good.Really good.'
                },
                {
                    before: '<p malformed><div noclosed></p>Oranges are<strong> good</strong>.</div></span>Really good.',
                    after: 'Oranges are good.Really good.'
                }
            ];

            angular.forEach(texts, function(text) {
                expect($mmText.cleanTags(text.before)).toEqual(text.after);
            });
        });

        it('can convert new lines to <br />', function() {
            expect($mmText.cleanTags('<p>Some \n text\n</p>')).toEqual('Some <br /> text<br />');
            expect($mmText.cleanTags('<p>Some \n text\n</p>', true)).toEqual('Some   text ');
        });

    });

    describe('replaceNewLines', function() {

        it('should replace new lines with something else', function() {
            expect($mmText.replaceNewLines('a\nb', 'X')).toEqual('aXb');
            expect($mmText.replaceNewLines('a\rb', 'X')).toEqual('aXb');
            expect($mmText.replaceNewLines('a\r\nb', 'X')).toEqual('aXb');
            expect($mmText.replaceNewLines('a\r\nb\r\n\n\r\r\n', '')).toEqual('ab');
        });

    });

    describe('formatText', function() {
        var text = '<span lang="es">Some Spanish content</span><span lang="en"><p>Some English content</p></span>\n';

        beforeEach(inject(function($mmLang, $q) {
            // Mock $mmLang to quickly return the language.
            $mmLang.getCurrentLanguage = function() {
                return $q.when('en');
            };
        }));

        it('should remove multi-lang tags', function(done) {
            var expected = '<p>Some English content</p>\n',
                promise = $mmText.formatText(text);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(done);

            $timeout.flush();
        });

        it('can remove HTML tags', function(done) {
            var expected = 'Some English content<br />',
                promise = $mmText.formatText(text, true);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(done);

            $timeout.flush();
        });

        it('can remove new lines', function(done) {
            var expected = 'Some English content ',
                promise = $mmText.formatText(text, true, true);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(done);

            $timeout.flush();
        });

        it('can shorten the text', function(done) {
            var expected = 'Some English&hellip;',
                promise = $mmText.formatText(text, true, true, 13);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(true).toBe(false);
            }).finally(done);

            $timeout.flush();
        });

    });

    describe('shortText', function() {

        it('shortens the text when needed', function() {
            expect($mmText.shortenText('Hello World!', 100)).toEqual('Hello World!');
            expect($mmText.shortenText('Hello World!', 5)).toEqual('Hello&hellip;');
            expect($mmText.shortenText('Hello World!', 10)).toEqual('Hello&hellip;');
        });

    });

    describe('treatMultilangTags', function() {

        beforeEach(inject(function($mmLang, $q) {
            // Mock $mmLang to quickly return the language.
            $mmLang.getCurrentLanguage = function() {
                return $q.when('en');
            };
        }));

        it('should extract content from <span lang=> tags', function(done) {
            console.log(' ***** START $mmText treatMultilangTags - span ***** ');
            var text ='My language is <span lang="en">English</span><span lang="fr">Français</span>',
                expected = 'My language is English',
                promise = $mmText.treatMultilangTags(text);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should extract content from <lang lang=> tags', function(done) {
            console.log(' ***** START $mmText treatMultilangTags - lang ***** ');
            var text ='My language is <lang lang="en">English</lang><lang lang="fr">Français</lang>',
                expected = 'My language is English',
                promise = $mmText.treatMultilangTags(text);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should get first language if no match found', function(done) {
            console.log(' ***** START $mmText treatMultilangTags - no match ***** ');
            var text = 'My language is <lang lang="es">Spanish</lang><lang lang="fr">Français</lang>',
                expected = 'My language is Spanish',
                promise = $mmText.treatMultilangTags(text);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmText treatMultilangTags - no match ***** ');
                done();
            });

            $timeout.flush();
        });

        it('should return all matches of the language', function(done) {
            console.log(' ***** START $mmText treatMultilangTags - all matches ***** ');
            var text = '<lang lang="en">English</lang><lang lang="fr">Français</lang><lang lang="en">Another</lang>',
                expected = 'EnglishAnother',
                promise = $mmText.treatMultilangTags(text);

            promise.then(function(result) {
                expect(result).toEqual(expected);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmText treatMultilangTags - all matches ***** ');
                done();
            });

            $timeout.flush();
        });

    });

});
