var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_CLIENTS');

/* GET clients listing. */
router.get('/', function(req, res) {
  let adminId = 'ALL';
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, license_count, license_max',
    KeyConditionExpression: '#partition_key = :adminId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":adminId": adminId
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"clients": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET client. */
router.get('/:clientId', function(req, res) {
  let adminId = 'ALL';
  let clientId = req.params.clientId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, first_name, last_name, email, license_count, license_max',
    KeyConditionExpression: '#partition_key = :adminId and #sort_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":adminId": adminId,
      ":clientId": clientId
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

/* POST insert client. */
router.post('/', function(req, res) {
  let adminId = 'ALL';
  let createTime = moment().format();
  let id = uuid.v4();
  let name = req.body.name;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let email = req.body.email;

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": adminId,
      "sort_key": id,
      "id": id,
      "name": name,
      "first_name": first_name,
      "last_name": last_name,
      "email": email,
      "license_count": 0,
      "license_max": 20,
      "created_ts": createTime, 
      "created_by": req.user.email,
      "updated_ts": createTime,
      "updated_by": req.user.email
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

/* PUT update client. */
router.put('/:id', function(req, res) {
  let adminId = 'ALL';
  let id = req.params.id;
  let name = req.body.name;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let email = req.body.email;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": adminId,
      "sort_key": id,
    },
    UpdateExpression: 'set #name = :name, first_name = :first_name, last_name = :last_name, email = :email, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": name,
      ":first_name": first_name,
      ":last_name": last_name,
      ":email": email,
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

/* DELETE delete client. */
router.delete('/:id', function(req, res) {
  let adminId = 'ALL';
  let id = req.params.id;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": adminId,
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
