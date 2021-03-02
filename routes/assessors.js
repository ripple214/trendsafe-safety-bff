var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_ASSESSORS');
var DELIMITER = "$";

/* GET assessors listing. */
router.get('/', function(req, res) {
  let clientId = req.user.clientId;
  let siteId = req.query.siteId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, parent',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId
    },
  };

  if(siteId) {
    params.KeyConditionExpression = '#partition_key = :clientId and begins_with(#sort_key, :siteId)';
    params.ExpressionAttributeNames["#sort_key"] = "sort_key";
    params.ExpressionAttributeValues[":siteId"] = siteId + DELIMITER;
  } else {
    params.KeyConditionExpression = '#partition_key = :clientId';
  }

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"assessors": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET assessor. */
router.get('/:assessorId', function(req, res) {
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
  let assessorId = req.params.assessorId;
  
  var params = {
    TableName: tableName,
    IndexName: "IdIndex",
    ProjectionExpression: 'id, #name, parent',
    KeyConditionExpression: '#partition_key = :clientId and #id = :assessorId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#id": "id",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":assessorId": assessorId
    },
  };

  return params;
}


/* POST insert assessor. */
router.post('/', function(req, res) {
  let clientId = req.user.clientId;
  let siteId = req.body.siteId;
  let createTime = moment().format();
  let id = uuid.v4();
  let name = req.body.name;

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": siteId + DELIMITER + id,
      "id": id,
      "name": name,
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

/* PUT update assessor. */
router.put('/:assessorId', function(req, res) {
  var queryParams = getQueryParams(req);

  let siteId = undefined;
  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {
    
      if (response.data && response.data.length == 1) {
        var assessor = response.data[0];
        siteId = assessor.parent;
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req.user.clientId;
    let assessorId = req.params.assessorId;
    let name = req.body.name;
  
    var updateParams = {
      TableName: tableName,
      Key: {
        "partition_key": clientId,
        "sort_key": siteId + DELIMITER + assessorId,
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
  
    ddb.update(updateParams, function(response) {
      
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
});

/* DELETE delete assessor. */
router.delete('/:assessorId', function(req, res) {
  var queryParams = getQueryParams(req);
  
  let siteId = undefined;
  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {
    
      if (response.data && response.data.length == 1) {
        var assessor = response.data[0];
        siteId = assessor.parent;
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req.user.clientId;
    let assessorId = req.params.assessorId;

    var deleteParams = {
      TableName: tableName,
      Key: {
        "partition_key": clientId,
        "sort_key": siteId + DELIMITER + assessorId,
      },
    };

    ddb.delete(deleteParams, function(response) {
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
});

module.exports = router;
