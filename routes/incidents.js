var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');
var s3 = require('./s3');

var tableName = conf.get('TABLE_INCIDENTS');
var documentsGroup = "documents/incidents"
var supportingDocumentsGroup = "supporting-documents/incidents"

/* GET incidents listing. */
router.get('/', function(req, res, next) {
  let clientId = req.user.clientId;

  var params = {
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
        return b.completed_date.localeCompare(a.completed_date);
      });

      var resp = {"incidents": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET incident. */
router.get('/:incidentId', function(req, res) {
  var params = getQueryParams(req);

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      var resp = response.data[0];
      
      getDocument(req, res, (data) => {
        resp.documents = data;
        getSupportingDocuments(req, res, (data) => {
          resp.supporting_documents = data;
          res.status(200);
          res.json(resp);
        });
      });
    } else {
      res.status(404);
      res.json();
    }
  });
});

const getDocument = (req, res, callback) => {
  let clientId = req.user.clientId;
  let group = documentsGroup;
  let subgroup = req.params.incidentId;
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

const getSupportingDocuments = (req, res, callback) => {
  let clientId = req.user.clientId;
  let group = supportingDocumentsGroup;
  let subgroup = req.params.incidentId;
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
  let clientId = req.user.clientId;
  let incidentId = req.params.incidentId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, #comments, #action, completed_date, due_date, description, summary, site_id, department_id, location_id, task_id, key_findings, assessor, members, leader, closer, person_responsible, element_compliance, task_element_compliance, area_element_compliance, system_element_compliance, risk_compliance, rule_compliance',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :incidentId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
      "#comments": "comments",
      "#action": "action",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":incidentId": incidentId
    },
  };

  return params;
}

/* PUT update incident. */
router.put('/:incidentId', function(req, res, next) {
  let clientId = req.user.clientId;
  let incidentId = req.params.incidentId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": incidentId,
    },
    UpdateExpression: 'set #name = :name, \
      comments = :comments, \
      #action = :action, \
      completed_date = :completed_date, \
      due_date = :due_date, \
      description = :description, \
      summary = :summary, \
      key_findings = :key_findings, \
      site_id = :site_id, \
      department_id = :department_id, \
      location_id = :location_id, \
      task_id = :task_id, \
      assessor = :assessor, \
      person_responsible = :person_responsible, \
      leader = :leader, \
      members = :members, \
      closer = :closer, \
      element_compliance = :element_compliance, \
      task_element_compliance = :task_element_compliance, \
      area_element_compliance = :area_element_compliance, \
      system_element_compliance = :system_element_compliance, \
      risk_compliance = :risk_compliance, \
      rule_compliance = :rule_compliance, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
      "#action": "action",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":comments": req.body.comments,
      ":action": req.body.action,
      ":completed_date": req.body.completed_date,
      ":due_date": req.body.due_date,
      ":description": req.body.description,
      ":key_findings": req.body.key_findings,
      ":summary": req.body.summary,
      ":site_id": req.body.site_id,
      ":department_id": req.body.department_id,
      ":location_id": req.body.location_id,
      ":task_id": req.body.task_id,
      ":assessor": req.body.assessor,
      ":person_responsible": req.body.person_responsible,
      ":leader": req.body.leader,
      ":members": req.body.members,
      ":closer": req.body.closer,
      ":element_compliance": req.body.element_compliance,
      ":task_element_compliance": req.body.task_element_compliance,
      ":area_element_compliance": req.body.area_element_compliance,
      ":system_element_compliance": req.body.system_element_compliance,
      ":risk_compliance": req.body.risk_compliance,
      ":rule_compliance": req.body.rule_compliance,
      ":updated_ts": moment().format(),
      ":updated_by": req.user.emailAddress,
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

/* POST insert incident. */
router.post('/', function(req, res, next) {
  let clientId = req.user.clientId;
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
      "action": req.body.action,
      "comments": req.body.comments,
      "key_findings": req.body.key_findings,
      "completed_date": req.body.completed_date,
      "due_date": req.body.due_date,
      "description": req.body.description,
      "summary": req.body.summary,
      "site_id": req.body.site_id,
      "department_id": req.body.department_id,
      "location_id": req.body.location_id,
      "task_id": req.body.task_id,
      "assessor": req.body.assessor,
      "leader": req.body.leader,
      "members": req.body.members,
      "person_responsible": req.body.person_responsible,
      "closer": req.body.closer,
      "element_compliance": req.body.element_compliance,
      "task_element_compliance": req.body.task_element_compliance,
      "area_element_compliance": req.body.area_element_compliance,
      "system_element_compliance": req.body.system_element_compliance,
      "risk_compliance": req.body.risk_compliance,
      "rule_compliance": req.body.rule_compliance,
      "sort_num": 1,
      "created_ts": createTime, 
      "created_by": req.user.emailAddress,
      "updated_ts": createTime,
      "updated_by": req.user.emailAddress
    }
  };

  ddb.insert(params, function(response) {
    if (response.data) {
      var resp = response.data;
      delete resp['partition_key'];
      delete resp['sort_key'];

      let fromSubgroup = tempId;
      let toSubgroup = id;

      let group = documentsGroup;
      let fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
      let toKey = clientId + '/' + group + '/' + toSubgroup;
    
      console.log("fromKey", fromKey, "toKey", toKey);
      moveFiles(fromKey, toKey, (moveDocumentResponse) => {
        if (moveDocumentResponse.error) {
          res.status(400);
          res.json(moveDocumentResponse);
        } else {
          group = supportingDocumentsGroup;
          fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
          toKey = clientId + '/' + group + '/' + toSubgroup;
          console.log("fromKey", fromKey, "toKey", toKey);
          moveFiles(fromKey, toKey, (moveSupportingDocumentsResponse) => {
            if (moveSupportingDocumentsResponse.error) {
              res.status(400);
              res.json(moveSupportingDocumentsResponse);
            } else {
              res.status(200);
              res.json(resp);
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

const moveFiles = (fromKey, toKey, callback) => {
  console.log("moving files from", fromKey, "to", toKey);
  s3.move(fromKey, toKey, function(response) {
    callback(response);
  });
};

/* DELETE delete incident. */
router.delete('/:incidentId', function(req, res) {
  let clientId = req.user.clientId;
  let incidentId = req.params.incidentId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": incidentId,
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
