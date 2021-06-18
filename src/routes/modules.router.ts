import { default as express } from 'express';
import { default as conf } from 'config'; 
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';
import { getClient } from './clients.router';

export const router = express.Router();

const tableName = conf.get('TABLE_MODULES');

/* GET modules listing. */
router.get('/', function(req, res) {
  let clientId = req['user'].client_id;

  getModules(clientId, 
    (modules) => {
      var resp = {"modules": modules};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getModules = (clientId: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {

  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, description, is_activated, is_activatable, no_of_users, max_licenses, sort_num',
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
      var modules = response.data;
      getClient(clientId, 
        (client) => {
          modules.forEach(module => {
            if(module.id == 'ADM') {
              module['no_of_users'] = client.administrators['no_of_users'];
              module['is_activatable'] = client.administrators['is_activatable'];
            } else if(module.id == 'TA') {
              module['no_of_users'] = client.assessments['no_of_users'];
              module['is_activatable'] = client.assessments['is_activatable'];
            } else if(module.id == 'PAI') {
              module['no_of_users'] = client.inspections['no_of_users'];
              module['is_activatable'] = client.inspections['is_activatable'];
            } else if(module.id == 'HR') {
              module['no_of_users'] = client.hazards['no_of_users'];
              module['is_activatable'] = client.hazards['is_activatable'];
            } else if(module.id == 'KPI') {
              module['no_of_users'] = client.kpis['no_of_users'];
              module['is_activatable'] = client.kpis['is_activatable'];
            } else if(module.id == 'AM') {
              module['no_of_users'] = client.actions['no_of_users'];
              module['is_activatable'] = client.actions['is_activatable'];
            } else if(module.id == 'II') {
              module['no_of_users'] = client.incidents['no_of_users'];
              module['is_activatable'] = client.incidents['is_activatable'];
            } else if(module.id == 'TRM') {
              module['no_of_users'] = client.managements['no_of_users'];
              module['is_activatable'] = client.managements['is_activatable'];
            } else if(module.id == 'TP') {
              module['no_of_users'] = client.plannings['no_of_users'];
              module['is_activatable'] = client.plannings['is_activatable'];
            } else if(module.id == 'LI') {
              module['no_of_users'] = client.indicators['no_of_users'];
              module['is_activatable'] = client.indicators['is_activatable'];
            }
          });

          onSuccess(modules);
        }, 
        (error) => {
          onError(error);
        }
      );
    } else {
      onError({
        message: 'No records found'
      })
    }
  });
};

/* PUT update module. */
router.put('/:moduleId', function(req, res, next) {
  let clientId = req['user'].client_id;
  let moduleId = req.params.moduleId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": moduleId,
    },
    UpdateExpression: 'set is_activated = :is_activated, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeValues: {
      ":is_activated": req.body.is_activated,
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

export const createModuleDefaults = (clientId: string, userEmail: string, 
  administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators,
  onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let createTime = moment().format();

  let error: any;
  let parallels = [];

  let modulesDefaults = [administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators];

  modulesDefaults.forEach(moduleDefault => {
    parallels.push(
      (resolve, reject) => {
        var params:any = {
          TableName: tableName,
          Item: {
            "partition_key": clientId,
            "sort_key": moduleDefault.id,
            "id": moduleDefault.id,
            "name": moduleDefault.name,
            "is_activatable": moduleDefault['is_activatable'],
            "is_activated": moduleDefault['is_activatable'],
            "max_licenses": moduleDefault.max_licenses,
            "no_of_users": moduleDefault['no_of_users'],
            "sort_num": moduleDefault.sort_num,
            "created_ts": createTime, 
            "created_by": userEmail,
            "updated_ts": createTime,
            "updated_by": userEmail
          }
        };
      
        ddb.insert(params, function(response) {
          if(response.data) {
            resolve(true);
          } else {
            error = response;
            reject(response);
          }
        });  
      
      }
    );
  });

  new SequentialExecutor().chain()
  .parallel(parallels)
  .success(() => {
    onSuccess("{ status: 'done' }");
  })
  .fail((error) => {
    onError(error);
  })
  .execute();
}

export const updateModuleDefaults = (clientId: string, userEmail: string, 
  administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators,
  onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let updateTime = moment().format();

  let error: any;
  let parallels = [];

  let moduleDefaults = [administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators];

  moduleDefaults.forEach(moduleDefault => {
    parallels.push(
      (resolve, reject) => {
        var params:any = {
          TableName: tableName,
          Key: {
            "partition_key": clientId,
            "sort_key": moduleDefault.id,
          },
          UpdateExpression: 'set \
            is_activatable = :is_activatable, \
            is_activated = :is_activated, \
            max_licenses = :max_licenses, \
            no_of_users = :no_of_users, \
            updated_ts = :updated_ts, \
            updated_by = :updated_by',
          ExpressionAttributeValues: {
            ":is_activatable": moduleDefault['is_activatable'],
            ":is_activated": moduleDefault['is_activatable'],
            ":max_licenses": moduleDefault.max_licenses,
            ":no_of_users": moduleDefault['no_of_users'],
            ":updated_ts": updateTime,
            ":updated_by": userEmail,
          },
          ReturnValues:"ALL_NEW"
        };

        ddb.update(params, function(response) {
          if(response.data) {
            resolve(true);
          } else {
            error = response;
            reject(response);
          }
        });  
      
      }
    );
  });

  new SequentialExecutor().chain()
  .parallel(parallels)
  .success(() => {
    onSuccess("{ status: 'done' }");
  })
  .fail((error) => {
    onError(error);
  })
  .execute();
}