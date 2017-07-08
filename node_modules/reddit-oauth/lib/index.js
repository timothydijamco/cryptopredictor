'use strict';

var libVersion = require('../package.json').version,
    request = require('request'),
    throttledRequestLib = require('throttled-request');

/**
 * Creates instance of {@link RedditApi}.
 * @class
 * @classdesc Reddit API Controller which facilitates authentication and API endpoint queries.
 * @param {Object} options - Options object
 * @param {String} options.app_id - Reddit app ID
 * @param {String} options.app_secret - Reddit app secret
 * @param {String} [options.redirect_uri=null] - Reddit app redirect URI
 * @param {String} [options.user_agent=reddit-oauth/x.y.z by aihamh] - HTTP user agent header sent to Reddit for each request
 * @param {String} [options.access_token=null] - OAuth access token
 * @param {String} [options.refresh_token=null] - OAuth refresh token
 * @param {Number} [options.request_buffer=2000] - Time in milliseconds to buffer for each request
 */
function RedditApi(options) {

    if (!options || typeof options !== 'object') {
        throw 'Invalid options: ' + options;
    }
    if (typeof options.app_id !== 'string' || options.app_id.length < 1) {
        throw 'Invalid app ID: ' + options.app_id;
    }
    if (typeof options.app_secret !== 'string' || options.app_secret.length < 1) {
        throw 'Invalid app secret: ' + options.app_secret;
    }

    /**
     * Reddit app ID
     * @type {String}
     */
    this.app_id = options.app_id;

    /**
     * Reddit app secret
     * @type {String}
     */
    this.app_secret = options.app_secret;

    /**
     * Reddit app redirect URI
     * @type {?String}
     * @default null
     */
    this.redirect_uri = options.redirect_uri || null;

    /**
     * HTTP user agent header sent to Reddit for each request
     * @type {String}
     * @default reddit-oauth/x.y.z by aihamh
     */
    this.user_agent = options.user_agent || 'reddit-oauth/' + libVersion + ' by aihamh';

    /**
     * OAuth access token
     * @type {?String}
     * @default null
     */
    this.access_token = options.access_token || null;

    /**
     * OAuth refresh token
     * @type {?String}
     * @default null
     */
    this.refresh_token = options.refresh_token || null;

    /**
     * Throttled request function
     * Refer to: https://www.npmjs.com/package/throttled-request
     * @type {Function}
     */
    this.throttled_request = throttledRequestLib(request);
    this.throttled_request.configure({
        requests: 1,
        milliseconds: options.request_buffer || 2000
    });

}

RedditApi.prototype = {

    constructor: RedditApi,

    /**
     * Checks if user is authenticated based on the presence of an access token.
     * @return {Boolean}
     */
    isAuthed: function RedditApi__isAuthed() {

        return typeof this.access_token === 'string' &&
            this.access_token.length > 0;

    },

    /**
     * @callback RedditApi~ApiRequestCallback
     * @param {?Object} error
     * @param {Object} incomingMessage
     * @param {String|Buffer|Object} responseBody
     */

    /**
     * @callback RedditApi~ApiListingRequestCallback
     * @param {?Object} error
     * @param {Object} incomingMessage
     * @param {String|Buffer|Object} responseBody
     * @param {?Function} next - Invoke to retrieve the next page in the listing, until next equals null
     */

    /**
     * @callback RedditApi~ApiTokenCallback
     * @param {Boolean} success
     */

    /**
     * Create new API request to specified API endpoint with custom options and callback to be invoked on request completion. If authentication error occurs, is_refreshing_token is false and a refresh token is currently defined, then it will automatically attempt to retrieve a new access token then try again.
     * @param {String} path - API endpoint path
     * @param {external:Request~Options} [options={}] - Request options
     * @param {String} [options.method=GET] - HTTP method
     * @param {String} [options.url=https://(oauth|ssl).reddit.com/:path] - Request URL. ssl subdomain used for authentication; oauth for authenticated queries
     * @param {Object} [options.headers={}] - HTTP headers
     * @param {String} [options.headers.User-Agent] - User agent
     * @param {String} [options.headers.Authorization] - Bearer token if available
     * @param {RedditApi~ApiRequestCallback} callback - Callback function
     * @param {Boolean} [is_refreshing_token=false] - If false, will attempt to refresh tokens then retry request
     */
    request: function RedditApi__request(path, options, callback, is_refreshing_token) {

        if (!options) {
            options = {};
        }

        if (!options.headers) {
            options.headers = {};
        }
        options.headers['User-Agent'] = this.user_agent;
        if (this.isAuthed()) {
            options.headers['Authorization'] = 'bearer ' + this.access_token;
        }

        if (!options.url) {
            var subdomain = this.isAuthed() ? 'oauth' : 'ssl';
            options.url = 'https://' + subdomain + '.reddit.com' + path;
        }

        if (!options.method) {
            options.method = 'GET';
        }

        this.throttled_request(options, (function (api) {

            return function (error, response, body) {

                if (!error && response && response.statusCode === 200) {
                    try {
                        response.jsonData = JSON.parse(body);
                    } catch (e) {
                        error = e;
                    }
                } else if (
                    !is_refreshing_token &&
                    response &&
                    response.statusCode === 401 &&
                    api.refresh_token
                ) {
                    api.refreshToken(function (success) {

                        if (success) {
                            api.request(path, options, callback);
                        } else {
                            callback.call(api, error, response, data);
                        }

                    });
                    return;
                } else {
                    console.error(
                        'reddit-oauth Error:', error,
                        ', Status code:', response ? response.statusCode : 'Unknown',
                        ', Status message:', response ? response.statusMessage : 'Unknown'
                    );
                }
                callback.call(api, error, response, body);

            };

        })(this));

    },

    /**
     * Authenticate with username and password
     * @param {String} username - Reddit username
     * @param {String} password - Reddit password
     * @param {RedditApi~ApiRequestCallback} callback - Request callback
     */
    passAuth: function RedditApi__passAuth(username, password, callback) {

        this.access_token = null;
        this.refresh_token = null;

        this.request('/api/v1/access_token', {
            method: 'POST',
            form: {
                grant_type: 'password',
                username: username,
                password: password
            },
            auth: {
                username: this.app_id,
                password: this.app_secret
            }
        }, function (error, response, body) {

            var success = !error &&
                response &&
                typeof response === 'object' &&
                response.jsonData &&
                typeof response.jsonData === 'object' &&
                typeof response.jsonData.access_token === 'string' &&
                response.jsonData.access_token.length > 0;

            if (success) {
                this.access_token = response.jsonData.access_token;
            }

            if (callback) {
                callback(success);
            }

        });

    },

    /**
     * Get OAuth authorization URL for specific scope
     * @param {String} state - An arbitrary string that is checked when user returns with the code
     * @param {String|Array.<String>} scope - Array or comma separated list of scopes to request from user
     * @return {String} URL to send user's browser to
     */
    oAuthUrl: function RedditApi__oAuthUrl(state, scope) {

        if (Array.isArray(scope)) {
            scope = scope.join(',');
        }

        if (typeof scope !== 'string') {
            throw 'Invalid scope: ' + scope;
        }

        var url = 'https://ssl.reddit.com/api/v1/authorize' +
            '?client_id=' + encodeURIComponent(this.app_id) +
            '&response_type=code' +
            '&state=' + encodeURIComponent(state) +
            '&redirect_uri=' + encodeURIComponent(this.redirect_uri || '') +
            '&duration=permanent' +
            '&scope=' + encodeURIComponent(scope);

        return url;

    },

    /**
     * Upon user returning from authorization URL, use supplied code to request access and fresh tokens.
     * @param {String} state - The same arbitrary string that was used in {@link RedditApi#oAuthUrl}
     * @param {Object} query - Key/value pairs from HTTP query string constructed by Reddit
     * @param {String} query.state - Should be the string passed into {@link RedditApi#oAuthUrl}
     * @param {String} query.code - A one time use token provided by Reddit to be exchanged for access and refresh tokens
     * @param {RedditApi~ApiTokenCallback} callback - Callback function to invoke after tokens are retrieved
     */
    oAuthTokens: function RedditApi__oAuthTokens(state, query, callback) {

        if (query.state !== state || !query.code) {
            callback(false);
            return;
        }

        this.access_token = null;
        this.refresh_token = null;

        this.request('/api/v1/access_token', {
            method: 'POST',
            form: {
                grant_type: 'authorization_code',
                code: query.code,
                redirect_uri: this.redirect_uri || ''
            },
            auth: {
                username: this.app_id,
                password: this.app_secret
            }
        }, function (error, response, body) {

            var success = !error &&
                response &&
                typeof response === 'object' &&
                response.jsonData &&
                typeof response.jsonData === 'object' &&
                typeof response.jsonData.access_token === 'string' &&
                typeof response.jsonData.refresh_token === 'string' &&
                response.jsonData.access_token.length > 0 &&
                response.jsonData.refresh_token.length > 0;

            if (success) {
                this.access_token = response.jsonData.access_token;
                this.refresh_token = response.jsonData.refresh_token;
            }

            if (callback) {
                callback(success);
            }

        });

    },

    /**
     * Request a new access token using the existing refresh token.
     * @param {RedditApi~ApiTokenCallback} callback - Callback function to invoke after the access token is retrieved
     */
    refreshToken: function RedditApi__refreshToken(callback) {

        this.access_token = null;

        this.request('/api/v1/access_token', {
            method: 'POST',
            form: {
                grant_type: 'refresh_token',
                refresh_token: this.refresh_token
            },
            auth: {
                username: this.app_id,
                password: this.app_secret
            }
        }, function (error, response, body) {

            var success = !error &&
                response &&
                typeof response === 'object' &&
                response.jsonData &&
                typeof response.jsonData === 'object' &&
                typeof response.jsonData.access_token === 'string' &&
                response.jsonData.access_token.length > 0;

            if (success) {
                this.access_token = response.jsonData.access_token;
            }

            if (callback) {
                callback(!error);
            }

        }, true);

    },

    /**
     * Execute an authenticated GET request to the specified API endpoint.
     * @param {String} path - API endpoint path
     * @param {Object} params - Key/value pairs to send as the request query string
     * @param {RedditApi~ApiRequestCallback} callback - Callback function
     */
    get: function RedditApi__get(path, params, callback) {

        var options = null;
        if (params) {
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    if (!options) options = {};
                    options.form = params;
                    break;
                }
            }
        }
        this.request(path, options, callback);

    },

    /**
     * Execute an authenticated POST request to the specified API endpoint.
     * @param {String} path - API endpoint path
     * @param {Object} params - Key/value pairs to send as the request POST body
     * @param {RedditApi~ApiRequestCallback} callback - Callback function
     */
    post: function RedditApi__post(path, params, callback) {

        var options = {
            method: 'POST'
        };
        if (params) {
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    options.form = params;
                    break;
                }
            }
        }
        this.request(path, options, callback);

    },

    /**
     * Request a page of values from the specified listing endpoint. Use the additional 'next' callback argument to request the next page, repeatedly until 'next' equals null.
     * @param {String} path
     * @param {Object} params
     * @param {RedditApi~ApiListingRequestCallback} callback - Invoke the next callback to retrieve the next page of the list
     */
    getListing: function RedditApi__getListing(path, params, callback, after, count) {

        if (!count) {
            count = 0;
        }

        var fullPath = path;

        if (after) {
            fullPath += '?after=' + encodeURIComponent(after) + '&count=' + encodeURIComponent(count);
        }

        this.get(fullPath, params, (function (reddit) {

            return function (error, response, body) {

                if (error || !response || response.statusCode !== 200) {
                    callback(error, response, body);
                    return;
                }

                var nextAfter = null;
                if (response.jsonData && response.jsonData.data) {
                    nextAfter = response.jsonData.data.after;
                }

                var nextCount;
                if (response.jsonData && response.jsonData.data && response.jsonData.data.children) {
                    nextCount = count + response.jsonData.data.children.length;
                }

                var next = nextAfter == null ? null : function () {

                    reddit.getListing(path, params, callback, nextAfter, nextCount);

                };

                if (callback) {
                    callback(error, response, body, next);
                }

            };

        })(this));

    }

};

module.exports = RedditApi;
