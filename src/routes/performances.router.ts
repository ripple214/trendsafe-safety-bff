import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { s3_service as s3 } from '../services/s3.service';
import { isAfter } from '../common/date-util';

import { SequentialExecutor } from '../common/sequential-executor';

export const router = express.Router();

const tableName = conf.get('TABLE_PERFORMANCES');

/* GET performances listing. */
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

      var resp = {"performances": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET performance. */
router.get('/:performanceId', function(req, res) {
  var params = getQueryParams(req);

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      var resp = response.data[0];
      
      getPhotographs(req, res, (data) => {
        console.log()
        resp.photographs = data;
        res.status(200);
        res.json(resp);
      });
    } else {
      res.status(404);
      res.json();
    }
  });
});

const getPhotographs = (req, res, callback) => {
  let clientId = req['user'].client_id;
  let group = "images/performances";
  let subgroup = req.params.performanceId;
  let key = clientId + '/' + group + '/' + subgroup;

  s3.list(key, function(response) {
    if (response.data) {
      callback(response.data);
    } else {
      res.status(400);
      res.json(response);
    }
  });
} 

const getQueryParams = (req) => {
  let clientId = req['user'].client_id;
  let performanceId = req.params.performanceId;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, actions_taken, key_findings, further_actions_required, completed_date, due_date, summary, site_id, department_id, location_id, task_id, assessor, person_responsible, risk_rating, element_compliance, risk_compliance, rule_compliance',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :performanceId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":performanceId": performanceId
    },
  };

  return params;
}

/* PUT update performance. */
router.put('/:performanceId', function(req, res, next) {
  let clientId = req['user'].client_id;
  let performanceId = req.params.performanceId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": performanceId,
    },
    UpdateExpression: 'set #name = :name, \
      actions_taken = :actions_taken, \
      key_findings = :key_findings, \
      further_actions_required = :further_actions_required, \
      completed_date = :completed_date, \
      due_date = :due_date, \
      summary = :summary, \
      site_id = :site_id, \
      department_id = :department_id, \
      location_id = :location_id, \
      task_id = :task_id, \
      assessor = :assessor, \
      person_responsible = :person_responsible, \
      risk_rating = :risk_rating, \
      element_compliance = :element_compliance, \
      risk_compliance = :risk_compliance, \
      rule_compliance = :rule_compliance, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":actions_taken": req.body.actions_taken,
      ":key_findings": req.body.key_findings,
      ":further_actions_required": req.body.further_actions_required,
      ":completed_date": req.body.completed_date,
      ":due_date": req.body.due_date,
      ":summary": req.body.summary,
      ":site_id": req.body.site_id,
      ":department_id": req.body.department_id,
      ":location_id": req.body.location_id,
      ":task_id": req.body.task_id,
      ":assessor": req.body.assessor,
      ":person_responsible": req.body.person_responsible,
      ":risk_rating": req.body.risk_rating,
      ":element_compliance": req.body.element_compliance,
      ":risk_compliance": req.body.risk_compliance,
      ":rule_compliance": req.body.rule_compliance,
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

/* POST insert performance. */
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
      "actions_taken": req.body.actions_taken,
      "key_findings": req.body.key_findings,
      "further_actions_required": req.body.further_actions_required,
      "completed_date": req.body.completed_date,
      "due_date": req.body.due_date,
      "summary": req.body.summary,
      "site_id": req.body.site_id,
      "department_id": req.body.department_id,
      "location_id": req.body.location_id,
      "task_id": req.body.task_id,
      "assessor": req.body.assessor,
      "person_responsible": req.body.person_responsible,
      "risk_rating": req.body.risk_rating,
      "element_compliance": req.body.element_compliance,
      "risk_compliance": req.body.risk_compliance,
      "rule_compliance": req.body.rule_compliance,
      "sort_num": 1,
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

      let group = "images/performances";
      let fromSubgroup = tempId;
      let toSubgroup = id;
      let fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
      let toKey = clientId + '/' + group + '/' + toSubgroup;
    
      movePhotographs(fromKey, toKey, (moveResponse) => {
        if (moveResponse.error) {
          res.status(400);
          res.json(response);
        } else {
          res.status(200);
          res.json(resp);
        }
      });
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

const movePhotographs = (fromKey, toKey, callback) => {
  console.log("moving photographs from", fromKey, "to", toKey);
  s3.move(fromKey, toKey, function(response) {
    callback(response);
  });
};

/* DELETE delete performance. */
router.delete('/:performanceId', function(req, res) {
  let clientId = req['user'].client_id;
  let performanceId = req.params.performanceId;

  deletePerformance(clientId, performanceId,
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

/* DELETE delete performances. */
router.delete('/', function(req, res) {
  let clientId = req['user'].client_id;
  let ids = [].concat(req.query.ids || []);

  let executor = new SequentialExecutor().chain();  
  let parallels = [];
  for(let i=0; i<ids.length; i++) {
    parallels.push((resolve, reject) => {
      deletePerformance(clientId, ids[i],
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

export const deletePerformance = (clientId: string, performanceId: string, onSuccess: () => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": performanceId,
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