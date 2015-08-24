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

describe('$mmFS', function() {
    var $mmFS,
        $timeout;

    // Injecting.
    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmFS_, $httpBackend, _$timeout_) {
        $mmFS = _$mmFS_;
        $timeout = _$timeout_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});
    }));

    describe('isAvailable', function() {

        it('should be able to tell if cordova file plugin is available', function() {
            console.log(' ***** START $mmFS isAvailable ***** ');
            // Should return false in browser by default.
            expect($mmFS.isAvailable()).toEqual(false);
            // Let's manually set.
            window.cordova = {
                file: {}
            };
            expect($mmFS.isAvailable()).toEqual(true);
            delete window.cordova;
            console.log(' ***** FINISH $mmFS isAvailable ***** ');
        });

    });

    describe('init', function() {

        it('should fail in browser', function(done) {
            console.log(' ***** START $mmFS init - fail ***** ');
            // Should fail in browser by default.
            $mmFS.init().then(function() {
                expect(false).toEqual(true);
            }).catch(function() {
                // Success.
            }).finally(function() {
                console.log(' ***** FINISH $mmFS init - fail ***** ');
                done();
            });

            mmFlush($timeout.flush, 100);
        });

        it('should init with externalApplicationStorageDirectory in Android', function(done) {
            console.log(' ***** START $mmFS init - android ***** ');
            var originalAndroid = ionic.Platform.isAndroid,
                androidFakePath = 'android_fake_path/';

            // Simulate Android and check that the basePath is the right one.
            window.cordova = {
                file: {
                    externalApplicationStorageDirectory: androidFakePath
                }
            };

            ionic.Platform.isAndroid = function() {
                return true;
            };

            $mmFS.init().then(function() {
                mmFlush($timeout.flush, 100);
                return $mmFS.getBasePath().then(function(path) {
                    expect(path).toEqual(androidFakePath);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFS init - android ***** ');
                ionic.Platform.isAndroid = originalAndroid;
                delete window.cordova;
                done();
            });

            mmFlush($timeout.flush, 100);
        });

        it('should init with documentsDirectory in iOS', function(done) {
            console.log(' ***** START $mmFS init - ios ***** ');
            var originalIOS = ionic.Platform.isIOS,
                iosFakePath = 'ios_fake_path/';

            // Simulate Android and check that the basePath is the right one.
            window.cordova = {
                file: {
                    documentsDirectory: iosFakePath
                }
            };

            ionic.Platform.isIOS = function() {
                return true;
            };

            $mmFS.init().then(function() {
                mmFlush($timeout.flush, 100);
                return $mmFS.getBasePath().then(function(path) {
                    expect(path).toEqual(iosFakePath);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFS init - ios ***** ');
                ionic.Platform.isIOS = originalIOS;
                delete window.cordova;
                done();
            });

            mmFlush($timeout.flush, 100);
        });

    });

    describe('normalizeFileName', function() {

        it('should normalize filenames', function() {
            console.log(' ***** START $mmFS normalizeFileName ***** ');
            expect($mmFS.normalizeFileName('file:///foler_name/file_name.pdf')).toEqual('file:///foler_name/file_name.pdf');
            expect($mmFS.normalizeFileName('file%3A%2F%2F%2Ffoler_name%2Ffile_name.pdf')).toEqual('file:///foler_name/file_name.pdf');
            console.log(' ***** FINISH $mmFS normalizeFileName ***** ');
        });

    });

    describe('getFileAndDirectoryFromPath', function() {

        it('should get the file and the directory from a path', function() {
            console.log(' ***** START $mmFS getFileAndDirectoryFromPath ***** ');
            var result;
            result = $mmFS.getFileAndDirectoryFromPath('some/folders/and/a/file.pdf');
            expect(result.directory).toEqual('some/folders/and/a');
            expect(result.name).toEqual('file.pdf');
            console.log(' ***** FINISH $mmFS getFileAndDirectoryFromPath ***** ');
        });

    });

    describe('concatenatePaths', function() {

        it('should concatenate two paths with a single slash between them', function() {
            console.log(' ***** START $mmFS concatenatePaths ***** ');
            var path1 = 'path/1/folder',
                path2 = 'path/2/folder/and/file.pdf';
                concatenated = path1 + '/' + path2;

            expect($mmFS.concatenatePaths(path1, path2)).toEqual(concatenated);
            expect($mmFS.concatenatePaths(path1 + '/', path2)).toEqual(concatenated);
            expect($mmFS.concatenatePaths(path1, '/' + path2)).toEqual(concatenated);
            expect($mmFS.concatenatePaths(path1 + '/', '/' + path2)).toEqual(concatenated);
            console.log(' ***** FINISH $mmFS concatenatePaths ***** ');
        });

    });

});
