var express = require('express');
var router = express.Router();
var conf = require('config'); 
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_KPIS');

/* GET kpis listing. */
router.get('/', function(req, res, next) {
  let clientId = req.user.client_id;

  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, description, is_activated, poor, low, moderate, sort_num',
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
      var resp = {"kpis": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* PUT update kpi. */
router.put('/:kpiId', function(req, res, next) {
  let clientId = req.user.client_id;
  let kpiId = req.params.kpiId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": kpiId,
    },
    UpdateExpression: 'set is_activated = :is_activated, poor = :poor, low = :low, moderate = :moderate, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeValues: {
      ":is_activated": req.body.is_activated,
      ":poor": req.body.poor,
      ":low": req.body.low,
      ":moderate": req.body.moderate,
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
