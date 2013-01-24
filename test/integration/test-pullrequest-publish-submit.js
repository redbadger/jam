var http = require('http'),
    couchdb = require('../../lib/couchdb'),
    logger = require('../../lib/logger'),
    utils = require('../utils'),
    async = require('async'),
    path = require('path');


logger.clean_exit = true;

// CouchDB database URL to use for testing
var TESTDB = process.env['JAM_TEST_DB'],
    BIN = path.resolve(__dirname, '../../bin/jam.js'),
    ENV = {JAM_TEST: 'true', JAM_TEST_DB: TESTDB};

if (!TESTDB) {
    throw 'JAM_TEST_DB environment variable not set';
}

// remove trailing-slash from TESTDB URL
TESTDB = TESTDB.replace(/\/$/, '');


exports.setUp = function (callback) {
    // change to integration test directory before running test
    this._cwd = process.cwd();
    process.chdir(__dirname);

    // recreate any existing test db
    couchdb(TESTDB).deleteDB(function (err) {
        if (err && err.error !== 'not_found') {
            return callback(err);
        }
        // create test db
        couchdb(TESTDB).createDB(callback);
    });
};

exports.tearDown = function (callback) {
    // change back to original working directory after running test
    process.chdir(this._cwd);
    // delete test db
    couchdb(TESTDB).deleteDB(callback);
};


exports['publish, pull request submit'] = function (test) {
    test.expect(4);
    var pkgfourv1 = path.resolve(__dirname, 'fixtures', 'package-four-v1'),
        pkgfourv2 = path.resolve(__dirname, 'fixtures', 'package-four-v2-pull-request');

    async.series([
        async.apply(utils.runJam, ['publish', pkgfourv1], {env: ENV}),
        async.apply(utils.runJam, ['pullrequest', pkgfourv2], {env: ENV}),
        function (cb) {
            couchdb(TESTDB).get('package-four', function (err, doc) {
                if (err) {
                    return cb(err);
                }

                test.same(Object.keys(doc.versions).sort(), [
                    '1.0.0',
                    '2.0.0'
                ]);

                test.equal(doc.versions['2.0.0'].state, 'pullrequest');
                test.equal(doc.tags.latest, '1.0.0');
                test.equal(doc.name, 'package-four');
                cb();
            });
        }
    ],
    test.done);
};
