import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { isAfter } from '../common/date-util';
import { hasModuleAccess } from '../common/access-util';
import { SequentialExecutor } from '../common/sequential-executor';

import { getAssessmentsComplianceByElement } from './reports/assessments/compliance-by-element';
import { getHazardsComplianceByElement } from './reports/hazards/compliance-by-element';

export const router = express.Router();

const tableName = conf.get('TABLE_PLANNINGS');
const moduleId = 'TP';

/* GET plannings listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, completed_date, summary, assessor, risk_rating, sort_num',
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
        return isAfter(b.completed_date, a.completed_date) ? 1 : -1;
      });

      var resp = {"plannings": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});


/* GET plannings listing. */
router.get('/load-graphs', function(req, res, next) {
  let resp = {};
  new SequentialExecutor().chain()
  .parallel([
    (resolve, reject) => {
      getAssessmentsComplianceByElement(req, 
        (data) => {
          resp['assessments_data'] = data['report-data'].summary;
          resp['assessments_summaries'] = data['report-data'].assessment_summaries;

          resolve(true);
        },
        (error) => {
          reject(error);
        }
      )
    },
    (resolve, reject) => {
      getHazardsComplianceByElement(req, 
        (data) => {
          resp['hazards_data'] = data['report-data'].summary;
          resp['hazards_summaries'] = data['report-data'].hazard_summaries;

          resolve(true);
        },
        (error) => {
          reject(error);
        }
      )
    },
  ])
  .fail((error) => {
    res.status(400);
    res.json(error);
  })
  .success(() => {
    res.status(200);
    res.json(resp);
  })
  .execute();
});

/* GET planning. */
router.get('/:planningId', function(req, res) {
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
  let planningId = req.params.planningId;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name,completed_date, start_date, end_date, project_id, site_id, subsite_id, department_id, location_id, equipment_id, task_id, assessor, graphs_data, plans',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :planningId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":planningId": planningId
    },
  };

  return params;
}

/* PUT update planning. */
router.put('/:planningId', function(req, res, next) {
  let clientId = req['user'].client_id;
  let planningId = req.params.planningId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": planningId,
    },
    UpdateExpression: 'set #name = :name, \
      completed_date = :completed_date, \
      start_date = :start_date, \
      end_date = :end_date, \
      project_id = :project_id, \
      site_id = :site_id, \
      subsite_id = :subsite_id, \
      department_id = :department_id, \
      location_id = :location_id, \
      equipment_id = :equipment_id, \
      task_id = :task_id, \
      assessor = :assessor, \
      graphs_data = :graphs_data, \
      plans = :plans, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":completed_date": req.body.completed_date,
      ":start_date": req.body.start_date,
      ":end_date": req.body.end_date,
      ":project_id": req.body.project_id,
      ":site_id": req.body.site_id,
      ":subsite_id": req.body.subsite_id,
      ":department_id": req.body.department_id,
      ":location_id": req.body.location_id,
      ":equipment_id": req.body.equipment_id,
      ":task_id": req.body.task_id,
      ":assessor": req.body.assessor,
      ":graphs_data": req.body.graphs_data,
      ":plans": req.body.plans,
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

/* POST insert planning. */
router.post('/', function(req, res, next) {
  let clientId = req['user'].client_id;
  let createTime = moment().format();
  let id = uuid();
  let name = id.replace(/-/g, "").substring(0, 12).toUpperCase();

  let tempId = req.body.id;

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "name": name,
      "completed_date": req.body.completed_date,
      "start_date": req.body.start_date,
      "end_date": req.body.end_date,
      "project_id": req.body.project_id,
      "site_id": req.body.site_id,
      "subsite_id": req.body.subsite_id,
      "department_id": req.body.department_id,
      "location_id": req.body.location_id,
      "equipment_id": req.body.equipment_id,
      "task_id": req.body.task_id,
      "assessor": req.body.assessor,
      "graphs_data": req.body.graphs_data,
      "plans": req.body.plans,
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

/* DELETE delete planning. */
router.delete('/:planningId', function(req, res) {
  let clientId = req['user'].client_id;
  let planningId = req.params.planningId;

  deletePlanning(clientId, planningId,
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

/* DELETE delete plannings. */
router.delete('/', function(req, res) {
  let clientId = req['user'].client_id;
  let ids = [].concat(req.query.ids || []);

  let executor = new SequentialExecutor().chain();  
  let parallels = [];
  for(let i=0; i<ids.length; i++) {
    parallels.push((resolve, reject) => {
      deletePlanning(clientId, ids[i],
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

export const deletePlanning = (clientId: string, planningId: string, onSuccess: () => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": planningId,
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