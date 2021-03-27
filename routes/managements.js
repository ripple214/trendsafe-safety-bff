var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');
var s3 = require('./s3');

var tableName = conf.get('TABLE_MANAGEMENTS');

/* GET managements listing. */
router.get('/', function(req, res, next) {
  let clientId = req.user.clientId;

  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, completed_date, description, summary, leader, sort_num',
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
      response.data.sort(function (a, b) {
        return b.completed_date.localeCompare(a.completed_date);
      });

      var resp = {"managements": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET management. */
router.get('/:managementId', function(req, res) {
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
  let managementId = req.params.managementId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, completed_date, description, site_id, department_id, location_id, task_id, members, leader, element_compliance',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :managementId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":managementId": managementId
    },
  };

  return params;
}

/* PUT update management. */
router.put('/:managementId', function(req, res, next) {
  let clientId = req.user.clientId;
  let managementId = req.params.managementId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": managementId,
    },
    UpdateExpression: 'set #name = :name, \
      completed_date = :completed_date, \
      description = :description, \
      site_id = :site_id, \
      department_id = :department_id, \
      location_id = :location_id, \
      task_id = :task_id, \
      leader = :leader, \
      members = :members, \
      element_compliance = :element_compliance, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":completed_date": req.body.completed_date,
      ":description": req.body.description,
      ":site_id": req.body.site_id,
      ":department_id": req.body.department_id,
      ":location_id": req.body.location_id,
      ":task_id": req.body.task_id,
      ":leader": req.body.leader,
      ":members": req.body.members,
      ":element_compliance": req.body.element_compliance,
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

/* POST insert management. */
router.post('/', function(req, res, next) {
  let clientId = req.user.clientId;
  let createTime = moment().format();
  let id = uuid.v4();
  let name = id.replace(/-/g, "").substring(0, 12).toUpperCase();

  let tempId = req.body.id;

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "name": name,
      "completed_date": req.body.completed_date,
      "description": req.body.description,
      "site_id": req.body.site_id,
      "department_id": req.body.department_id,
      "location_id": req.body.location_id,
      "task_id": req.body.task_id,
      "leader": req.body.leader,
      "members": req.body.members,
      "element_compliance": req.body.element_compliance,
      "sort_num": 1,
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

/* DELETE delete management. */
router.delete('/:managementId', function(req, res) {
  let clientId = req.user.clientId;
  let managementId = req.params.managementId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": managementId,
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
