var express = require('express');
var router = express.Router();
var conf = require('config'); 
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_MODULES');

/* GET modules listing. */
router.get('/', function(req, res, next) {
  console.log("Get modules", req, '-', req.user, '-');
  let clientId = req.user.clientId;

  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, description, is_activated, is_activatable, no_of_users, max_licenses, sort_num',
    KeyConditionExpression: '#partition_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      var resp = {"modules": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* PUT update module. */
router.put('/:moduleId', function(req, res, next) {
  let clientId = req.user.clientId;
  let moduleId = req.params.moduleId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": moduleId,
    },
    UpdateExpression: 'set is_activated = :is_activated, max_licenses = :max_licenses, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeValues: {
      ":is_activated": req.body.is_activated,
      ":max_licenses": req.body.max_licenses,
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
