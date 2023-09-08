if (typeof jQuery !== 'undefined') {
    // this is required to support cross-domain AJAX calls on IE 9
    $.support.cors = true;

    var slingr = slingr || {};
    if (!slingr.ws) {
        slingr.ws = {};
    }
    if (!slingr.wsFetch) {
        slingr.wsFetch = {};
    }
    if (!slingr.ui) {
        slingr.ui = {};
    }
    if (!slingr.context) {
        slingr.context = {};
    }
    slingr.ws.TOKEN = null;
    slingr.ws.API_URL = null;
    slingr.ws.HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // GENERIC LIBRARY TO HELP ACCESSING WEB SERVICES
    ///////////////////////////////////////////////////////////////////////////////////////////////

    slingr.ws.OPTIONS_TTL = 5000;

    // Generic WS methods

    slingr.ws.get = function (urlOrParams, done, error) {
        var url, params;
        if (typeof urlOrParams === 'object') {
            url = urlOrParams.url;
            params = urlOrParams.params;
        } else {
            url = urlOrParams;
        }
        slingr.ws.getAjaxOptions(url, done, error, function (options) {
            options['type'] = 'GET';
            if (params) {
                options['data'] = params;
            }
            $.ajax(options);
        });
    };

    slingr.ws.post = function (urlOrParams, data, done, error) {
        var url, params;
        if (typeof urlOrParams === 'object') {
            url = urlOrParams.url;
            params = urlOrParams.params;
        } else {
            url = urlOrParams;
        }
        if (params) {
            url = url + '?' + $.param(params);
        }
        slingr.ws.getAjaxOptions(url, done, error, function (options) {
            options['type'] = 'POST';
            options['data'] = slingr.ws.stringifyData(data);
            $.ajax(options);
        });
    };

    slingr.ws.put = function (urlOrParams, data, done, error) {
        var url, params;
        if (typeof urlOrParams === 'object') {
            url = urlOrParams.url;
            params = urlOrParams.params;
        } else {
            url = urlOrParams;
        }
        if (params) {
            url = url + '?' + $.param(params);
        }
        slingr.ws.getAjaxOptions(url, done, error, function (options) {
            options['type'] = 'PUT';
            options['data'] = slingr.ws.stringifyData(data);
            $.ajax(options);
        });
    };

    slingr.ws.del = function (urlOrParams, done, error) {
        var url, params;
        if (typeof urlOrParams === 'object') {
            url = urlOrParams.url;
            params = urlOrParams.params;
        } else {
            url = urlOrParams;
        }
        if (params) {
            url = url + '?' + $.param(params);
        }
        slingr.ws.getAjaxOptions(url, done, error, function (options) {
            options['type'] = 'DELETE';
            $.ajax(options);
        });
    };

    slingr.ws.getAjaxOptions = function (url, done, error, callback) {
        if (!slingr.ws.TOKEN) {
            // if token is not set yet, we might need to wait a bit
            setTimeout(function () {
                slingr.ws.getAjaxOptions(url, done, error, callback);
            }, 500);
            return;
        }
        slingr.ws.HEADERS['token'] = slingr.ws.TOKEN;
        var options = {
            url: slingr.ws.buildUrl(url),
            headers: slingr.ws.HEADERS,
            success: slingr.ws.successHandler(done),
            error: slingr.ws.errorHandler(error),
            cache: true
        };
        callback(options);
    };

    slingr.ws.stringifyData = function (data) {
        if (typeof data !== 'string') {
            return JSON.stringify(data);
        } else {
            return data;
        }
    };

    slingr.ws.jsonifyData = function (data) {
        if (typeof data === 'string') {
            return JSON.parse(data);
        } else {
            return data;
        }
    };

    slingr.ws.buildUrl = function (url) {
        if (!url) {
            return slingr.ws.API_URL;
        } else if (url.indexOf('/') === 0) {
            return slingr.ws.API_URL + url;
        } else {
            return slingr.ws.API_URL + '/' + url;
        }
    };

    slingr.ws.successHandler = function (successCallback) {
        return function (res, textStatus, request) {
            successCallback(slingr.ws.jsonifyData(res), textStatus);
        }
    };

    slingr.ws.errorHandler = function (errorCallback) {
        return function (jqXhr, textStatus, errorThrown) {
            var errorCode = "unkown";
            var errorMessage = "";
            if (textStatus == 'timeout') {
                errorCode = "timeout";
                errorMessage = "Timeout tying to access the server. Please check your internet connection.";
            } else {
                try {
                    var res = JSON.parse(jqXhr.responseText);
                    errorCode = res.code;
                    errorMessage = res.message;
                } catch (err) {
                    errorMessage = "Unknown error. Please contact support.";
                    if (!jqXhr.responseText) {
                        /* the ajax call was aborted by the browser because there is no response */
                        return;
                    }
                }
            }
            var errorInfo = {
                'code': errorCode,
                'message': errorMessage
            };
            if (errorCode == 'validationErrors') {
                errorInfo['errors'] = res.errors;
            }
            errorCallback(errorInfo, textStatus);
        };
    };

    // EcmaScript6 - Fetch - Promises

    slingr.wsFetch.buildUrl = (url, params = {}) => {
        const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
        if (!url) return slingr.ws.API_URL + qs;
        if (url.startsWith('/')) return slingr.ws.API_URL + url + qs;
        return slingr.ws.API_URL + '/' + url + qs;
    };

    slingr.wsFetch.request = async (method, url, params = {}, body = {}) => {
        while (! slingr.ws.TOKEN) {
          await new Promise(resolve => {
              setTimeout(resolve, 500);
          });
        }

        let options = {
            method: method,
            headers: {
                ...slingr.ws.HEADERS,
                token: slingr.ws.TOKEN,
            }
        };
        if (['PUT', 'POST'].includes(method)) {
            options.body = JSON.stringify(body);
        }
        url = slingr.wsFetch.buildUrl(url, params);
        let res = await fetch(url, options);
        let data = await res.json();
        if (! res.ok) {
            throw new Error(data.message, { cause: data });
        }
        return data;
    };

    slingr.wsFetch.get = async (url, params) => slingr.wsFetch.request('GET', url, params);
    slingr.wsFetch.post = async (url, params, body) => slingr.wsFetch.request('POST', url, params, body);
    slingr.wsFetch.put = async (url, params, body) => slingr.wsFetch.request('PUT', url, params, body);
    slingr.wsFetch.del = async (url, params) => slingr.wsFetch.request('DELETE', url, params);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // END OF GENERIC LIBRARY TO HELP ACCESSING WEB SERVICES
    ///////////////////////////////////////////////////////////////////////////////////////////////
} else {
    console.warn("UI API won't be available because jQuery is not loaded");
}
