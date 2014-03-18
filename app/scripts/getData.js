'use strict';

// require config.js, jquery

var getData = (function ($, _, config) {

    /**
     * Given an object, return a query string expected by couch
     * @param params Object with parameters
     * @return {string} Query string with strings in quotess
     * @example
     *    {startkey: "2014-01-01", limit:10} ==> 'startkey="2014-01-01"&limit=10'
     */
    function paramsToQuery(params){
        if (typeof(params) !== 'object') {
            throw new TypeError('Expected object as input. Got: '+typeof(params));
        }

        var outList = [];
        for (var key in params) {
            if (params.hasOwnProperty(key)){
                if (typeof(params[key])==='string') {
                    outList.push([key, '"'+params[key]+'"']);
                } else {
                    outList.push([key, params[key]]);
                }
            }
        }
        return outList.map(function(rec){return rec[0]+'='+rec[1]}).join('&');
    }

    function createUrl(viewName, params) {
        var url= _.template('https://<%= baseUrl %>/<%= db %>/_design/<%= designDoc %>/_view/<%= viewName %>',
            {
                baseUrl : config.COUCH_SERVER,
                db : config.COUCH_DB,
                designDoc : config.COUCH_DESIGN,
                viewName : viewName
            });

        if (params){
            url += '?'+paramsToQuery(params);
        }
        return url;
    }

    function createSnapsUrl(params) {
        return createUrl(config.VIEW_SNAPSPERDAY, params);
    }

    function createIdUrl(params) {
        return createUrl(config.VIEW_ID, params);
    }

    function get(url, successFn, errFn) {
        if (! errFn){
            errFn = function(jqXHR, textStatus, errorThrown) {
                console.log('Error getting url:', url, textStatus, errorThrown);
            }
        }

        if (! successFn) {
            throw new Error('get called without success function');
        }

        $.ajax({
            url: url,
            dataType: 'jsonp',
            error: errFn,
            success: successFn
        })
    }


    function getSnapshots(params, successFn, errFn){
        var url=createSnapsUrl(params);
        get(url, successFn, errFn);
    }

   /**
     *
     * @param raw - raw data from cloudant
     * @returns Just the relevant data, with created_d, and timestamp_d --> localized date objects.
     */
    function reformatByIdData(raw){
        var inner=raw.rows[0].value;
        inner.created_d = inner.created && new Date(inner.created + " UTC");

        if (inner.history) {
            inner.history.forEach(function(d){
                d.created_d = d.created && new Date(d.created + " UTC");
                d.timestamp_d = d.timestamp_str && new Date(d.timestamp_str + " UTC");
            })
        }
        return inner;
    }

    /**
     *
     * @param id - this is the key. eg: '6712703'
     * @param otherParams - other params to send (though not sure they are needed)
     * @param successFn
     * @param errFn
     */
    function getById(id, otherParams, successFn, errFn){
        if (! id ) {
            throw new Error('getById: improper parameters. No id propery');
        }
        var params = {} || otherParams;
        params.key=id;

        var url=createIdUrl(params);
        get(url, function(rawData){
            var modData=reformatByIdData(rawData);
            successFn(modData);
        }, errFn);
    }


    return {
        paramsToQuery : paramsToQuery,
        createUrl : createUrl,
        createSnapsUrl : createSnapsUrl,
        createIdUrl : createIdUrl,
        get : get,
        getSnapshots : getSnapshots,
        getById : getById
    };

}($, _, config));