var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_ASSESSMENTS');

/* GET assessments listing. */
router.get('/', function(req, res, next) {
  let clientId = req.user.clientId;

  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, completed_date, summary, assessor, risk_rating, sort_num',
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
      var resp = {"assessments": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET assessment. */
router.get('/:assessmentId', function(req, res) {
  var params = getQueryParams(req);

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      var resp = response.data[0];
      res.status(200);
      res.json(resp);
    } else {
      res.status(404);
      res.json();
    }
  });
});

const getQueryParams = (req) => {
  let clientId = req.user.clientId;
  let assessmentId = req.params.assessmentId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, actions_taken, key_findings, further_actions_required, completed_date, due_date, summary, site_id, department_id, location_id, assessor, person_responsible, risk_rating, element_compliance, risk_compliance, rule_compliance',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :assessmentId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":assessmentId": assessmentId
    },
  };

  return params;
}

/* PUT update assessment. */
router.put('/:assessmentId', function(req, res, next) {
  let clientId = req.user.clientId;
  let assessmentId = req.params.assessmentId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": assessmentId,
    },
    UpdateExpression: 'set #name = :name, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
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

/* POST insert assessment. */
router.post('/', function(req, res, next) {
  let clientId = req.user.clientId;
  let createTime = moment().format();
  let id = uuid.v4();

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "name": req.body.name,
      "sort_num": req.body.sort_num,
      "created_ts": createTime, 
      "created_by": req.user.emailAddress,
      "updated_ts": createTime,
      "updated_by": req.user.emailAddress
    }
  };

  ddb.insert(params, function(response) {
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

/* DELETE delete assessment. */
router.delete('/:assessmentId', function(req, res) {
  let clientId = req.user.clientId;
  let assessmentId = req.params.assessmentId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": assessmentId,
    },
  };

  ddb.delete(params, function(response) {
    console.log("response", response);
    if (!response.error) {
      res.status(204);
      res.json();
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

module.exports = router;
