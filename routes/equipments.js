var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_EQUIPMENTS');
var DELIMITER = "$";

/* GET equipments listing. */
router.get('/', function(req, res) {
  let clientId = req.user.clientId;
  let siteId = req.query.siteId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, site_name, parent',
    KeyConditionExpression: '#partition_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + siteId
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"equipments": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET equipment. */
router.get('/:equipmentId', function(req, res) {
  let clientId = req.user.clientId;
  let equipmentId = req.params.equipmentId;
  let siteId = req.query.siteId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, site_name, parent',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :equipmentId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + siteId,
      ":equipmentId": equipmentId
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = response.data[0];
      res.status(200);
      res.json(resp);
    } else {
      res.status(404);
      res.json();
    }
  });
});

/* POST insert equipment. */
router.post('/', function(req, res) {
  let clientId = req.user.clientId;
  let siteId = req.body.siteId;
  let createTime = moment().format();
  let id = uuid.v4();
  let name = req.body.name;
  let site_name = "";

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId + DELIMITER + siteId,
      "sort_key": id,
      "id": id,
      "name": name,
      "site_name": site_name, 
      "parent": siteId,
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

/* PUT update equipment. */
router.put('/:id', function(req, res) {
  let clientId = req.user.clientId;
  let id = req.params.id;
  let siteId = req.query.siteId;
  let name = req.body.name;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId + DELIMITER + siteId,
      "sort_key": id,
    },
    UpdateExpression: 'set #name = :name, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": name,
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

/* DELETE delete equipment. */
router.delete('/:id', function(req, res) {
  let clientId = req.user.clientId;
  let id = req.params.id;
  let siteId = req.query.siteId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId + DELIMITER + siteId,
      "sort_key": id,
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
