import { default as express } from 'express';
import { default as conf } from 'config'; 
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';

export const router = express.Router();

var tableName = conf.get('TABLE_MODULES');

/* GET modules listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, description, is_activated, is_activatable, no_of_users, max_licenses, sort_num',
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
      var resp = {"modules": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* PUT update module. */
router.put('/:moduleId', function(req, res, next) {
  let clientId = req['user'].client_id;
  let moduleId = req.params.moduleId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": moduleId,
    },
    UpdateExpression: 'set is_activated = :is_activated, max_licenses = :max_licenses, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeValues: {
      ":is_activated": req.body.is_activated,
      ":max_licenses": req.body.max_licenses,
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

export const createDefaultModules = (clientId, string, userEmail: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let createTime = moment().format();

  let error: any;
  let parallels = [];

  let defaultModules = [
    {id: "TA", is_activatable: true, is_activated: true, max_licenses: 20, name: "Task Assessment", no_of_users: 0, sort_num: 1},
    {id: "PAI", is_activatable: true, is_activated: true, max_licenses: 20, name: "Plant / Area Inspection", no_of_users: 0, sort_num: 2},
    {id: "II", is_activatable: true, is_activated: true, max_licenses: -1, name: "Incident Investigation", no_of_users: 0, sort_num: 3},
    {id: "KPI", is_activatable: true, is_activated: true, max_licenses: -1, name: "Key Performance Indicators", no_of_users: 0, sort_num: 4},
    {id: "AM", is_activatable: true, is_activated: true, max_licenses: -1, name: "Action Management", no_of_users: 0, sort_num: 5},
    {id: "TRM", is_activatable: false, is_activated: true, max_licenses: 20, name: "Task Risk Management", no_of_users: -1, sort_num: 6},
    {id: "TP", is_activatable: false, is_activated: true, max_licenses: 20, name: "Task Planning", no_of_users: -1, sort_num: 7},
    {id: "HR", is_activatable: false, is_activated: true, max_licenses: 20, name: "Hazard Report", no_of_users: -1, sort_num: 8},
    {id: "LI", is_activatable: false, is_activated: true, max_licenses: 20, name: "Lead Indicator", no_of_users: -1, sort_num: 9},
  ];

  defaultModules.forEach(defaultModule => {
    parallels.push(
      (resolve, reject) => {
        var params:any = {
          TableName: tableName,
          Item: {
            "partition_key": clientId,
            "sort_key": defaultModule.id,
            "id": defaultModule.id,
            "name": defaultModule.name,
            "is_activatable": defaultModule.is_activatable,
            "is_activated": defaultModule.is_activated,
            "max_licenses": defaultModule.max_licenses,
            "no_of_users": defaultModule.no_of_users,
            "sort_num": defaultModule.sort_num,
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
  .fail((error) => {
    onError(error);
  })
  .execute();
}
