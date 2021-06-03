import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { s3_service as s3 } from '../services/s3.service';
import { isAfter } from '../common/date-util';

import { SequentialExecutor } from '../common/sequential-executor';

export const router = express.Router();

var tableName = conf.get('TABLE_INCIDENTS');
var documentsGroup = "documents/incidents"
var supportingDocumentsGroup = "supporting-documents/incidents"

/* GET incidents listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  let siteId = req.query.site_id;

  getIncidents(clientId, siteId, 
    (data) => {
      data.sort(function (a, b) {
        return isAfter(b.completed_date, a.completed_date) ? 1 : -1;
      });

      var resp = {"incidents": data};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getIncidents = (clientId: string, siteId: any, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  
  var params:any = {};

  if(siteId) {
    params = {
      TableName: tableName,
      IndexName: "SiteIndex",
      ProjectionExpression: 'id, #name, completed_date, #action, area_element_compliance, assessor, \
      closer, #comments, created_by, created_ts, department_id, description, due_date, element_compliance, key_findings, \
      leader, location_id, members, person_responsible, risk_compliance, rule_compliance, site_id, summary, system_element_compliance, \
      task_causes, task_element_compliance, task_id, near_miss',
      KeyConditionExpression: '#partition_key = :clientId and site_id = :site_id',
      ExpressionAttributeNames:{
        "#partition_key": "partition_key",
        "#name": "name",
        "#comments": "comments",
        "#action": "action",
        },
      ExpressionAttributeValues: {
        ":clientId": clientId,
        ":site_id": siteId
      },
    };
  } else {
    params = {
      TableName: tableName,
      ProjectionExpression: 'id, #name, completed_date, #action, area_element_compliance, assessor, \
      closer, #comments, created_by, created_ts, department_id, description, due_date, element_compliance, key_findings, \
      leader, location_id, members, person_responsible, risk_compliance, rule_compliance, site_id, summary, system_element_compliance, \
      task_causes, task_element_compliance, task_id, near_miss',
      KeyConditionExpression: '#partition_key = :clientId',
      ExpressionAttributeNames:{
        "#partition_key": "partition_key",
        "#name": "name",
        "#comments": "comments",
        "#action": "action",
      },
      ExpressionAttributeValues: {
        ":clientId": clientId
      },
    };
  }

  ddb.query(params, function(response) {
    if(response.data) {
      onSuccess(response.data);
    } else {
      onError(response);
    }
  });
}


/* GET incident. */
router.get('/:incidentId', function(req, res) {
  let clientId = req['user'].client_id;
  let incidentId = req.params.incidentId;

  getIncident(clientId, incidentId, 
    (data) => {
      var resp = data;
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getIncident = (clientId: string, incidentId: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  var params = getQueryParams(clientId, incidentId);

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      var resp = response.data[0];
      
      let subgroup = incidentId;

      getDocument(clientId, subgroup, 
        (data) => {
          resp.documents = data;
          getSupportingDocuments(clientId, subgroup, (data) => {
            resp.supporting_documents = data;
            onSuccess(resp);
          }), 
          (error) => {
            onError(error);
          };
        },
        (error) => {
          onError(error);
        }
      );
    } else {
      onError({ 
        error: {
          message: "Incident not found", 
          id: incidentId
        }
      });
    }
  });
};

const getDocument = (clientId, subgroup, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let group = documentsGroup;
  let key = clientId + '/' + group + '/' + subgroup;

  s3.list(key, function(response) {
    if (response.data) {
      onSuccess(response.data);
    } else {
      onError(response);
    }
  });
} 

const getSupportingDocuments = (clientId, subgroup, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let group = supportingDocumentsGroup;
  let key = clientId + '/' + group + '/' + subgroup;

  s3.list(key, function(response) {
    if (response.data) {
      onSuccess(response.data);
    } else {
      onError(response);
    }
  });
} 

const getQueryParams = (clientId, incidentId) => {
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, #comments, #action, completed_date, due_date, description, summary, site_id, department_id, location_id, task_id, key_findings, assessor, members, leader, closer, person_responsible, element_compliance, task_causes, area_element_compliance, system_element_compliance, risk_compliance, rule_compliance, near_miss',
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
  let clientId = req['user'].client_id;
  let incidentId = req.params.incidentId;

  var params:any = {
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
      near_miss = :near_miss, \
      element_compliance = :element_compliance, \
      task_causes = :task_causes, \
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
      ":near_miss": req.body.near_miss,
      ":element_compliance": req.body.element_compliance,
      ":task_causes": req.body.task_causes,
      ":area_element_compliance": req.body.area_element_compliance,
      ":system_element_compliance": req.body.system_element_compliance,
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

      var actionsParams = {
        TableName: conf.get('TABLE_ACTIONS'),
        Key: {
          "partition_key": clientId,
          "sort_key": incidentId,
        },
        UpdateExpression: 'set summary = :summary, assessor = :assessor, assigned_to = :assigned_to, date_due = :date_due, updated_ts = :updated_ts, updated_by = :updated_by',
        ExpressionAttributeValues: {
          ":summary": req.body.action,
          ":assessor": req.body.assessor,
          ":assigned_to": req.body.person_responsible,
          ":date_due": req.body.due_date, 
          ":updated_ts": moment().format(),
          ":updated_by": req['user'].email,
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

/* POST insert incident. */
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
      "near_miss": req.body.near_miss,
      "element_compliance": req.body.element_compliance,
      "task_causes": req.body.task_causes,
      "area_element_compliance": req.body.area_element_compliance,
      "system_element_compliance": req.body.system_element_compliance,
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

      let group = documentsGroup;
      let fromSubgroup = tempId;
      let toSubgroup = id;

      let fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
      let toKey = clientId + '/' + group + '/' + toSubgroup;
    
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

              var actionsParams = {
                TableName: conf.get('TABLE_ACTIONS'),
                Item: {
                  "partition_key": clientId,
                  "sort_key": id,
                  "id": id,
                  "name": name,
                  "summary": req.body.action,
                  "assessor": req.body.assessor,
                  "assigned_to": req.body.person_responsible,
                  "date_created": createTime, 
                  "date_due": req.body.due_date, 
                  "status": "Open",
                  "created_ts": createTime, 
                  "created_by": req['user'].email,
                  "updated_ts": createTime,
                  "updated_by": req['user'].email
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
  let clientId = req['user'].client_id;
  let incidentId = req.params.incidentId;

  deleteIncident(clientId, incidentId,
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

/* DELETE delete incidents. */
router.delete('/', function(req, res) {
  let clientId = req['user'].client_id;
  let ids = [].concat(req.query.ids || []);

  let executor = new SequentialExecutor().chain();  
  let parallels = [];
  for(let i=0; i<ids.length; i++) {
    parallels.push((resolve, reject) => {
      deleteIncident(clientId, ids[i],
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

export const deleteIncident = (clientId: string, incidentId: string, onSuccess: () => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": incidentId,
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