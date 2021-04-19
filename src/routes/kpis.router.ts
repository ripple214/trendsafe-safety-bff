import { default as express } from 'express';
import { default as conf } from 'config'; 
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';

export const router = express.Router();

var tableName = conf.get('TABLE_KPIS');

/* GET kpis listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
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
  let clientId = req['user'].client_id;
  let kpiId = req.params.kpiId;

  var params:any = {
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

export const createDefaultKpis = (clientId, string, userEmail: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let createTime = moment().format();

  let error: any;
  let parallels = [];

  let defaultKpis = [
    {id: "NTA", poor: 10, low: 20, moderate: 30, is_activated: true, name: "Number of task assessments", sort_num: 1},
    {id: "NPAI", poor: 10, low: 20, moderate: 30, is_activated: true, name: "Number of plant / area inspections", sort_num: 2},
    {id: "PPIFR", poor: 10, low: 20, moderate: 30, is_activated: true, name: "Positive performance indicator frequency rate", sort_num: 3},
    {id: "LSI", poor: 10, low: 20, moderate: 30, is_activated: true, name: "Leadership Safety Index", sort_num: 4},
    {id: "NCRNM", poor: 10, low: 20, moderate: 30, is_activated: true, name: "Number of critical risk non management", sort_num: 5},
    {id: "NSRB", poor: 10, low: 20, moderate: 30, is_activated: true, name: "Number of safety rule breaches", sort_num: 6},
    {id: "TCBDD", poor: 10, low: 20, moderate: 30, is_activated: true, name: "Tasks completed by due date", sort_num: 7},
  ];

  defaultKpis.forEach(defaultKpi => {
    parallels.push(
      (resolve, reject) => {
        var params:any = {
          TableName: tableName,
          Item: {
            "partition_key": clientId,
            "sort_key": defaultKpi.id,
            "id": defaultKpi.id,
            "name": defaultKpi.name,
            "poor": defaultKpi.poor,
            "low": defaultKpi.low,
            "moderate": defaultKpi.moderate,
            "is_activated": defaultKpi.is_activated,
            "sort_num": defaultKpi.sort_num,
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

