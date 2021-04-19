import { default as express } from 'express';
import { default as conf } from 'config'; 
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';

export const router = express.Router();

var tableName = conf.get('TABLE_KVPS');

/* GET kvps listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
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
  let clientId = req['user'].client_id;
  let kvpId = req.params.kvpId;

  var params:any = {
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
      ":updated_by": req['user'].email,
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


export const createDefaultKvps = (clientId, string, userEmail: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let createTime = moment().format();

  let error: any;
  let parallels = [];

  let defaultKvps = [
    {id: "RISKS", name: "Major Risk Categories"},
    {id: "RULES", name: "Safety Rules"},
  ];

  defaultKvps.forEach(defaultKvp => {
    parallels.push(
      (resolve, reject) => {
        var params:any = {
          TableName: tableName,
          Item: {
            "partition_key": clientId,
            "sort_key": defaultKvp.id,
            "id": defaultKvp.id,
            "name": defaultKvp.name,
            "created_ts": createTime, 
            "created_by": userEmail,
            "updated_ts": createTime,
            "updated_by": userEmail
          }
        };
      
        ddb.insert(params, function(response) {
          if(response.data) {
            resolve(true);
          } else {
            error = response;
            reject(response);
          }
        });  
      
      }
    );
  });

  new SequentialExecutor().chain()
  .parallel(parallels)
  .success(() => {
    onSuccess("{ status: 'done' }");
  })
  .fail(() => {
    onError(error);
  })
  .execute();
}