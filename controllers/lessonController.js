"use strict";

let redisController = require('../controllers/redisController.js'),
  _ = require('underscore'),
  I18n = require('i18n-2'),
  Promise = require('promise');

/**
 * Loads data from the JSON file into the redis db
 */
function loadIntoDB(callback) {
  redisController.initVideoData(__dirname + '/../data/videos.json', callback);
};

/**
 * Loads the videos and fills in the exports.categories
 */
function loadFromDB(callback) {
  redisController.getAllPromise("category").done(function onSuccess(cat) {
    l18n(cat);
    exports.categories  = cat;
    exports.categories.sort(redisController.sortByPriority);
    exports._categoriesByTag = [];
    callback(null, cat);
  }, function onFailure(err) {
    callback(err);
  });
};

function l18n(categories) {
  let i18n = new I18n( {
    // setup some locales - other locales default to en silently
    locales: ['en', 'fr'],
    // change the cookie name from 'lang' to 'locale'
    cookieName: 'locale'
  });//TODO find a better place for this

  _.each(categories, function(c) {
    i18n.__(c.title);
    i18n.__(c.description);
    _.each(c.videos, function(v) {
      i18n.__(v.title);
      i18n.__(v.description);
      _.each(v.assertions, function(a) {
        i18n.__(a.title);
        _.each(a.hints, function(h) {
          i18n.__(h);
        });
      });
    });
  });
}


/**
 * Loads in overall lesson stats into exports.stats
 */
function loadLessonStats(callback) {
  redisController.get('stats:video', function(err, stats) {
    exports.stats = stats;
    callback(err, stats);
  });
};

/**
 * Initialize the data for the categories
 * From the JSON file, into redis, and then properties in exports will be set.
 * The following properties will be valid after an init call:
 *   exports.categories : Holds the whole category tree
 *   exports.stats : Holds overall information about the number of videos
 */
exports.init = function(callback) {
  loadIntoDB(function(err) {
    if (err) {
      callback(err);
      return;
    }
    loadFromDB(function(err) {
      if (err) {
        callback(err);
        return;
      }
      exports.initialized = true;
      loadLessonStats(callback);
    });
  });
};
exports.initPromise = Promise.denodeify(exports.init).bind(exports);


/**
 * Obtains a lesson with with the specified slug
 */
exports.get = function(slug, callback) {
  redisController.get("video:" + slug, callback);
};


exports.getCategoriesByTag = function(tag) {
    if (!exports._categoriesByTag[tag]) {
      exports._categoriesByTag[tag] = exports.categories.filter(function(c) {
        let hasTag = false;
        c.videos.forEach(function(v) {
          hasTag = hasTag || v.tags.indexOf(tag) != -1;
        });
        return hasTag;
      });
    }

    return exports._categoriesByTag[tag];
};
