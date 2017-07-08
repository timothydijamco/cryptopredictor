'use strict';

var assert = require('assert');
var RedditApi = require('../lib');
var config = require('./config.json');

describe('RedditApi', function () {
    describe('new RedditApi()', function () {
        it('should initialise the object successfully', function () {

            assert.throws(function () {
                var reddit = new RedditApi();
            }, /^Invalid options/);

            assert.throws(function () {
                var reddit = new RedditApi({});
            }, /^Invalid app ID/);

            assert.throws(function () {
                var reddit = new RedditApi({
                    app_id: 'fake'
                });
            }, /^Invalid app secret/);

            assert.doesNotThrow(function () {
                var reddit = new RedditApi({
                    app_id: 'fake',
                    app_secret: 'fake'
                });
                assert.strictEqual(reddit.app_id, 'fake');
                assert.strictEqual(reddit.app_secret, 'fake');
                assert.strictEqual(reddit.redirect_uri, null);
                assert.ok(/^reddit-oauth\/\d+\.\d+\.\d+ by aihamh$/.test(reddit.user_agent));
                assert.strictEqual(reddit.access_token, null);
                assert.strictEqual(reddit.refresh_token, null);
                assert.ok(reddit.throttled_request instanceof Function);
            });

        });
    });

    describe('isAuthed()', function () {
        it('should return false if access_token is not set', function () {

            var reddit = new RedditApi({
                app_id: 'fake',
                app_secret: 'fake'
            });
            assert.strictEqual(reddit.isAuthed(), false);

        });

        it('should return true if access_token is set', function () {

            var reddit = new RedditApi({
                app_id: 'fake',
                app_secret: 'fake',
                access_token: 'fake'
            });
            assert.strictEqual(reddit.isAuthed(), true);

        });
    });

    describe('request()', function () {
        it('should fail with code 404 when invalid path is provided', function (done) {

            var reddit = new RedditApi({
                app_id: 'fake',
                app_secret: 'fake'
            });
            reddit.request(
                '/an-invalid-api-path-that-does-not-exist',
                null,
                function (error, response, body) {

                    assert.equal(error, null);
                    assert.strictEqual(response.statusCode, 404);
                    assert.strictEqual(response.statusMessage, 'Not Found');
                    done();

                }
            );

        });

        it('should successfully get the google homepage but fail to parse it', function (done) {

            var reddit = new RedditApi({
                app_id: 'fake',
                app_secret: 'fake'
            });
            reddit.request(
                null, {
                    url: 'http://www.google.com'
                },
                function (error, response, body) {

                    assert.ok(error);
                    assert.ok(/^SyntaxError/.test(error));
                    assert.strictEqual(response.statusCode, 200);
                    done();

                }
            );

        });
    });

    describe('passAuth()', function () {
        it('should fail to authorise with invalid app_id/app_secret', function (done) {

            var reddit = new RedditApi({
                app_id: 'fake_app_id',
                app_secret: 'fake_app_secret'
            });
            reddit.passAuth('fake_username', 'fake_password', function (success) {

                assert.ok(!success);
                assert.ok(!reddit.isAuthed());
                done();

            });

        });

        it('should fail to authorise with invalid username/password', function (done) {

            var reddit = new RedditApi({
                app_id: 'real_app_id',
                app_secret: 'real_app_secret'
            });
            reddit.passAuth('fake_username', 'fake_password', function (success) {

                assert.ok(!success);
                assert.ok(!reddit.isAuthed());
                done();

            });

        });

        it('should successfully authorise with valid username/password', function (done) {

            var reddit = new RedditApi({
                app_id: config.redditApi.app.id,
                app_secret: config.redditApi.app.secret
            });
            reddit.passAuth(config.redditApi.user.username, config.redditApi.user.password, function (success) {

                assert.ok(success);
                assert.ok(reddit.isAuthed());
                done();

            });

        });
    });

    describe('oAuthUrl()', function () {
        it('should fail when invalid scope is provided', function () {

            var reddit = new RedditApi({
                app_id: 'fake_app_id',
                app_secret: 'fake_app_secret',
                redirect_uri: 'fake_redirect_uri'
            });

            assert.throws(function () {
                reddit.oAuthUrl();
            }, /^Invalid scope/);

            assert.throws(function () {
                reddit.oAuthUrl('fake_state');
            }, /^Invalid scope/);

            assert.throws(function () {
                reddit.oAuthUrl('fake_state', 1);
            }, /^Invalid scope/);

            assert.throws(function () {
                reddit.oAuthUrl('fake_state', null);
            }, /^Invalid scope/);

            assert.throws(function () {
                reddit.oAuthUrl('fake_state', {});
            }, /^Invalid scope/);

        });

        it('should return a valid URL for authorisation with Reddit', function () {

            var reddit = new RedditApi({
                app_id: 'fake_app_id',
                app_secret: 'fake_app_secret',
                redirect_uri: 'fake_redirect_uri'
            });
            var actual = reddit.oAuthUrl('fake_state', 'fake_scope');
            var expected = 'https://ssl.reddit.com/api/v1/authorize' +
                '?client_id=fake_app_id' +
                '&response_type=code' +
                '&state=fake_state' +
                '&redirect_uri=fake_redirect_uri' +
                '&duration=permanent' +
                '&scope=fake_scope';
            assert.strictEqual(actual, expected);

        });
    });
});
