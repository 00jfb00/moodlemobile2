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

describe('$mmFilepool', function() {
    var $mmFilepool,
        $timeout,
        $mmSitesManager,
        $q,
        siteid = 'filepool_site_' + Math.floor((Math.random() * 100000));

    /**
     * Convenience function to add a file to the pool.
     *
     * @param {String} fileurl File URL.
     * @param {Object} data    Data to store in the pool.
     * @return {Promise}       Promise resolved with the file ID in success.
     */
    function addFileToPool(fileurl, data) {
        return $mmFilepool._fixPluginfileURL(siteid, fileurl).then(function(fixedUrl) {
            var fileid = $mmFilepool._getFileIdByUrl(fixedUrl);
            return $mmFilepool._addFileToPool(siteid, fileid, data).then(function() {
                return fileid;
            });
        });
    }

    /**
     * Add a list of files to the pool, and also add their links.
     *
     * @param {Object[]} files List of files. Each file needs to have a url and, optionally, a list of links.
     * @return {Promise}       Promise resolved in success.
     */
    function addAllFilesToPoolWithLinks(files) {
        var promises = [];
        angular.forEach(files, function(file) {
            promises.push(addFileToPool(file.url).then(function(fileid) {
                file.id = fileid;
                if (file.links && file.links.length) {
                    return $mmFilepool._addFileLinks(siteid, fileid, file.links);
                }
            }));
        });
        return $q.all(promises);
    }

    /**
     * Validate that the files states are the right ones.
     *
     * @param  {Object[]} files List of files. Each file needs to have a url and a finalState.
     * @return {Promise}        Promise resolved when all checks are finished.
     */
    function validateFilesStates(files) {
        var promises = [];
        angular.forEach(files, function(file) {
            promises.push($mmFilepool.getFileStateByUrl(siteid, file.url).then(function(state) {
                expect(state).toEqual(file.finalState);
            }));
        });
        return $q.all(promises);
    }

    /**
     * Check if a file is in the filepool and has links to a component.
     *
     * @param  {String} fileid        File ID.
     * @param  {String} component     Component.
     * @param  {String} [componentId] Component ID.
     * @return {Promise}              Promise resolved when the check is finished. Never rejected.
     */
    function isFileNotDeleted(fileid, component, componentId) {
        return $mmFilepool._hasFileInPool(siteid, fileid).then(function() {
            return $mmFilepool.componentHasFiles(siteid, component, componentId);
        }).catch(function() {
            expect(false).toEqual(true);
        });
    }

    /**
     * Check if a file is not in the filepool and it hasn't links to a component.
     *
     * @param  {String} fileid        File ID.
     * @param  {String} component     Component.
     * @param  {String} [componentId] Component ID.
     * @return {Promise}              Promise resolved when the check is finished. Never rejected.
     */
    function isFileDeleted(fileid, component, componentId) {
        return $mmFilepool._hasFileInPool(siteid, fileid).then(function() {
            expect(false).toEqual(true);
        }).catch(function() {
            return $mmFilepool.componentHasFiles(siteid, component, componentId).then(function() {
                expect(false).toEqual(true);
            }).catch(function() {
                // Success.
            });
        });
    }

    // Injecting.
    beforeEach(module('mm.core'));

    beforeEach(inject(function(_$mmFilepool_, $httpBackend, _$timeout_, _$mmSitesManager_, _$q_) {
        $mmFilepool = _$mmFilepool_;
        $timeout = _$timeout_;
        $mmSitesManager = _$mmSitesManager_;
        $q = _$q_;

        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.whenGET(/config.json/).respond(200, {});

    }));

    beforeEach(function(done) {
        // Create a fake site.
        $mmSitesManager.addSite(siteid, 'siteurl', 'token', {}).then(function() {
            done();
        });
        mmFlush($timeout.flush, 100);
    });

    afterEach(function(done) {
        // Delete the fake site.
        var interval = mmInterval($timeout.flush, 200); // Delete site has several async calls, use an interval.
        $mmSitesManager.deleteSite(siteid).finally(function() {
            interval.stop();
            done();
        });
        interval.start();
    });

    describe('addFileLinkByUrl/componentHasFiles', function() {

        it('should be able to add links and detect them', function(done) {
            console.log(' ***** START $mmFilepool addFileLinkByUrl/componentHasFiles ***** ');
            var component = 'my_component',
                interval = mmInterval($timeout.flush, 100); // Each addFileLinkByUrl has more than 1 async call, use an interval.

            $mmFilepool.addFileLinkByUrl(siteid, 'url', component, 1).then(function() {

                // Check that the component now has a link.
                return $mmFilepool.componentHasFiles(siteid, component).then(function() {

                    // Check that it can also be checked using component and ID.
                    return $mmFilepool.componentHasFiles(siteid, component, 1).then(function() {

                        // Finally, check that if we use a different ID or component it fails.
                        return $mmFilepool.componentHasFiles(siteid, component, 2).then(function() {
                            expect(true).toEqual(false);
                        }).catch(function() {
                            // Success.
                            return $mmFilepool.componentHasFiles(siteid, 'some_other_component').then(function() {
                                expect(true).toEqual(false);
                            }).catch(function() {
                                // Success.
                            });
                        });
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool addFileLinkByUrl/componentHasFiles ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

    });

    describe('_addFileLinks', function() {

        it('should be able to add several links with a single call', function(done) {
            console.log(' ***** START $mmFilepool _addFileLinks ***** ');
            var links = [{
                    component: 'first_component',
                    componentId: 1
                }, {
                    component: 'first_component',
                    componentId: 2
                },{
                    component: 'second_component',
                    componentId: 3
                }],
                interval = mmInterval($timeout.flush, 100);

            $mmFilepool._addFileLinks(siteid, 'fileid', links).then(function() {

                // Check that the all the links were added.
                var promises = [];
                angular.forEach(links, function(link) {
                    promises.push($mmFilepool.componentHasFiles(siteid, link.component, link.componentId));
                });
                return $q.all(promises);
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool _addFileLinks ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

    });

    describe('_addFileToPool/_hasFileInPool', function() {

        it('should be able to add a file to the pool and check it has been added', function(done) {
            console.log(' ***** START $mmFilepool _addFileToPool/_hasFileInPool ***** ');
            var fileid = 'fileid',
                interval = mmInterval($timeout.flush, 100);

            $mmFilepool._addFileToPool(siteid, fileid, {}).then(function() {

                // Check that the file was added.
                return $mmFilepool._hasFileInPool(siteid, fileid).then(function() {

                    // Now check that checking another file fails.
                    return $mmFilepool._hasFileInPool(siteid, 'some_other_id').then(function() {
                        expect(false).toEqual(true);
                    }).catch(function() {
                        // Success.
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool _addFileToPool/_hasFileInPool ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

    });

    describe('_getFileIdByUrl', function() {

        it('should create unique IDs and make IDs independent of params like token and revision', function() {
            console.log(' ***** START _getFileIdByUrl ***** ');
            var ids = [];

            function validateId(url, shouldExist) {
                var id = $mmFilepool._getFileIdByUrl(url);
                expect(typeof(id)).toEqual('string');
                if (shouldExist) {
                    expect(ids.indexOf(id)).not.toEqual(-1);
                } else {
                    expect(ids.indexOf(id)).toEqual(-1);
                    ids.push(id);
                }
            }

            validateId('some_random_string');
            validateId('http://mymoodle.net/webservice/pluginfile.php/index.html');

            // Check that URL is independent of revision and extra params.
            validateId('http://mymoodle.net/webservice/pluginfile.php/1/mod_resource/content/1/index.html');
            validateId('http://mymoodle.net/webservice/pluginfile.php/1/mod_resource/content/5/index.html', true);
            validateId('http://mymoodle.net/webservice/pluginfile.php/1/mod_resource/content/5/index.html?forcedownload=1', true);
            validateId('http://mymoodle.net/webservice/pluginfile.php/1/mod_resource/content/5/index.html?token=blabla', true);
            validateId('http://mymoodle.net/webservice/pluginfile.php/1/mod_resource/content/5/index.html?token=blabla&forcedownload=1', true);
            console.log(' ***** FINISH _getFileIdByUrl ***** ');
        });

    });

    describe('addToQueueByUrl/_hasFileInQueue', function() {

        it('should be able to add a file to the queue and check it has been added', function(done) {
            console.log(' ***** START $mmFilepool addToQueueByUrl/_hasFileInQueue ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                links = [{
                    component: 'first_component',
                    componentId: 1
                }],
                fileid,
                interval = mmInterval($timeout.flush, 100);

            $mmFilepool._fixPluginfileURL(siteid, fileUrl).then(function(fixedUrl) {

                return $mmFilepool.addToQueueByUrl(siteid, fileUrl, links[0].component, links[0].componentId).then(function() {

                    // Check that the file was added.
                    fileid = $mmFilepool._getFileIdByUrl(fixedUrl);
                    return $mmFilepool._hasFileInQueue(siteid, fileid).then(function(data) {
                        expect(data.siteId).toEqual(siteid);
                        expect(data.fileId).toEqual(fileid);
                        expect(data.url).toEqual(fixedUrl);
                        expect(data.links).toEqual(links);

                        // Now check that checking another file fails.
                        return $mmFilepool._hasFileInPool(siteid, 'some_other_id').then(function() {
                            expect(false).toEqual(true);
                        }).catch(function() {
                            // Success.
                        });
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                // We need to remove it from queue manually, queue is in APP DB not in Site DB.
                var promise = fileid ? $mmFilepool._removeFromQueue(siteid, fileid) : $q.when();
                promise.then(function() {
                    console.log(' ***** FINISH $mmFilepool addToQueueByUrl/_hasFileInQueue ***** ');
                    interval.stop();
                    done();
                });
            });

            interval.start();

        });

        it('should update the stored data if a file is added to queue twice', function(done) {
            console.log(' ***** START $mmFilepool addToQueueByUrl/_hasFileInQueue - update ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                links = [{
                    component: 'first_component',
                    componentId: 1
                }, {
                    component: 'first_component',
                    componentId: 2
                }],
                fileid,
                newTimeModified = new Date().getTime(),
                interval = mmInterval($timeout.flush, 100);

            // Function to sort arrays of sites.
            function sortByComponent(a, b) {
                if (a.component == b.component) {
                    return a.componentId > b.componentId;
                } else {
                    return a.component > b.component;
                }
            }

            $mmFilepool._fixPluginfileURL(siteid, fileUrl).then(function(fixedUrl) {

                // Add file for the first time with first component and timemodified=0.
                return $mmFilepool.addToQueueByUrl(siteid, fileUrl, links[0].component, links[0].componentId, 0).then(function() {

                    // Add file again with second component and timemodified=newTimeModified.
                    return $mmFilepool.addToQueueByUrl(siteid, fileUrl, links[1].component, links[1].componentId, newTimeModified).then(function() {

                        // Check that the file was added.
                        fileid = $mmFilepool._getFileIdByUrl(fixedUrl);
                        return $mmFilepool._hasFileInQueue(siteid, fileid).then(function(data) {
                            expect(data.siteId).toEqual(siteid);
                            expect(data.fileId).toEqual(fileid);
                            expect(data.url).toEqual(fixedUrl);
                            expect(data.timemodified).toEqual(newTimeModified);
                            expect(data.links.sort(sortByComponent)).toEqual(links.sort(sortByComponent));
                        });
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                // We need to remove it from queue manually, queue is in APP DB not in Site DB.
                var promise = fileid ? $mmFilepool._removeFromQueue(siteid, fileid) : $q.when();
                promise.then(function() {
                    console.log(' ***** FINISH $mmFilepool addToQueueByUrl/_hasFileInQueue - update ***** ');
                    interval.stop();
                    done();
                });
            });

            interval.start();

        });

    });

    describe('_removeFromQueue', function() {

        it('should be able to remove a file from the queue', function(done) {
            console.log(' ***** START $mmFilepool _removeFromQueue ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                component = 'first_component',
                componentId = 1,
                interval = mmInterval($timeout.flush, 100);

            $mmFilepool._fixPluginfileURL(siteid, fileUrl).then(function(fixedUrl) {

                return $mmFilepool.addToQueueByUrl(siteid, fileUrl, component, componentId).then(function() {

                    // Check that the file was added.
                    var fileid = $mmFilepool._getFileIdByUrl(fixedUrl);
                    return $mmFilepool._hasFileInQueue(siteid, fileid).then(function(data) {
                        expect(data.siteId).toEqual(siteid);
                        expect(data.fileId).toEqual(fileid);

                        // Now remove it and check it was removed.
                        return $mmFilepool._removeFromQueue(siteid, fileid).then(function() {
                            return $mmFilepool._hasFileInPool(siteid, fileid).then(function() {
                                expect(false).toEqual(true);
                            }).catch(function() {
                                // Success.
                            });
                        });
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool _removeFromQueue ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

    });

    describe('getRevisionFromUrl', function() {

        it('should return revision', function() {
            console.log(' ***** START $mmFilepool getRevisionFromUrl ***** ');
            var urls = [{
                    url: 'http://mymoodle.net/pluginfile.php/content/1/file.pdf',
                    revision: 1
                },{
                    url: 'http://mymoodle.net/pluginfile.php/content/1000/file.pdf',
                    revision: 1000
                },{
                    url: 'http://mymoodle.net/pluginfile.php/file.pdf',
                    revision: undefined
                }];
            angular.forEach(urls, function(url) {
                expect($mmFilepool.getRevisionFromUrl(url.url)).toEqual(url.revision);
            });
            console.log(' ***** FINISH $mmFilepool getRevisionFromUrl ***** ');
        });

    });

    describe('_removeRevisionFromUrl', function() {

        it('should return an URL without revision', function() {
            console.log(' ***** START $mmFilepool _removeRevisionFromUrl ***** ');
            var urls = [{
                    url: 'http://mymoodle.net/pluginfile.php/content/1/file.pdf',
                    urlWithoutRevision: 'http://mymoodle.net/pluginfile.php/content/0/file.pdf'
                },{
                    url: 'http://mymoodle.net/pluginfile.php/content/1000/file.pdf',
                    urlWithoutRevision: 'http://mymoodle.net/pluginfile.php/content/0/file.pdf'
                },{
                    url: 'http://mymoodle.net/pluginfile.php/file.pdf',
                    urlWithoutRevision: 'http://mymoodle.net/pluginfile.php/file.pdf'
                }];
            angular.forEach(urls, function(url) {
                expect($mmFilepool._removeRevisionFromUrl(url.url)).toEqual(url.urlWithoutRevision);
            });
            console.log(' ***** FINISH $mmFilepool _removeRevisionFromUrl ***** ');
        });

    });

    describe('_isFileOutdated', function() {

        it('should detect if a file is outdated', function() {
            console.log(' ***** START $mmFilepool _isFileOutdated ***** ');
            // Stale files are outdated.
            expect($mmFilepool._isFileOutdated({stale: true})).toEqual(true);
            // New revision is higher.
            expect($mmFilepool._isFileOutdated({revision: 0}, 1)).toEqual(true);
            // New time modified is higher.
            expect($mmFilepool._isFileOutdated({timemodified: 0}, 0, 1)).toEqual(true);
            // Is not outdated otherwise.
            expect($mmFilepool._isFileOutdated({})).toEqual(false);
            expect($mmFilepool._isFileOutdated({stale: false})).toEqual(false);
            expect($mmFilepool._isFileOutdated({revision: 0}, 0)).toEqual(false);
            expect($mmFilepool._isFileOutdated({timemodified: 0}, 0, 0)).toEqual(false);
            console.log(' ***** FINISH $mmFilepool _isFileOutdated ***** ');
        });

    });

    describe('getFileStateByUrl', function() {

        it('should detect a file as not downloaded by default', function(done) {
            console.log(' ***** START $mmFilepool getFileStateByUrl - not downloaded ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                interval = mmInterval($timeout.flush, 100);

            $mmFilepool.getFileStateByUrl(siteid, fileUrl).then(function(state) {
                expect(state).toEqual($mmFilepool.FILENOTDOWNLOADED);
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool getFileStateByUrl - not downloaded ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

        it('should detect file downloading if it\'s in queue', function(done) {
            console.log(' ***** START $mmFilepool getFileStateByUrl - downloading ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                fileid,
                interval = mmInterval($timeout.flush, 100);

            $mmFilepool._fixPluginfileURL(siteid, fileUrl).then(function(fixedUrl) {
                fileid = $mmFilepool._getFileIdByUrl(fixedUrl);
                return $mmFilepool.addToQueueByUrl(siteid, fileUrl).then(function() {
                    return $mmFilepool.getFileStateByUrl(siteid, fileUrl).then(function(state) {
                        expect(state).toEqual($mmFilepool.FILEDOWNLOADING);
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                // We need to remove it from queue manually, queue is in APP DB not in Site DB.
                var promise = fileid ? $mmFilepool._removeFromQueue(siteid, fileid) : $q.when();
                promise.then(function() {
                    console.log(' ***** FINISH $mmFilepool getFileStateByUrl - downloading ***** ');
                    interval.stop();
                    done();
                });
            });

            interval.start();

        });

        it('should detect file downloaded if it\'s in pool and not outdated', function(done) {
            console.log(' ***** START $mmFilepool getFileStateByUrl - downloaded ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                interval = mmInterval($timeout.flush, 100);

            addFileToPool(fileUrl, {}).then(function() {
                return $mmFilepool.getFileStateByUrl(siteid, fileUrl).then(function(state) {
                    expect(state).toEqual($mmFilepool.FILEDOWNLOADED);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool getFileStateByUrl - downloaded ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

        it('should detect file outdated if it\'s stale', function(done) {
            console.log(' ***** START $mmFilepool getFileStateByUrl - outdated stale ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                interval = mmInterval($timeout.flush, 100);

            addFileToPool(fileUrl, {stale: true}).then(function() {
                return $mmFilepool.getFileStateByUrl(siteid, fileUrl).then(function(state) {
                    expect(state).toEqual($mmFilepool.FILEOUTDATED);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool getFileStateByUrl - outdated stale ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

        it('should detect file outdated if revision is higher', function(done) {
            console.log(' ***** START $mmFilepool getFileStateByUrl - outdated revision ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/content/1/file.pdf', // revision = 1.
                interval = mmInterval($timeout.flush, 100);

            addFileToPool(fileUrl, {revision: 0}).then(function() {
                return $mmFilepool.getFileStateByUrl(siteid, fileUrl).then(function(state) {
                    expect(state).toEqual($mmFilepool.FILEOUTDATED);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool getFileStateByUrl - outdated revision ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

        it('should detect file outdated if timemodified is higher', function(done) {
            console.log(' ***** START $mmFilepool getFileStateByUrl - outdated revision ***** ');
            var fileUrl = 'http://mymoodle.net/pluginfile.php/file.pdf',
                interval = mmInterval($timeout.flush, 100);

            addFileToPool(fileUrl, {timemodified: 0}).then(function() {
                return $mmFilepool.getFileStateByUrl(siteid, fileUrl, 1).then(function(state) {
                    expect(state).toEqual($mmFilepool.FILEOUTDATED);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool getFileStateByUrl - outdated revision ***** ');
                interval.stop();
                done();
            });

            interval.start();

        });

    });

    describe('_guessExtensionFromUrl', function() {

        it('should guess extension from Url', function() {
            console.log(' ***** START $mmFilepool _guessExtensionFromUrl ***** ');
            var urls = [{
                    url: 'http://mymoodle.net/file.jpg',
                    extension: 'jpg'
                },{
                    url: 'http://mymoodle.net/pluginfile.php/file.pdf',
                    extension: 'pdf'
                },{
                    url: 'invalidurl',
                    revision: undefined
                }];
            angular.forEach(urls, function(url) {
                expect($mmFilepool._guessExtensionFromUrl(url.url)).toEqual(url.extension);
            });
            console.log(' ***** FINISH $mmFilepool _guessExtensionFromUrl ***** ');
        });

    });

    describe('invalidateAllFiles', function() {

        it('should invalidate all the files in a site', function(done) {
            console.log(' ***** START $mmFilepool invalidateAllFiles ***** ');

            var urls = ['http://mymoodle.net/pluginfile.php/file.pdf', 'http://mymoodle.net/pluginfile.php/image.jpg'],
                interval = mmInterval($timeout.flush, 100);

            // Add a couple of files to the pool.
            addFileToPool(urls[0], {}).then(function() {
                return addFileToPool(urls[1], {}).then(function() {

                    // Invalidate them.
                    return $mmFilepool.invalidateAllFiles(siteid).then(function() {

                        // Check that they're outdated.
                        return $mmFilepool.getFileStateByUrl(siteid, urls[0]).then(function(state) {
                            expect(state).toEqual($mmFilepool.FILEOUTDATED);
                            return $mmFilepool.getFileStateByUrl(siteid, urls[1]).then(function(state) {
                                expect(state).toEqual($mmFilepool.FILEOUTDATED);
                            });
                        });
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool invalidateAllFiles ***** ');
                interval.stop();
                done();
            });

            interval.start();
        });

    });

    describe('invalidateFileByUrl', function() {

        it('should invalidate a file by url', function(done) {
            console.log(' ***** START $mmFilepool invalidateFileByUrl ***** ');

            var urls = ['http://mymoodle.net/pluginfile.php/file.pdf', 'http://mymoodle.net/pluginfile.php/image.jpg'],
                interval = mmInterval($timeout.flush, 100);

            // Add a couple of files to the pool.
            addFileToPool(urls[0], {}).then(function() {
                return addFileToPool(urls[1], {}).then(function() {

                    // Invalidate only the first one.
                    return $mmFilepool.invalidateFileByUrl(siteid, urls[0]).then(function() {

                        // Check that the invalidated file is outdated and the other one isn't.
                        return $mmFilepool.getFileStateByUrl(siteid, urls[0]).then(function(state) {
                            expect(state).toEqual($mmFilepool.FILEOUTDATED);
                            return $mmFilepool.getFileStateByUrl(siteid, urls[1]).then(function(state) {
                                expect(state).toEqual($mmFilepool.FILEDOWNLOADED);
                            });
                        });
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool invalidateFileByUrl ***** ');
                interval.stop();
                done();
            });

            interval.start();
        });

    });

    describe('invalidateFilesByComponent', function() {

        it('should invalidate all files belonging to a component if no ID specified', function(done) {
            console.log(' ***** START $mmFilepool invalidateFilesByComponent ***** ');

            var files = [{
                    url: 'http://mymoodle.net/pluginfile.php/file.pdf',
                    links: [{
                        component: 'first_component',
                        componentId: 1
                    }],
                    finalState: $mmFilepool.FILEOUTDATED
                }, {
                    url: 'http://mymoodle.net/pluginfile.php/image.jpg',
                    links: [{
                        component: 'first_component',
                        componentId: 2
                    }],
                    finalState: $mmFilepool.FILEOUTDATED
                }, {
                    url: 'http://mymoodle.net/pluginfile.php/index.html',
                    links: [{
                        component: 'second_component',
                        componentId: 3
                    }],
                    finalState: $mmFilepool.FILEDOWNLOADED
                }],
                interval = mmInterval($timeout.flush, 100);

            // Add files to the pool and links to components.
            addAllFilesToPoolWithLinks(files).then(function() {

                // Invalidate the first component.
                return $mmFilepool.invalidateFilesByComponent(siteid, files[0].links[0].component).then(function() {

                    // Check that the right files were invalidated.
                    return validateFilesStates(files);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool invalidateFilesByComponent ***** ');
                interval.stop();
                done();
            });

            interval.start();
        });

        it('should invalidate all files belonging to a component and have a certain ID if specified', function(done) {
            console.log(' ***** START $mmFilepool invalidateFilesByComponent - componentId ***** ');

            var files = [{
                    url: 'http://mymoodle.net/pluginfile.php/file.pdf',
                    links: [{
                        component: 'first_component',
                        componentId: 1
                    }],
                    finalState: $mmFilepool.FILEOUTDATED
                }, {
                    url: 'http://mymoodle.net/pluginfile.php/image.jpg',
                    links: [{
                        component: 'first_component',
                        componentId: 2
                    }],
                    finalState: $mmFilepool.FILEDOWNLOADED
                }, {
                    url: 'http://mymoodle.net/pluginfile.php/index.html',
                    links: [{
                        component: 'second_component',
                        componentId: 3
                    }],
                    finalState: $mmFilepool.FILEDOWNLOADED
                }],
                interval = mmInterval($timeout.flush, 100);

            // Add files to the pool and links to components.
            addAllFilesToPoolWithLinks(files).then(function() {

                // Invalidate the first component and componentId.
                return $mmFilepool.invalidateFilesByComponent(siteid, files[0].links[0].component, files[0].links[0].componentId).then(function() {

                    // Check that the right files were invalidated.
                    return validateFilesStates(files);
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool invalidateFilesByComponent - componentId ***** ');
                interval.stop();
                done();
            });

            interval.start();
        });

    });

    describe('_removeFileById', function() {

        it('should remove a file from the pool and all its links', function(done) {
            console.log(' ***** START $mmFilepool _removeFileById ***** ');

            var files = [{
                    url: 'http://mymoodle.net/pluginfile.php/file.pdf',
                    links: [{
                        component: 'first_component',
                        componentId: 1
                    }]
                }, {
                    url: 'http://mymoodle.net/pluginfile.php/image.jpg',
                    links: [{
                        component: 'first_component',
                        componentId: 2
                    }]
                }],
                interval = mmInterval($timeout.flush, 100);

            // Add files to the pool and links to components.
            addAllFilesToPoolWithLinks(files).then(function() {

                // Delete the first file.
                return $mmFilepool._removeFileById(siteid, files[0].id).then(function() {

                    // Check that the right file was deleted.
                    return isFileDeleted(files[0].id, files[0].links[0].component, files[0].links[0].componentId).then(function() {
                        return isFileNotDeleted(files[1].id, files[1].links[0].component, files[1].links[0].componentId);
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool _removeFileById ***** ');
                interval.stop();
                done();
            });

            interval.start();
        });

    });

    describe('removeFilesByComponent', function() {

        it('should remove all files linked to a component', function(done) {
            console.log(' ***** START $mmFilepool removeFilesByComponent ***** ');

            var files = [{
                    url: 'http://mymoodle.net/pluginfile.php/file.pdf',
                    links: [{
                        component: 'first_component',
                        componentId: 1
                    }]
                }, {
                    url: 'http://mymoodle.net/pluginfile.php/image.jpg',
                    links: [{
                        component: 'first_component',
                        componentId: 2
                    }]
                }, {
                    url: 'http://mymoodle.net/pluginfile.php/index.html',
                    links: [{
                        component: 'second_component',
                        componentId: 3
                    }]
                }],
                interval = mmInterval($timeout.flush, 100);

            // Add files to the pool and links to components.
            addAllFilesToPoolWithLinks(files).then(function() {

                // Delete first component.
                return $mmFilepool.removeFilesByComponent(siteid, files[0].links[0].component).then(function() {

                    // Check that the right files were deleted.
                    return isFileDeleted(files[0].id, files[0].links[0].component, files[0].links[0].componentId).then(function() {
                        return isFileDeleted(files[1].id, files[1].links[0].component, files[1].links[0].componentId).then(function() {
                            return isFileNotDeleted(files[2].id, files[2].links[0].component, files[2].links[0].componentId);
                        });
                    });
                });
            }).catch(function() {
                expect(false).toEqual(true);
            }).finally(function() {
                console.log(' ***** FINISH $mmFilepool removeFilesByComponent ***** ');
                interval.stop();
                done();
            });

            interval.start();
        });

    });

});
