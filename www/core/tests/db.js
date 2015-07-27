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

describe('$mmDB', function() {
    var mmDB,
        timeout,
        q,
        dbname = 'randomname' + Math.round(Math.random() * 1000000),
        storeName = 'db_fake_store_name',
        dbschema = {
            stores: [{
                name: storeName,
                keyPath: 'id',
                indexes: [
                    {
                        name: 'name',
                        name: 'type'
                    }
                ]
            }]
        },
        dboptions = {
            autoSchema: true
        };

    // Injecting.
    beforeEach(module('mm.core'));

    beforeEach(inject(function($mmDB, $httpBackend, $timeout, $q) {
        mmDB = $mmDB;
        timeout = $timeout;
        q = $q;

        // Capture loading of templates and json files.
        $httpBackend.whenGET(/.*\/templates.*/).respond(200, '');
        $httpBackend.whenGET(/build.*/).respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/).respond(200, '');
        $httpBackend.when('GET', 'config.json').respond(200, {'app_id': 'com.moodle.moodlemobile'});
    }));

    it('a DB name can be retrieved', function() {
        var db = mmDB.getDB(dbname, dbschema, dboptions);
        expect(db.getName()).toEqual(dbname);
    });

    it('DB allows inserting/retrieving entries by ID', function(done) {
        var db = mmDB.getDB(dbname, dbschema, dboptions),
            randomid = 'randomid' + Math.round(Math.random() * 1000000),
            randomname = 'randomname' + Math.round(Math.random() * 1000000);

        // Insert an entry.
        db.insert(storeName, {id: randomid, name: randomname}).then(function() {
            // Retrieve the inserted entry.
            setTimeout(timeout.flush, 100);
            return db.get(storeName, randomid).then(function(entry) {
                expect(entry.name).toEqual(randomname);
            });
        }).catch(function() {
            // Failed test.
            expect(false).toEqual(true);
        }).finally(function() {
            // Clear DB to have a clean DB for next tests (or re-execute this one).
            db.removeAll(storeName).then(function() {
                done();
            });
            setTimeout(timeout.flush, 100);
        });

        setTimeout(timeout.flush, 100);
    });

    it('DB allows removing all entries in a store', function(done) {
        var db = mmDB.getDB(dbname, dbschema, dboptions),
            randomid = 'randomid' + Math.round(Math.random() * 1000000),
            randomname = 'randomname' + Math.round(Math.random() * 1000000);

        // Insert an entry.
        db.insert(storeName, {id: randomid, name: randomname}).then(function() {
            // Remove all entries in DB.
            setTimeout(timeout.flush, 100);
            return db.removeAll(storeName).then(function() {
                // Try to get the stored entry.
                setTimeout(timeout.flush, 100);
                return db.get(storeName, randomid).then(function(entry) {
                    // Entry shouldn't be there, test failed.
                    expect(true).toEqual(false);
                }).catch(function() {
                    // Success.
                });
            });
        }).catch(function() {
            // Failed test.
            expect(false).toEqual(true);
        }).finally(function() {
            done();
        });

        setTimeout(timeout.flush, 100);
    });

    it('DB allows counting all entries in a store, or count entries with some conditions', function(done) {
        var db = mmDB.getDB(dbname, dbschema, dboptions),
            promises = [],
            idsUsed = [];

        // Insert 10 items in DB, with different types.
        for (var i = 0; i < 10; i++) {
            var randomid = 'randomid' + Math.round(Math.random() * 1000000),
                randomname = 'randomname' + Math.round(Math.random() * 1000000),
                type = i < 4 ? 'male' : 'female';
            while (idsUsed.indexOf(randomid) != -1) {
                // ID already used, get another one.
                randomid = 'randomid' + Math.round(Math.random() * 1000000);
            }
            promises.push(db.insert(storeName, {id: randomid, name: randomname, type: type}));
        }

        q.all(promises).then(function() {
            // Count entries.
            setTimeout(timeout.flush, 100);
            return db.count(storeName).then(function(count) {
                expect(count).toEqual(10);

                // Count entries of type "male".
                setTimeout(timeout.flush, 100);
                return db.count(storeName, ['type', '=', 'male']).then(function(count) {
                    expect(count).toEqual(4);
                });
            });
        }).catch(function() {
            // Failed test.
            expect(false).toEqual(true);
        }).finally(function() {
            // Clear DB to have a clean DB for next tests (or re-execute this one).
            db.removeAll(storeName).then(function() {
                done();
            });
            setTimeout(timeout.flush, 100);
        });

        setTimeout(timeout.flush, 100);
    });

    it('DB allows querying and ordering', function(done) {
        var db = mmDB.getDB(dbname, dbschema, dboptions),
            promises = [],
            idsUsed = [];

        // Insert 10 items in DB, with different types.
        for (var i = 0; i < 10; i++) {
            var randomid = 'randomid' + Math.round(Math.random() * 1000000),
                randomname = 'randomname' + Math.round(Math.random() * 1000000),
                type = i < 4 ? 'male' : 'female';
            while (idsUsed.indexOf(randomid) != -1) {
                // ID already used, get another one.
                randomid = 'randomid' + Math.round(Math.random() * 1000000);
            }
            promises.push(db.insert(storeName, {id: randomid, name: randomname, type: type}));
        }

        q.all(promises).then(function() {
            // Count entries.
            setTimeout(timeout.flush, 100);
            // Retrieve "female" entries ordered by id.
            return db.query(storeName, ['type', '=', 'female'], 'id').then(function(entries) {
                expect(entries.length).toEqual(6);
                for (var i = 1; i < entries.length; i++) {
                    expect(entries[i - 1].id <= entries[i].id).toBe(true);
                }

                // .query method works, let's test .where method.
                setTimeout(timeout.flush, 100);
                return db.where(storeName, 'type', '=', 'female').then(function(entries) {
                    expect(entries.length).toEqual(6);
                });
            });
        }).catch(function() {
            // Failed test.
            expect(false).toEqual(true);
        }).finally(function() {
            // Clear DB to have a clean DB for next tests (or re-execute this one).
            db.removeAll(storeName).then(function() {
                done();
            });
            setTimeout(timeout.flush, 100);
        });

        setTimeout(timeout.flush, 100);
    });

})
