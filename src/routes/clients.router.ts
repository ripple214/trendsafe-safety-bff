import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';
import { createUser, deleteUser, getAllUsers } from './users.router';
import { createAuth } from './auth.router';
import { createModuleDefaults, updateModuleDefaults } from './modules.router';
import { createDefaultKvps } from './kvps.router';
import { createDefaultCategoryElements } from './category-elements.router';

export const router = express.Router();

const tableName = conf.get('TABLE_CLIENTS');

/* GET clients listing. */
router.get('/', function(req, res) {
  getAllClients( 
    (data) => {
      var resp = {"clients": data};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getAllClients = (onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let adminId = 'ALL';
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, email, administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators',
    KeyConditionExpression: '#partition_key = :adminId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":adminId": adminId
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
   
      new SequentialExecutor().chain()
      .parallel(getCountParallels(response.data))
      .success(() => {
        onSuccess(response.data);
      })
      .fail(error => {
        onError(error);
      })
      .execute();

    } else {
      onError(response);
    }
  });
}

/* GET client. */
router.get('/:clientId', function(req, res) {
  let clientId = req.params.clientId;

  getClient(clientId, 
    (data) => {
      res.status(200);
      res.json(data);
    }, 
    (error) => {
      res.status(404);
      res.json(error);
    }
  );
});

export const getClient = (clientId, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let adminId = 'ALL';
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, first_name, last_name, email, administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators',
    KeyConditionExpression: '#partition_key = :adminId and #sort_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":adminId": adminId,
      ":clientId": clientId
    },
  };

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      let client= response.data[0];
      new SequentialExecutor().chain()
      .then((resolve, reject) => {
        getCount(client, resolve, reject);
      })
      .success(() => {
        onSuccess(response.data[0]);
      })
      .fail(error => {
        onError(error);
      })
      .execute();
    } else {
      onError({
        error: {
            message: "Client not found",
            id: clientId
        }
      });
    }
  });
}

const getCountParallels = (clients): any[] => {
  let parallels = [];
  if(clients) {
    clients.forEach(client => {
      parallels.push((resolve,reject) => {
        getCount(client, resolve,reject);
      });
    });
  }

  return parallels;
}

const getCount = (client, resolve, reject) => {
  let administrators = 0;
  let assessments = 0;
  let inspections = 0;
  let hazards = 0;
  let kpis = 0;
  let actions = 0;
  let incidents = 0;
  let managements = 0;
  let plannings = 0;
  let indicators = 0;

  let assessments_is_activatable = (client.assessments ? (client.assessments['is_activatable'] || false) : false);
  let inspections_is_activatable = (client.inspections ? (client.inspections['is_activatable'] || false) : false);
  let hazards_is_activatable = (client.hazards ? (client.hazards['is_activatable'] || false) : false);
  let kpis_is_activatable = (client.kpis ? (client.kpis['is_activatable'] || false) : false);
  let actions_is_activatable = (client.actions ? (client.actions['is_activatable'] || false) : false);
  let incidents_is_activatable = (client.incidents ? (client.incidents['is_activatable'] || false) : false);
  let managements_is_activatable = (client.managements ? (client.managements['is_activatable'] || false) : false);
  let plannings_is_activatable = (client.plannings ? (client.plannings['is_activatable'] || false) : false);
  let indicators_is_activatable = (client.indicators ? (client.indicators['is_activatable'] || false) : false);

  getAllUsers(client.id, 
    (users) => {
      if(users) {
        users.forEach(user => {
          if(user.administrator == 'Y') {
            administrators++;
          }

          if(user.module_access) {
            user.module_access.forEach(access => {
              if(access == 'TA') {
                assessments++;
              } else if(access == 'PAI') {
                inspections++;
              } else if(access == 'HR') {
                hazards++;
              } else if(access == 'KPI') {
                kpis++;
              } else if(access == 'AM') {
                actions++;
              } else if(access == 'II') {
                incidents++;
              } else if(access == 'TRM') {
                managements++;
              } else if(access == 'TP') {
                plannings++;
              } else if(access == 'LI') {
                indicators++;
              }
            });
          }
        });
      }

      client.administrators = {
        id: 'ADM',
        name: 'Administrators',
        sort_num: 1,
        is_activatable: true,
        is_activated: true,
        no_of_users: administrators,
        max_licenses: (client.administrators ? (client.administrators['max_licenses'] || 0) : 0) 
      }

      client.assessments = {
        id: 'TA',
        name: 'Task Assessment',
        sort_num: 2,
        is_activatable: assessments_is_activatable,
        is_activated: assessments_is_activatable,
        no_of_users: assessments,
        max_licenses: (client.assessments ? (client.assessments['max_licenses'] || 0) : 0) 
      }

      client.inspections = {
        id: 'PAI',
        name: 'Plant / Area Inspection',
        sort_num: 3,
        is_activatable: inspections_is_activatable,
        is_activated: inspections_is_activatable,
        no_of_users: inspections,
        max_licenses: (client.inspections ? (client.inspections['max_licenses'] || 0) : 0) 
      }

      client.hazards = {
        id: 'HR',
        name: 'Hazard Report',
        sort_num: 4,
        is_activatable: hazards_is_activatable,
        is_activated: hazards_is_activatable,
        no_of_users: hazards,
        max_licenses: (client.hazards ? (client.hazards['max_licenses'] || 0) : 0) 
      }

      client.kpis = {
        id: 'KPI',
        name: 'Key Performance Indicators',
        sort_num: 5,
        is_activatable: kpis_is_activatable,
        is_activated: kpis_is_activatable,
        no_of_users: kpis,
        max_licenses: (client.kpis ? (client.kpis['max_licenses'] || 0) : 0) 
      }

      client.actions = {
        id: 'AM',
        name: 'Action Management',
        sort_num: 6,
        is_activatable: actions_is_activatable,
        is_activated: actions_is_activatable,
        no_of_users: actions,
        max_licenses: (client.actions ? (client.actions['max_licenses'] || 0) : 0) 
      }

      client.incidents = {
        id: 'II',
        name: 'Incident Investigation',
        sort_num: 7,
        is_activatable: incidents_is_activatable,
        is_activated: incidents_is_activatable,
        no_of_users: incidents,
        max_licenses: (client.incidents ? (client.incidents['max_licenses'] || 0) : 0) 
      }

      client.managements = {
        id: 'TRM',
        name: 'Task Risk Management',
        sort_num: 8,
        is_activatable: managements_is_activatable,
        is_activated: managements_is_activatable,
        no_of_users: managements,
        max_licenses: (client.managements ? (client.managements['max_licenses'] || 0) : 0) 
      }

      client.plannings = {
        id: 'TP',
        name: 'Task Planning',
        sort_num: 9,
        is_activatable: plannings_is_activatable,
        is_activated: plannings_is_activatable,
        no_of_users: plannings,
        max_licenses: (client.plannings ? (client.plannings['max_licenses'] || 0) : 0) 
      }

      client.indicators = {
        id: 'LI',
        name: 'Lead Indicators',
        sort_num: 10,
        is_activatable: indicators_is_activatable,
        is_activated: indicators_is_activatable,
        no_of_users: indicators,
        max_licenses: (client.indicators ? (client.indicators['max_licenses'] || 0) : 0) 
      }

      resolve(true);
    }, 
    (error) => {
      reject(error);
    }
  );
}

/* POST insert client. */
router.post('/', function(req, res) {
  let name = req.body.name;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let email = req.body.email;
  let administrators = req.body.administrators;
  let assessments = req.body.assessments;
  let inspections = req.body.inspections;
  let hazards = req.body.hazards;
  let incidents = req.body.incidents;
  let kpis = req.body.kpis;
  let actions = req.body.actions;
  let managements = req.body.managements;
  let plannings = req.body.plannings;
  let indicators = req.body.indicators;

  let resp: any;
  let error: any;
  let clientId: string;
  let userId: string;
  new SequentialExecutor()
  .chain((resolve, reject) => {
    createClient(name, first_name, last_name, email, administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators, req['user'].email, 
    (data) => {
      resp = data;
      clientId = data.sort_key;
      resolve(true);
    }, 
    (err) => {
      error = err;
      reject(err);
    });
  })
  .then((resolve, reject) => {
    createModuleDefaults(clientId, req['user'].email,
    administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators, 
    (data) => {
      resolve(true);
    }, (err) => {
      error = err;
      reject(err);
    });
  })
  .then((resolve, reject) => {
    createUser(clientId, {
      body: {
        last_name: last_name, 
        first_name: first_name, 
        email: email, 
        administrator: "Y", 
        leader: "true", 
        authorizer : "true",
        module_access: []
      }, 
      user: {
        email: req['user'].email
      }
    }, 
      (data) => {
        userId = data.id;
        resolve(true);
      }, (err) => {
        error = err;
        reject(err);
      });
    }
  )
  .then((resolve, reject) => {
    createAuth(email, clientId, userId, req['user'].email, 
      (data) => {
        resolve(true);
      }, (err) => {
        error = err;
        reject(err);
      });
    }
  )
  .parallel([
    (resolve, reject) => {
      createDefaultKvps(clientId, userId, req['user'].email, 
      (data) => {
        resolve(true);
      }, (err) => {
        error = err;
        reject(err);
      });
    },
    (resolve, reject) => {
      createDefaultCategoryElements(clientId, userId, req['user'].email, 
      (data) => {
        resolve(true);
      }, (err) => {
        error = err;
        reject(err);
      });
    },
    
  ])
  .success(() => {
    delete resp['partition_key'];
    delete resp['sort_key'];
    res.status(200);
    res.json(resp);
  })
  .fail((error) => {
    res.status(400);
    res.json(error);
  })
  .execute();
  
});

const createClient = (name, first_name, last_name, email, administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators, userEmail, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let adminId = 'ALL';
  let createTime = moment().format();
  let id = uuid();

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": adminId,
      "sort_key": id,
      "id": id,
      "name": name,
      "first_name": first_name,
      "last_name": last_name,
      "email": email,
      "administrators": administrators,
      "assessments": assessments,
      "inspections": inspections,
      "hazards": hazards,
      "incidents": incidents,
      "kpis": kpis,
      "actions": actions,
      "managements": managements,
      "plannings": plannings,
      "indicators": indicators,
      "created_ts": createTime, 
      "created_by": userEmail,
      "updated_ts": createTime,
      "updated_by": userEmail
    }
  };

  ddb.insert(params, function(response) {
    if(response.data) {
      onSuccess(response.data);
    } else {
      onError(response);
    }
  });   
}

/* PUT update client. */
router.put('/:id', function(req, res) {
  let adminId = 'ALL';
  let id = req.params.id;
  let name = req.body.name;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let email = req.body.email;
  let administrators = req.body.administrators;
  let assessments = req.body.assessments;
  let inspections = req.body.inspections;
  let hazards = req.body.hazards;
  let incidents = req.body.incidents;
  let kpis = req.body.kpis;
  let actions = req.body.actions;
  let managements = req.body.managements;
  let plannings = req.body.plannings;
  let indicators = req.body.indicators;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": adminId,
      "sort_key": id,
    },
    UpdateExpression: 'set #name = :name, first_name = :first_name, last_name = :last_name, email = :email, \
    administrators = :administrators, assessments = :assessments, inspections = :inspections, hazards = :hazards, \
    incidents = :incidents, kpis = :kpis, actions = :actions, managements = :managements, plannings = :plannings, indicators = :indicators, \
    updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": name,
      ":first_name": first_name,
      ":last_name": last_name,
      ":email": email,
      ":administrators": administrators,
      ":assessments": assessments,
      ":inspections": inspections,
      ":hazards": hazards,
      ":incidents": incidents,
      ":kpis": kpis,
      ":actions": actions,
      ":managements": managements,
      ":plannings": plannings,
      ":indicators": indicators,
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

      updateModuleDefaults(id, req['user'].email,
      administrators, assessments, inspections, hazards, incidents, kpis, actions, managements, plannings, indicators, 
      (data) => {
        res.status(200);
        res.json(resp);
      }, (err) => {
        res.status(400);
        res.json(response);
      });

    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* DELETE delete client. */
router.delete('/:clientId', function(req, res) {
  let adminId = 'ALL';
  let clientId = req.params.clientId;

  let client = undefined;

  let chain = new SequentialExecutor()
  .chain((resolve, reject) => {
    getClient(clientId, 
      (data) => {
        client = data;
        resolve(true);
      }, 
      (error) => {
        reject(error);
      }
    );
  });

  let parallels = [];
  getAllUsers(clientId, 
    (data) => {
      data.forEach(user => {
        parallels.push((resolve, reject) => {
          deleteUser(clientId, user.id, 
            (data) => {
              resolve(true);
            }, 
            (error) => {
              reject(error);
            }
          );
        });

      })
    }, 
    (error) => {
      res.status(500);
      res.json(error);
      return;
    }
  );

  chain.parallel(parallels)
  .then((resolve, reject) => {
    var params:any = {
      TableName: tableName,
      Key: {
        "partition_key": adminId,
        "sort_key": clientId,
      },
    };
  
    ddb.delete(params, function(response) {
      if (!response.error) {
        resolve(true);
      } else {
        reject(response);
      }
    });
  })
  .success(() => {
    res.status(204);
    res.json();
  })
  .fail((error) => {
    res.status(400);
    res.json(error);
  })
  .execute();


});


