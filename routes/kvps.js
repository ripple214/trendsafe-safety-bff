var express = require('express');
var router = express.Router();
var conf = require('config'); 
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_KVPS');

/* GET kvps listing. */
router.get('/', function(req, res, next) {
  let clientId = req.user.client_id;

  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name',
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
      var resp = {"kvps": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* PUT update kvp. */
router.put('/:kvpId', function(req, res, next) {
  let clientId = req.user.client_id;
  let kvpId = req.params.kvpId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": kvpId,
    },
    UpdateExpression: 'set #name = :name, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":updated_ts": moment().format(),
      ":updated_by": req.user.email,
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
