var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');
var s3 = require('./s3');

var tableName = conf.get('TABLE_HAZARDS');

/* GET hazards listing. */
router.get('/', function(req, res, next) {
  let clientId = req.user.client_id;
  let siteId = req.query.site_id;

  var params = {};

  if(siteId) {
    params = {
      TableName: tableName,
      IndexName: "SiteIndex",
      ProjectionExpression: 'id, #name, completed_date, assessor, hazard_type',
      KeyConditionExpression: '#partition_key = :clientId and site_id = :site_id',
      ExpressionAttributeNames:{
        "#partition_key": "partition_key",
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":clientId": clientId,
        ":site_id": siteId
      },
    };
  } else {
    params = {
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
  }

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return b.completed_date.localeCompare(a.completed_date);
      });

      var resp = {"hazards": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET hazard. */
router.get('/:hazardId', function(req, res) {
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
  let clientId = req.user.client_id;
  let group = "images/hazards";
  let subgroup = req.params.hazardId;
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
  let clientId = req.user.client_id;
  let hazardId = req.params.hazardId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, actions_taken, key_findings, further_actions_required, completed_date, due_date, summary, site_id, department_id, location_id, task_id, assessor, person_responsible, recipients, risk_rating, hazard_type, element_compliance, risk_compliance, rule_compliance',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :hazardId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":hazardId": hazardId
    },
  };

  return params;
}

/* PUT update hazard. */
router.put('/:hazardId', function(req, res, next) {
  let clientId = req.user.client_id;
  let hazardId = req.params.hazardId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": hazardId,
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
      recipients = :recipients, \
      risk_rating = :risk_rating, \
      hazard_type = :hazard_type, \
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
      ":recipients": req.body.recipients,
      ":risk_rating": req.body.risk_rating,
      ":hazard_type": req.body.hazard_type,
      ":element_compliance": req.body.element_compliance,
      ":risk_compliance": req.body.risk_compliance,
      ":rule_compliance": req.body.rule_compliance,
      ":updated_ts": moment().format(),
      ":updated_by": req.user.email,
    },
    ReturnValues:"ALL_NEW"
  };

  ddb.update(params, function(response) {
    
    if (response.data) {
      var resp = response.data;
      delete resp['partition_key'];
      delete resp['sort_key'];
      
      var actionsParams = {
        TableName: conf.get('TABLE_ACTIONS'),
        Key: {
          "partition_key": clientId,
          "sort_key": hazardId,
        },
        UpdateExpression: 'set summary = :summary, assessor = :assessor, assigned_to = :assigned_to, date_due = :date_due, updated_ts = :updated_ts, updated_by = :updated_by',
        ExpressionAttributeValues: {
          ":summary": req.body.further_actions_required,
          ":assessor": req.body.assessor,
          ":assigned_to": req.body.person_responsible,
          ":date_due": req.body.due_date, 
          ":updated_ts": moment().format(),
          ":updated_by": req.user.email,
        },
        ReturnValues:"ALL_NEW"
      };
    
      ddb.update(actionsParams, function(response) {
        
        if (response.data) {
          res.status(200);
          res.json(resp);
        } else {
          res.status(400);
          res.json(response);
        }
      });
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* POST insert hazard. */
router.post('/', function(req, res, next) {
  let clientId = req.user.client_id;
  let createTime = moment().format();
  let id = uuid.v4();
  let name = id.replace(/-/g, "").substring(0, 12).toUpperCase();

  let tempId = req.body.id;

  var params = {
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
      "recipients": req.body.recipients,
      "risk_rating": req.body.risk_rating,
      "hazard_type": req.body.hazard_type,
      "element_compliance": req.body.element_compliance,
      "risk_compliance": req.body.risk_compliance,
      "rule_compliance": req.body.rule_compliance,
      "sort_num": 1,
      "created_ts": createTime, 
      "created_by": req.user.email,
      "updated_ts": createTime,
      "updated_by": req.user.email
    }
  };

  ddb.insert(params, function(response) {
    if (response.data) {
      var resp = response.data;
      delete resp['partition_key'];
      delete resp['sort_key'];

      let group = "images/hazards";
      let fromSubgroup = tempId;
      let toSubgroup = id;
      let fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
      let toKey = clientId + '/' + group + '/' + toSubgroup;
    
      movePhotographs(fromKey, toKey, (moveResponse) => {
        if (moveResponse.error) {
          res.status(400);
          res.json(response);
        } else {

          var actionsParams = {
            TableName: conf.get('TABLE_ACTIONS'),
            Item: {
              "partition_key": clientId,
              "sort_key": id,
              "id": id,
              "name": name,
              "summary": req.body.further_actions_required,
              "assessor": req.body.assessor,
              "assigned_to": req.body.person_responsible,
              "date_created": createTime, 
              "date_due": req.body.due_date, 
              "status": "Open",
              "created_ts": createTime, 
              "created_by": req.user.email,
              "updated_ts": createTime,
              "updated_by": req.user.email
            }
          };
        
          ddb.insert(actionsParams, function(response) {
            if (response.data) {
              res.status(200);
              res.json(resp);
            } else {
              res.status(400);
              res.json(response);
            }
          });
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

/* DELETE delete hazard. */
router.delete('/:hazardId', function(req, res) {
  let clientId = req.user.client_id;
  let hazardId = req.params.hazardId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": hazardId,
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

module.exports = router;
