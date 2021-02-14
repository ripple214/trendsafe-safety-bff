var express = require('express');
var router = express.Router();
var conf = require('config'); 

var ddb = require('./ddb');

/* GET modules listing. */
router.get('/', function(req, res, next) {
  let tableName = conf.get('TABLE_MODULES');
  ddb.queryAll(tableName, function(data) {
    
    if (data) {
      var response = {"modules": data};
      res.json(response);
    }
  });
});

module.exports = router;
