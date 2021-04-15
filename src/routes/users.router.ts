import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';

export const router = express.Router();

var tableName = conf.get('TABLE_USERS');

/* GET users listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  getUsers(clientId, 
    (data) => {
      var resp = {"users": data};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getUsers = (clientId, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, last_name, first_name, email, administrator, leader, #user, authorizer, recipient, module_access, \
    dataEntryDivisionIds, dataEntryProjectIds, dataEntrySiteIds, dataEntrySubsiteIds, dataEntryDepartmentIds, \
    reportingDivisionIds, reportingProjectIds, reportingSiteIds, reportingSubsiteIds, reportingDepartmentIds',
    KeyConditionExpression: '#partition_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#user": "user"
    },
    ExpressionAttributeValues: {
      ":clientId": clientId
    },
  };

  ddb.query(params, function(response) {
    if(response.data) {
      response.data.sort(function (a, b) {
        return (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name);
      });
      
      onSuccess(response.data);
    } else {
      onError(response);
    }    
  });
}

/* GET administrators listing. */
router.get('/admins', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
    TableName: tableName,
    IndexName: "AdministratorIndex",
    ProjectionExpression: 'id, last_name, first_name, email, administrator, leader, #user, authorizer, recipient, module_access, \
    dataEntryDivisionIds, dataEntryProjectIds, dataEntrySiteIds, dataEntrySubsiteIds, dataEntryDepartmentIds, \
    reportingDivisionIds, reportingProjectIds, reportingSiteIds, reportingSubsiteIds, reportingDepartmentIds',
    KeyConditionExpression: '#partition_key = :clientId and #administrator = :administrator',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#administrator": "administrator",
      "#user": "user"
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":administrator": 'Y'
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name);
      });

      var resp = {"users": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET users listing. */
router.get('/users', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
    TableName: tableName,
    IndexName: "AdministratorIndex",
    ProjectionExpression: 'id, last_name, first_name, email, administrator, leader, #user, authorizer, recipient, module_access, \
    dataEntryDivisionIds, dataEntryProjectIds, dataEntrySiteIds, dataEntrySubsiteIds, dataEntryDepartmentIds, \
    reportingDivisionIds, reportingProjectIds, reportingSiteIds, reportingSubsiteIds, reportingDepartmentIds',
    KeyConditionExpression: '#partition_key = :clientId and #administrator = :administrator',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#administrator": "administrator",
      "#user": "user"
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":administrator": 'N'
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name);
      });

      var resp = {"users": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET user. */
router.get('/:userId', function(req, res) {
  let clientId = req['user'].client_id;
  let userId = req.params.userId;

  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, last_name, first_name, email, administrator, leader, #user, authorizer, recipient, module_access, \
    dataEntryDivisionIds, dataEntryProjectIds, dataEntrySiteIds, dataEntrySubsiteIds, dataEntryDepartmentIds, \
    reportingDivisionIds, reportingProjectIds, reportingSiteIds, reportingSubsiteIds, reportingDepartmentIds',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :userId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#user": "user"
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":userId": userId
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      var resp = response.data[0];
      res.status(200);
      res.json(resp);
    } else {
      res.status(404);
      res.json(response);
    }
  });
});

/* PUT update user. */
router.put('/:userId', function(req, res, next) {
  let clientId = req['user'].client_id;
  let userId = req.params.userId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": userId,
    },
    UpdateExpression: 'set \
    last_name = :last_name, first_name = :first_name, email = :email, \
    administrator = :administrator, leader = :leader, #user = :user, \
    authorizer = :authorizer, recipient = :recipient, \
    module_access = :module_access, \
    dataEntryDivisionIds = :dataEntryDivisionIds, \
    dataEntryProjectIds = :dataEntryProjectIds, \
    dataEntrySiteIds = :dataEntrySiteIds, \
    dataEntrySubsiteIds = :dataEntrySubsiteIds, \
    dataEntryDepartmentIds = :dataEntryDepartmentIds, \
    reportingDivisionIds = :reportingDivisionIds, \
    reportingProjectIds = :reportingProjectIds, \
    reportingSiteIds = :reportingSiteIds, \
    reportingSubsiteIds = :reportingSubsiteIds, \
    reportingDepartmentIds = :reportingDepartmentIds, \
    updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#user": "user"
    },
    ExpressionAttributeValues: {
      ":last_name": req.body.last_name, 
      ":first_name": req.body.first_name, 
      ":email": req.body.email, 
      ":administrator": req.body.administrator, 
      ":leader": req.body.leader, 
      ":user": req.body.user && !req.body.leader, 
      ":authorizer": req.body.authorizer, 
      ":recipient": req.body.recipient,
      ":module_access": req.body.module_access,

      ":dataEntryDivisionIds": req.body.dataEntryDivisionIds,
      ":dataEntryProjectIds": req.body.dataEntryProjectIds,
      ":dataEntrySiteIds": req.body.dataEntrySiteIds,
      ":dataEntrySubsiteIds": req.body.dataEntrySubsiteIds,
      ":dataEntryDepartmentIds": req.body.dataEntryDepartmentIds,
    
      ":reportingDivisionIds": req.body.reportingDivisionIds,
      ":reportingProjectIds": req.body.reportingProjectIds,
      ":reportingSiteIds": req.body.reportingSiteIds,
      ":reportingSubsiteIds": req.body.reportingSubsiteIds,
      ":reportingDepartmentIds": req.body.reportingDepartmentIds,

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

/* POST insert user. */
router.post('/', function(req, res, next) {
  let clientId = req['user'].client_id;
  let createTime = moment().format();
  let id = uuid();

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "last_name": req.body.last_name, 
      "first_name": req.body.first_name, 
      "email": req.body.email, 
      "administrator": req.body.administrator, 
      "leader": req.body.leader, 
      "user": req.body.user && !req.body.leader, 
      "authorizer": req.body.authorizer, 
      "recipient": req.body.recipient,
      "module_access": req.body.module_access,

      "dataEntryDivisionIds": req.body.dataEntryDivisionIds,
      "dataEntryProjectIds": req.body.dataEntryProjectIds,
      "dataEntrySiteIds": req.body.dataEntrySiteIds,
      "dataEntrySubsiteIds": req.body.dataEntrySubsiteIds,
      "dataEntryDepartmentIds": req.body.dataEntryDepartmentIds,
    
      "reportingDivisionIds": req.body.reportingDivisionIds,
      "reportingProjectIds": req.body.reportingProjectIds,
      "reportingSiteIds": req.body.reportingSiteIds,
      "reportingSubsiteIds": req.body.reportingSubsiteIds,
      "reportingDepartmentIds": req.body.reportingDepartmentIds,

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

/* DELETE delete user. */
router.delete('/:userId', function(req, res) {
  let clientId = req['user'].client_id;
  let userId = req.params.userId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": userId,
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


