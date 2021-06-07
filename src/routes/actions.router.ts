import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { s3_service as s3 } from '../services/s3.service';

import { SequentialExecutor } from '../common/sequential-executor';
import { isAfter } from '../common/date-util';

export const router = express.Router();

var tableName = conf.get('TABLE_ACTIONS');
var supportingDocumentsGroup = "supporting-documents/actions"

/* GET actions listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  getActions(clientId, 
    (data) => {
      data.sort(function (a, b) {
        return isAfter(b.date_created, a.date_created) ? 1 : -1;
      });
      
      var resp = {"actions": data};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getActions = (clientId: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  
  var params:any = {
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
    
    if(response.data) {
      onSuccess(response.data);
    } else {
      onError(response);
    }
  });
};

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
  let clientId = req['user'].client_id;
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
  let clientId = req['user'].client_id;
  let actionId = req.params.actionId;
  
  var params:any = {
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
  let clientId = req['user'].client_id;
  let actionId = req.params.actionId;

  var params:any = {
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

/* POST insert action. */
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
  let clientId = req['user'].client_id;
  let actionId = req.params.actionId;

  deleteAction(clientId, actionId,
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

/* DELETE delete actions. */
router.delete('/', function(req, res) {
  let clientId = req['user'].client_id;
  let ids = [].concat(req.query.ids || []);

  let executor = new SequentialExecutor().chain();  
  let parallels = [];
  for(let i=0; i<ids.length; i++) {
    parallels.push((resolve, reject) => {
      deleteAction(clientId, ids[i],
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

export const deleteAction = (clientId: string, actionId: string, onSuccess: () => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": actionId,
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