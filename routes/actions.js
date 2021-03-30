var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');
var s3 = require('./s3');

var tableName = conf.get('TABLE_ACTIONS');
var supportingDocumentsGroup = "supporting-documents/actions"

/* GET actions listing. */
router.get('/', function(req, res, next) {
  let clientId = req.user.client_id;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, summary, assessor, assigned_to, date_created, date_due, email_text, completed_by, completed_date, actions_taken',
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
        return b.date_created.localeCompare(a.date_created);
      });

      var resp = {"actions": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET action. */
router.get('/:actionId', function(req, res) {
  var params = getQueryParams(req);

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      var resp = response.data[0];
      
      getSupportingDocuments(req, res, (data) => {        
        resp.supporting_documents = data;
        res.status(200);
        res.json(resp);
      });      
    } else {
      res.status(404);
      res.json();
    }
  });
});

const getSupportingDocuments = (req, res, callback) => {
  let clientId = req.user.client_id;
  let group = supportingDocumentsGroup;
  let subgroup = req.params.actionId;
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
  let actionId = req.params.actionId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, summary, assessor, assigned_to, date_created, date_due, email_text, completed_by, completed_date, actions_taken',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :actionId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":actionId": actionId
    },
  };

  return params;
}

/* PUT update action. */
router.put('/:actionId', function(req, res, next) {
  let clientId = req.user.client_id;
  let actionId = req.params.actionId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": actionId,
    },
    UpdateExpression: 'set #name = :name, \
      summary = :summary, \
      assessor = :assessor, \
      assigned_to = :assigned_to, \
      date_created = :date_created, \
      date_due = :date_due, \
      email_text = :email_text, \
      completed_by = :completed_by, \
      completed_date = :completed_date, \
      actions_taken = :actions_taken, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":summary": req.body.summary,
      ":assessor": req.body.assessor,
      ":assigned_to": req.body.assigned_to,
      ":date_created": req.body.date_created,
      ":date_due": req.body.date_due,
      ":email_text": req.body.email_text,
      ":completed_by": req.body.completed_by,
      ":completed_date": req.body.completed_date,
      ":actions_taken": req.body.actions_taken,
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
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* POST insert action. */
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
      "summary": req.body.summary,
      "assessor": req.body.assessor,
      "assigned_to": req.body.assigned_to,
      "date_created": req.body.date_created,
      "date_due": req.body.date_due,
      "email_text": req.body.email_text,
      "completed_by": req.body.completed_by,
      "completed_date": req.body.completed_date,
      "actions_taken": req.body.actions_taken,
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

      let group = supportingDocumentsGroup;
      let fromSubgroup = tempId;
      let toSubgroup = id;
      let fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
      let toKey = clientId + '/' + group + '/' + toSubgroup;
    
      moveFiles(fromKey, toKey, (moveResponse) => {
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

const moveFiles = (fromKey, toKey, callback) => {
  console.log("moving files from", fromKey, "to", toKey);
  s3.move(fromKey, toKey, function(response) {
    callback(response);
  });
};

/* DELETE delete action. */
router.delete('/:actionId', function(req, res) {
  let clientId = req.user.client_id;
  let actionId = req.params.actionId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": actionId,
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
