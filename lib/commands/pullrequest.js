var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    repository = require('../repository'),
    argParse = require('../args').parse,
    publishCommand = require('./publish'),
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Manage pull requests for a repository.';

exports.usage = '' +
'jam pullrequest [PACKAGE_PATH]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE_PATH    Path to package directory to submit as pull request (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  -a, --accept       Accept a pull request from the respoitory';

exports.run = function (settings, args) {
    var a = argParse(args, {
        'accept': {match: ['-a', '--accept']}
    });
    var repo = settings.repositories[0];
    var dir = a.positional[0] || '.';
    a.options.pullrequest = !a.options.accept;

    if (process.env.JAM_TEST) {
        repo = process.env.JAM_TEST_DB;
        if (!repo) {
            throw 'JAM_TEST environment variable set, but no JAM_TEST_DB set';
        }
    }

    if (a.options.pullrequest) {
        publishCommand.publish('package', repo, dir, a.options);
    } else if (a.options.accept) {
        var packageInputs = a.positional[0].split('@');

        if (packageInputs.length == 2) {
            a.options.package = {
                name: packageInputs[0],
                version: packageInputs[1]
            }
            exports.accept('package', repo, a.options);
        } else {
            throw new Error('To accept a pull request please type <PACKAGENAME>@<VERSION>');
        }
    }
};

exports.accept = function (type, repo, options) {
    utils.completeAuth(repo, true, function (err, repo) {
        if (err) {
            return callback(err);
        }
        utils.catchAuthError(exports.doAccept, repo, [type, options],
            function (err) {
                if (err) {
                    return logger.error(err);
                }
                logger.end();
            }
        );
    });
};


exports.doAccept = function (repo, type, options, callback) {
    var root = couchdb(repo);
    root.instance.pathname = '';
    root.session(function (err, info, resp) {
        if (err) {
            return callback(err);
        }
        options.user = info.userCtx.name;
        options.server_time = new Date(resp.headers.date);
        repository.acceptPull(repo, options, callback);
    });
};