import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';

export const router = express.Router();

var tableName = conf.get('TABLE_MANAGEMENTS');

/* GET managements listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, completed_date, description, summary, leader, sort_num',
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
        return moment(b.completed_date).isAfter(moment(a.completed_date));
      });

      var resp = {"managements": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET management. */
router.get('/:managementId', function(req, res) {
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
  let managementId = req.params.managementId;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, completed_date, description, site_id, department_id, location_id, task_id, members, leader, element_compliance',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :managementId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":managementId": managementId
    },
  };

  return params;
}

/* PUT update management. */
router.put('/:managementId', function(req, res, next) {
  let clientId = req['user'].client_id;
  let managementId = req.params.managementId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": managementId,
    },
    UpdateExpression: 'set #name = :name, \
      completed_date = :completed_date, \
      description = :description, \
      site_id = :site_id, \
      department_id = :department_id, \
      location_id = :location_id, \
      task_id = :task_id, \
      leader = :leader, \
      members = :members, \
      element_compliance = :element_compliance, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":completed_date": req.body.completed_date,
      ":description": req.body.description,
      ":site_id": req.body.site_id,
      ":department_id": req.body.department_id,
      ":location_id": req.body.location_id,
      ":task_id": req.body.task_id,
      ":leader": req.body.leader,
      ":members": req.body.members,
      ":element_compliance": req.body.element_compliance,
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

/* POST insert management. */
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
      "description": req.body.description,
      "site_id": req.body.site_id,
      "department_id": req.body.department_id,
      "location_id": req.body.location_id,
      "task_id": req.body.task_id,
      "leader": req.body.leader,
      "members": req.body.members,
      "element_compliance": req.body.element_compliance,
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
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* DELETE delete management. */
router.delete('/:managementId', function(req, res) {
  let clientId = req['user'].client_id;
  let managementId = req.params.managementId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": managementId,
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


