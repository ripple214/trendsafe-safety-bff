import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';
import { createUser, deleteUser, getAllUsers } from './users.router';
import { createAuth } from './auth.router';
import { createDefaultModules } from './modules.router';
import { createDefaultKvps } from './kvps.router';
import { createDefaultKpis } from './kpis.router';
import { createDefaultCategoryElements } from './category-elements.router';

export const router = express.Router();

var tableName = conf.get('TABLE_CLIENTS');

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
    ProjectionExpression: 'id, #name, email, administrators, assessments, inspections, hazards, incidents, managements, plannings',
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
    ProjectionExpression: 'id, #name, first_name, last_name, email, administrators, assessments, inspections, hazards, incidents, managements, plannings',
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
  let incidents = 0;
  let managements = 0;
  let plannings = 0;
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
              } else if(access == 'II') {
                incidents++;
              } else if(access == 'TRM') {
                managements++;
              } else if(access == 'TP') {
                plannings++;
              }
            });
          }
        });
      }

      client.administrators = {
        count: administrators,
        max: (client.administrators ? (client.administrators['max'] || 0) : 0) 
      }

      client.assessments = {
        count: assessments,
        max: (client.assessments ? (client.assessments['max'] || 0) : 0) 
      }

      client.inspections = {
        count: inspections,
        max: (client.inspections ? (client.inspections['max'] || 0) : 0) 
      }

      client.hazards = {
        count: hazards,
        max: (client.hazards ? (client.hazards['max'] || 0) : 0) 
      }

      client.incidents = {
        count: incidents,
        max: (client.incidents ? (client.incidents['max'] || 0) : 0) 
      }

      client.managements = {
        count: managements,
        max: (client.managements ? (client.managements['max'] || 0) : 0) 
      }

      client.plannings = {
        count: plannings,
        max: (client.plannings ? (client.plannings['max'] || 0) : 0) 
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
  let managements = req.body.managements;
  let plannings = req.body.plannings;

  let resp: any;
  let error: any;
  let clientId: string;
  let userId: string;
  new SequentialExecutor()
  .chain((resolve, reject) => {
    createClient(name, first_name, last_name, email, administrators, assessments, inspections, hazards, incidents, managements, plannings, req['user'].email, 
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
      createDefaultModules(clientId, userId, req['user'].email, 
      (data) => {
        resolve(true);
      }, (err) => {
        error = err;
        reject(err);
      });
    },
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
      createDefaultKpis(clientId, userId, req['user'].email, 
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

const createClient = (name, first_name, last_name, email, administrators, assessments, inspections, hazards, incidents, managements, plannings, userEmail, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
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
      "managements": managements,
      "plannings": plannings,
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
  let managements = req.body.managements;
  let plannings = req.body.plannings;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": adminId,
      "sort_key": id,
    },
    UpdateExpression: 'set #name = :name, first_name = :first_name, last_name = :last_name, email = :email, \
    administrators = :administrators, assessments = :assessments, inspections = :inspections, hazards = :hazards, \
    incidents = :incidents, managements = :managements, plannings = :plannings, \
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
      ":managements": managements,
      ":plannings": plannings,
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


