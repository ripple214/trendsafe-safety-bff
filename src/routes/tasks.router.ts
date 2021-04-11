import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';

export const router = express.Router();

var tableName = conf.get('TABLE_TASKS');
var DELIMITER = "$";

/* GET tasks listing. */
router.get('/', function(req, res) {
  let clientId = req['user'].client_id;
  let siteId = req.query.siteId;
  
  var params:any = {
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

      var resp = {"tasks": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET task. */
router.get('/:taskId', function(req, res) {
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
  let clientId = req['user'].client_id;
  let taskId = req.params.taskId;
  
  var params:any = {
    TableName: tableName,
    IndexName: "IdIndex",
    ProjectionExpression: 'id, #name, parent',
    KeyConditionExpression: '#partition_key = :clientId and #id = :taskId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#id": "id",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":taskId": taskId
    },
  };

  return params;
}


/* POST insert task. */
router.post('/', function(req, res) {
  let clientId = req['user'].client_id;
  let siteId = req.body.siteId;
  let createTime = moment().format();
  let id = uuid();
  let name = req.body.name;

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": siteId + DELIMITER + id,
      "id": id,
      "name": name,
      "parent": siteId,
      "created_ts": createTime, 
      "created_by": req['user'].email,
      "updated_ts": createTime,
      "updated_by": req['user'].email
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

/* PUT update task. */
router.put('/:taskId', function(req, res) {
  var queryParams = getQueryParams(req);

  let siteId = undefined;
  var synCaller = new Promise((resolveCall:any, rejectCall:any) => {
    ddb.query(queryParams, function(response) {
    
      if (response.data && response.data.length == 1) {
        var task = response.data[0];
        siteId = task.parent;
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req['user'].client_id;
    let taskId = req.params.taskId;
    let name = req.body.name;
  
    var updateParams = {
      TableName: tableName,
      Key: {
        "partition_key": clientId,
        "sort_key": siteId + DELIMITER + taskId,
      },
      UpdateExpression: 'set #name = :name, updated_ts = :updated_ts, updated_by = :updated_by',
      ExpressionAttributeNames:{
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": name,
        ":updated_ts": moment().format(),
        ":updated_by": req['user'].email,
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

/* DELETE delete task. */
router.delete('/:taskId', function(req, res) {
  var queryParams = getQueryParams(req);
  
  let siteId = undefined;
  var synCaller = new Promise((resolveCall:any, rejectCall:any) => {
    ddb.query(queryParams, function(response) {
    
      if (response.data && response.data.length == 1) {
        var task = response.data[0];
        siteId = task.parent;
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req['user'].client_id;
    let taskId = req.params.taskId;

    var deleteParams = {
      TableName: tableName,
      Key: {
        "partition_key": clientId,
        "sort_key": siteId + DELIMITER + taskId,
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


