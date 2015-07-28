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
    var $mmUtil, $timeout, $httpBackend;

    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmUtil_, _$timeout_, _$httpBackend_, $q) {
        $mmUtil = _$mmUtil_;
        $timeout = _$timeout_;
        $httpBackend = _$httpBackend_;

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

});
