var express = require('express');
var router = express.Router();
var conf = require('config'); 
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_WEIGHTINGS');

/* GET weightings listing. */
router.get('/', function(req, res, next) {

  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, description, weighting, sort_num',
    KeyConditionExpression: '#partition_key = :adminId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":adminId": 'ALL'
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      var resp = {"weightings": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* PUT update weighting. */
router.put('/:weightingId', function(req, res, next) {
  let weightingId = req.params.weightingId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": 'ALL',
      "sort_key": weightingId,
    },
    UpdateExpression: 'set weighting = :weighting, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeValues: {
      ":weighting": req.body.weighting,
      ":updated_ts": moment().format(),
      ":updated_by": req.user.emailAddress,
    },
    ReturnValues:"ALL_NEW"
  };

  ddb.update(params, function(response) {
    
    if (response.data) {
      var resp = response.data;
      delete resp['partition_key'];
      delete resp['sort_key'];
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

module.exports = router;
