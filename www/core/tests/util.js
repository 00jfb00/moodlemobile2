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

describe('$mmUtil', function() {
    var $mmUtil,
        $timeout,
        $httpBackend,
        $translate,
        translationMockEN = {
            'mm.core.day': 'day',
            'mm.core.days': 'days',
            'mm.core.hour': 'hour',
            'mm.core.hours': 'hours',
            'mm.core.min': 'min',
            'mm.core.mins': 'mins',
            'mm.core.sec': 'sec',
            'mm.core.secs': 'secs',
            'mm.core.year': 'year',
            'mm.core.years': 'years',
            'mm.core.now': 'now',
            'mm.core.country-US': 'United States'
        }, translationMockES = {
            'mm.core.country-US': 'Estados Unidos'
        };

    beforeEach(module('mm.core'));

    // Add mock translations.
    beforeEach(module('pascalprecht.translate', function($translateProvider) {
        $translateProvider.translations('en', translationMockEN).preferredLanguage('en');
        $translateProvider.translations('es', translationMockES);
    }));

    beforeEach(inject(function(_$mmUtil_, _$timeout_, _$httpBackend_, _$translate_) {
        $mmUtil = _$mmUtil_;
        $timeout = _$timeout_;
        $httpBackend = _$httpBackend_;
        $translate = _$translate_;

        $httpBackend.whenGET(/core\/assets\/mimetypes\.json/).respond(200, {
            "doc"  : {"type":"application/msword", "icon":"document", "groups":["document"]},
            "mp3"  : {"type":"audio/mp3", "icon":"mp3", "groups":["audio","web_audio"], "string":"audio"},
            "php"  : {"type":"text/plain", "icon":"sourcecode"},
        });
        $httpBackend.whenGET(/config.json/).respond(200, {});
        $httpBackend.whenGET(/build\/lang\/.*\.json/).respond(200, {});

        // Flush the requests as $mmUtil loads the mimetypes, that should be changed!
        $httpBackend.flush();
    }));

    describe('formatURL', function() {

        it('should clean URLs', function() {
            expect($mmUtil.formatURL('moodle.org/something.html')).toEqual('https://moodle.org/something.html');
            expect($mmUtil.formatURL('http://moodle.org')).toEqual('http://moodle.org');
            expect($mmUtil.formatURL('http://moodle.org ')).toEqual('http://moodle.org');
            expect($mmUtil.formatURL('HTTP://moodle.org ')).toEqual('http://moodle.org');
            expect($mmUtil.formatURL('hTTps://moodle.org ')).toEqual('https://moodle.org');
            expect($mmUtil.formatURL('https://moodle.org/slash/')).toEqual('https://moodle.org/slash');
        });

    });

    describe('getFileExtension', function() {

        it('should return the file extension or undefined', function() {
            expect($mmUtil.getFileExtension('file.txt')).toEqual('txt');
            expect($mmUtil.getFileExtension('some.random.file.php')).toEqual('php');
            expect($mmUtil.getFileExtension('I have spaces.museum')).toEqual('museum');
            expect($mmUtil.getFileExtension('empty')).toEqual(undefined);
        });

    });

    describe('getFileIcon', function() {

        it('should return the path to a file extension', function() {
            expect($mmUtil.getFileIcon('file.mp3')).toEqual('img/files/mp3-64.png');
            expect($mmUtil.getFileIcon('file.doc')).toEqual('img/files/document-64.png');
            expect($mmUtil.getFileIcon('file.php')).toEqual('img/files/sourcecode-64.png');
            expect($mmUtil.getFileIcon('file.other')).toEqual('img/files/unknown-64.png');
        });

    });

    describe('getFolderIcon', function() {

        it('should return the folder icon', function() {
            expect($mmUtil.getFolderIcon('file.mp3')).toEqual('img/files/folder-64.png');
        });

    });

    describe('isPluginFileUrl', function() {

        it('should be able to identify what is a "pluginfile" URL', function() {
            expect($mmUtil.isPluginFileUrl('https://moodle.org/mod/forum/view.php')).toBe(false);
            expect($mmUtil.isPluginFileUrl('https://moodle.org/pluginfile.php/1/user/icon/theme/f1?rev=2')).toBe(true);
        });

    });

    describe('isValidURL', function() {

        it('should be able to identify what is a valid URL', function() {
            expect($mmUtil.isValidURL('https://moodle.org/mod/forum/view.php')).toBe(true);
            expect($mmUtil.isValidURL('http://docs.angularjs.org/api/ng/service/$http')).toBe(true);
            expect($mmUtil.isValidURL('https://moodle.org/mod/forum/view.php?with=somethingelse')).toBe(true);
            expect($mmUtil.isValidURL('https://moodle.org/mod/forum/view.php?with=s p a c e s')).toBe(true);
            expect($mmUtil.isValidURL('https://some-dns.somesite.museum')).toBe(true);
            expect($mmUtil.isValidURL('https://moodl e.org/')).toBe(false);
            expect($mmUtil.isValidURL('htps://typo.com')).toBe(false);
        });

    });

    describe('fixPluginfileURL', function() {
        var token = 'faketoken';

        it('should return an empty string when the URL is not provided', function() {
            var url = 'http://moodle.org/pluginfile.php';
            expect($mmUtil.fixPluginfileURL()).toBe('');
        });

        it('should not fix URLs that already have a token', function() {
            var url = 'http://moodle.org/pluginfile.php?token=123';
            expect($mmUtil.fixPluginfileURL(url, token)).toBe(url);
        });

        it('should not fix URLs that are not pluginfile', function() {
            var url = 'http://moodle.org/plugin-file.php?token=123';
            expect($mmUtil.fixPluginfileURL(url, token)).toBe(url);
        });

        it('should return an empty string when the token is not provided', function() {
            var url = 'http://moodle.org/pluginfile.php';
            expect($mmUtil.fixPluginfileURL(url)).toBe('');
        });

        it('should convert the pluginfile URL to a webservice pluginfile URL', function() {
            var url = 'http://moodle.org/pluginfile.php',
                expected = 'http://moodle.org/webservice/pluginfile.php?token=' + token;
            expect($mmUtil.fixPluginfileURL(url, token)).toEqual(expected);
        });

        it('should handle some existing arguments', function() {
            var url = 'http://moodle.org/pluginfile.php?file=abc',
                expected = 'http://moodle.org/webservice/pluginfile.php?file=abc&token=' + token;
            expect($mmUtil.fixPluginfileURL(url, token)).toEqual(expected);

            url = 'http://moodle.org/pluginfile.php?forcedownload=1';
            expected = 'http://moodle.org/webservice/pluginfile.php?forcedownload=1&token=' + token;
            expect($mmUtil.fixPluginfileURL(url, token)).toEqual(expected);
        });

    });

    describe('readJSONFile', function() {

        it('should return the content of a JSON file', function(done) {
            var promise,
                data = {a: 1, b: 2};

            $httpBackend.expectGET(/test\.json/).respond(200, data);

            promise = $mmUtil.readJSONFile('test.json');
            promise.then(function(result) {
                expect(result).toEqual(data);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $httpBackend.flush();
            $timeout.flush();
        });

    });

    describe('getCountryName', function() {

        it('should return country name translated', function() {
            console.log(' ***** START $mmUtil getCountryName - translate ***** ');
            var code = 'US',
                stringKey = 'mm.core.country-' + code;
            $translate.use('es');
            expect($mmUtil.getCountryName(code)).toEqual(translationMockES[stringKey]);
            $translate.use('en');
            expect($mmUtil.getCountryName(code)).toEqual(translationMockEN[stringKey]);
            console.log(' ***** FINISH $mmUtil getCountryName - translate ***** ');
        });

        it('should return country code if country not found', function() {
            console.log(' ***** START $mmUtil getCountryName - not found ***** ');
            var code = 'FAKE';
            expect($mmUtil.getCountryName(code)).toEqual(code);
            console.log(' ***** FINISH $mmUtil getCountryName - not found ***** ');
        });

    });

    describe('getDocsUrl', function() {
        var $mmLang,
            $q,
            lang = 'es';

        beforeEach(inject(function(_$mmLang_, _$q_) {
            $mmLang = _$mmLang_;
            $q = _$q_;
            // Mock $mmLang to quickly return the language. We use a language different than default.
            $mmLang.getCurrentLanguage = function() {
                return $q.when(lang);
            };
        }));

        it('should return english URL if current language can\'t be retrieved', function(done) {
            var page = 'page.html',
                url = 'https://docs.moodle.org/en/' + page,
                promise,
                getCurrentLanguage = $mmLang.getCurrentLanguage;

            // Make $mmLang.getCurrentLanguage to fail.
            $mmLang.getCurrentLanguage = function() {
                return $q.reject();
            };

            promise = $mmUtil.getDocsUrl(undefined, page);
            promise.then(function(result) {
                expect(result).toEqual(url);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();

            // Leave $mmLang as it was before.
            $mmLang.getCurrentLanguage = getCurrentLanguage;
        });

        it('should return current language URL if it has been defined', function(done) {
            var page = 'page.html',
                url = 'https://docs.moodle.org/' + lang + '/' + page,
                promise;

            promise = $mmUtil.getDocsUrl(undefined, page);
            promise.then(function(result) {
                expect(result).toEqual(url);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should return URL with release if it has been defined', function(done) {
            var page = 'page.html',
                release = '3.0dev (Build: 20150625)',
                url = 'https://docs.moodle.org/30/' + lang + '/' + page,
                promise;

            promise = $mmUtil.getDocsUrl(release, page);
            promise.then(function(result) {
                expect(result).toEqual(url);
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

    });

    describe('timestamp', function() {

        it('should return the current timestamp', function() {
            var timestamp = Math.round(new Date().getTime() / 1000),
                result = $mmUtil.timestamp(),
                difference = result - timestamp;
            expect(difference).toBeLessThan(2); // We leave 1 second margin error because of Math.round.
        });

    });

    describe('isFalseOrZero', function() {

        it('should be able to identify if it is false or zero', function() {
            expect($mmUtil.isFalseOrZero(0)).toEqual(true);
            expect($mmUtil.isFalseOrZero('0')).toEqual(true);
            expect($mmUtil.isFalseOrZero(false)).toEqual(true);
            expect($mmUtil.isFalseOrZero()).toEqual(false);
            expect($mmUtil.isFalseOrZero('false')).toEqual(false);
            expect($mmUtil.isFalseOrZero(true)).toEqual(false);
            expect($mmUtil.isFalseOrZero(1)).toEqual(false);
            expect($mmUtil.isFalseOrZero(-1)).toEqual(false);
        });

    });

    describe('isTrueOrOne', function() {

        it('should be able to identify if it is true or one', function() {
            expect($mmUtil.isTrueOrOne(1)).toEqual(true);
            expect($mmUtil.isTrueOrOne('1')).toEqual(true);
            expect($mmUtil.isTrueOrOne(true)).toEqual(true);
            expect($mmUtil.isTrueOrOne()).toEqual(false);
            expect($mmUtil.isTrueOrOne('true')).toEqual(false);
            expect($mmUtil.isTrueOrOne(false)).toEqual(false);
            expect($mmUtil.isTrueOrOne(0)).toEqual(false);
            expect($mmUtil.isTrueOrOne(2)).toEqual(false);
        });

    });

    describe('formatTime', function() {

        it('should return now if 0 seconds or not specified', function(done) {
            $mmUtil.formatTime().then(function(result) {
                expect(result).toEqual('now');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $mmUtil.formatTime(0).then(function(result) {
                expect(result).toEqual('now');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should convert 1 second in singular', function(done) {
            var promise;
            promise = $mmUtil.formatTime(1);
            promise.then(function(result) {
                expect(result).toEqual('1 sec');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should convert several seconds in plural', function(done) {
            var promise;
            promise = $mmUtil.formatTime(10);
            promise.then(function(result) {
                expect(result).toEqual('10 secs');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should return minutes and seconds if more than 60 seconds', function(done) {
            var promise;
            promise = $mmUtil.formatTime(100);
            promise.then(function(result) {
                expect(result).toEqual('1 min 40 secs');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should return days and hours if more than 24 hours', function(done) {
            var promise;
            promise = $mmUtil.formatTime(100001);
            promise.then(function(result) {
                expect(result).toEqual('1 day 3 hours');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should return years and days if more than 365 days', function(done) {
            var promise;
            promise = $mmUtil.formatTime(100000001);
            promise.then(function(result) {
                expect(result).toEqual('3 years 62 days');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

        it('should handle negative numbers as if they were positive', function(done) {
            var promise;
            promise = $mmUtil.formatTime(-100001);
            promise.then(function(result) {
                expect(result).toEqual('1 day 3 hours');
            }).catch(function() {
                expect(false).toBe(true);
            }).finally(done);

            $timeout.flush();
        });

    });

});
