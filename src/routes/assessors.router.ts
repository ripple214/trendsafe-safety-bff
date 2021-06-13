import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';

export const router = express.Router();

const tableName = conf.get('TABLE_ASSESSORS');

/* GET assessors listing. */
router.get('/', function(req, res) {
  let clientId = req['user'].client_id;
  let siteId = req.query.siteId;
  let isLeader = req.query.isLeader;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, site_id, is_leader',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId
    },
  };

  if(siteId) {
    params.IndexName = "SiteIndex",
    params.KeyConditionExpression = '#partition_key = :clientId and #site_id = :siteId';
    params.ExpressionAttributeNames["#site_id"] = "site_id";
    params.ExpressionAttributeValues[":siteId"] = siteId;
  } else {
    params.KeyConditionExpression = '#partition_key = :clientId';
  }

  ddb.query(params, function(response) {
    
    if(response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      if(isLeader != undefined) {
        response.data = response.data.filter(function(el,i,a){
          return el.is_leader.toString() == isLeader;
        });
      }

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
  let clientId = req['user'].client_id;
  let assessorId = req.params.assessorId;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, site_id, is_leader',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :assessorId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
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
  let clientId = req['user'].client_id;
  let siteId = req.body.siteId;
  let createTime = moment().format();
  let id = uuid();
  let name = req.body.name;
  let is_leader = req.body.is_leader;

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "name": name,
      "is_leader": is_leader,
      "site_id": siteId,
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

/* PUT update assessor. */
router.put('/:assessorId', function(req, res) {
  let clientId = req['user'].client_id;
  let assessorId = req.params.assessorId;
  let name = req.body.name;
  let is_leader = req.body.is_leader;

  var updateParams = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": assessorId,
    },
    UpdateExpression: 'set #name = :name, is_leader, :is_leader, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": name,
      ":is_leader": is_leader,
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

/* DELETE delete assessor. */
router.delete('/:assessorId', function(req, res) {
  let clientId = req['user'].client_id;
  let assessorId = req.params.assessorId;

  var deleteParams = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": assessorId,
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


