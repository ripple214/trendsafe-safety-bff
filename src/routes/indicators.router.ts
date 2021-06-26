import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { hasModuleAccess } from '../common/access-util';
import { SequentialExecutor } from '../common/sequential-executor';
import { isAfter } from '../common/date-util';

export const router = express.Router();

const tableName = conf.get('TABLE_INDICATORS');
const moduleId = 'LI';

/* GET indicators listing. */
router.get('/', function(req, res, next) {
  if(!hasModuleAccess(req, res, moduleId)) return;

  let clientId = req['user'].client_id;

  getIndicators(clientId, 
    (data) => {
      var resp = {"indicators": data};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getIndicators = (clientId: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, report_date, site, total_hours, weightings, assessments, leader_assessments, inspections, leader_inspections, hazards, leader_hazards, unsafe_acts, plannings, leader_plannings, near_miss, actions_completed_by_due_date, total_assessments, total_inspections, total_hazards, total_unsafe_acts, total_plannings, total_near_miss, total_ppifr, total_lsi, total_bbsi',
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
        return isAfter(b.report_date, a.report_date) ? 1 : -1;
      });

      if(response.data) {
        onSuccess(response.data);
      } else {
        onError(response);
      }
    }
  });

}

/* GET indicator. */
router.get('/:indicatorId', function(req, res) {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
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
  let indicatorId = req.params.indicatorId;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, report_date, site, weightings, assessments, leader_assessments, inspections, leader_inspections, hazards, leader_hazards, unsafe_acts, plannings, leader_plannings, near_miss, actions_completed_by_due_date, total_hours, total_assessments, total_inspections, total_hazards, total_unsafe_acts, total_plannings, total_near_miss, total_ppifr, total_lsi, total_bbsi',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :indicatorId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":indicatorId": indicatorId
    },
  };

  return params;
}

/* PUT update indicator. */
router.put('/:indicatorId', function(req, res, next) {
  if(!hasModuleAccess(req, res, moduleId)) return;

  let clientId = req['user'].client_id;
  let indicatorId = req.params.indicatorId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": indicatorId,
    },
    UpdateExpression: 'set #name = :name, \
      report_date = :report_date, \
      site = :site, \
      total_hours = :total_hours, \
      total_assessments = :total_assessments, \
      total_inspections = :total_inspections, \
      total_hazards = :total_hazards, \
      total_unsafe_acts = :total_unsafe_acts, \
      total_plannings = :total_plannings, \
      total_near_miss = :total_near_miss, \
      weightings = :weightings, \
      assessments = :assessments, \
      leader_assessments = :leader_assessments, \
      inspections = :inspections, \
      leader_inspections = :leader_inspections, \
      hazards = :hazards, \
      leader_hazards = :leader_hazards, \
      unsafe_acts = :unsafe_acts, \
      plannings = :plannings, \
      leader_plannings = :leader_plannings, \
      near_miss = :near_miss, \
      actions_completed_by_due_date = :actions_completed_by_due_date, \
      total_ppifr = :total_ppifr, \
      total_lsi = :total_lsi, \
      total_bbsi = :total_bbsi, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":report_date": req.body.report_date,
      ":site": req.body.site,
      ":total_hours": req.body.total_hours,
      ":total_assessments": req.body.total_assessments,
      ":total_inspections": req.body.total_inspections,
      ":total_hazards": req.body.total_hazards,
      ":total_unsafe_acts": req.body.total_unsafe_acts,
      ":total_plannings": req.body.total_plannings,
      ":total_near_miss": req.body.total_near_miss,
      ":weightings": req.body.weightings,
      ":assessments": req.body.assessments,
      ":leader_assessments": req.body.leader_assessments,
      ":inspections": req.body.inspections,
      ":leader_inspections": req.body.leader_inspections,
      ":hazards": req.body.hazards,
      ":leader_hazards": req.body.leader_hazards,
      ":unsafe_acts": req.body.unsafe_acts,
      ":plannings": req.body.plannings,
      ":leader_plannings": req.body.leader_plannings,
      ":near_miss": req.body.near_miss,
      ":actions_completed_by_due_date": req.body.actions_completed_by_due_date,
      ":total_ppifr": req.body.total_ppifr,
      ":total_lsi": req.body.total_lsi,
      ":total_bbsi": req.body.total_bbsi,
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

/* POST insert indicator. */
router.post('/', function(req, res, next) {
  if(!hasModuleAccess(req, res, moduleId)) return;

  let clientId = req['user'].client_id;
  let createTime = moment().format();
  let id = uuid();
  let name = id.replace(/-/g, "").substring(0, 12).toUpperCase();

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "name": name,
      "report_date": req.body.report_date,
      "site": req.body.site,
      "total_hours": req.body.total_hours,
      "total_assessments": req.body.total_assessments,
      "total_inspections": req.body.total_inspections,
      "total_hazards": req.body.total_hazards,
      "total_unsafe_acts": req.body.total_unsafe_acts,
      "total_plannings": req.body.total_plannings,
      "total_near_miss": req.body.total_near_miss,
      "weightings": req.body.weightings,
      "assessments": req.body.assessments,
      "leader_assessments": req.body.leader_assessments,
      "inspections": req.body.inspections,
      "leader_inspections": req.body.leader_inspections,
      "hazards": req.body.hazards,
      "leader_hazards": req.body.leader_hazards,
      "unsafe_acts": req.body.unsafe_acts,
      "plannings": req.body.plannings,
      "leader_plannings": req.body.leader_plannings,
      "near_miss": req.body.near_miss,
      "actions_completed_by_due_date": req.body.actions_completed_by_due_date,
      "total_ppifr": req.body.total_ppifr,
      "total_lsi": req.body.total_lsi,
      "total_bbsi": req.body.total_bbsi,
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

/* DELETE delete indicator. */
router.delete('/:indicatorId', function(req, res) {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  let clientId = req['user'].client_id;
  let indicatorId = req.params.indicatorId;

  deleteIndicator(clientId, indicatorId,
    () => {
      res.status(204);
      res.json();
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

/* DELETE delete indicators. */
router.delete('/', function(req, res) {
  let clientId = req['user'].client_id;
  let ids = [].concat(req.query.ids || []);

  let executor = new SequentialExecutor().chain();  
  let parallels = [];
  for(let i=0; i<ids.length; i++) {
    parallels.push((resolve, reject) => {
      deleteIndicator(clientId, ids[i],
        () => {
          resolve(true);
        }, 
        (error) => {
          reject(error);
        }
      );
    });
  }

  executor
  .parallel(parallels)
  .fail((error) => {
    res.status(400);
    res.json(error);
  })
  .success(() => {
    res.status(204);
    res.json();
  })
  .execute();
});

export const deleteIndicator = (clientId: string, indicatorId: string, onSuccess: () => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": indicatorId,
    },
  };

  ddb.delete(params, function(response) {
    if(!response.error) {
      onSuccess();
    } else {
      onError(response);
    }    
  });  
}