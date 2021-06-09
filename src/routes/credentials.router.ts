
import { default as express } from 'express';
import { default as conf } from 'config'; 

import { db_service as ddb } from '../services/ddb.service';
import moment from "moment";
import { email_service } from '../services/email.service';
import { BffResponse } from '../common/bff.response';

export const router = express.Router();

var tableName = conf.get('TABLE_AUTHS');

/* PUT change password. */
router.put('/', (req, res) => {
  let email = req['user'].email;
  let password = req.body.password;
  let new_password = req.body.new_password;

  var authParams = {
    TableName: tableName,
    ProjectionExpression: 'client_id, last_login, failed_attempts, user_id, administrator, #module, password_changed',
    KeyConditionExpression: '#partition_key = :email and #sort_key = :password',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#module": "module"
    },
    ExpressionAttributeValues: {
      ":email": email,
      ":password": password,
    },
  };

  ddb.query(authParams, function(authResponse) {
    if (authResponse.data && authResponse.data.length == 1) {
      let authDetails = authResponse.data[0];
      deleteAuth(email, password, 
        () => {
          let createTime = moment().format();

          var params:any = {
            TableName: tableName,
            Item: {
              "partition_key": email,
              "sort_key": new_password,
              "client_id": authDetails['client_id'],
              "user_id": authDetails['user_id'],
              "administrator": authDetails['administrator'],
              "module": authDetails['module'],
              "failed_attempts": authDetails['failed_attempts'],
              "password_changed": true,
              "last_login": authDetails['last_login'],
              "created_ts": createTime, 
              "created_by": req['user'].email,
              "updated_ts": createTime,
              "updated_by": req['user'].email
            }
          };
        
          ddb.insert(params, function(response) {
            
            if (response.data) {
              email_service.send_password_changed( 
                {
                  toAddress: email
                }, 
                (response: BffResponse) => {
                if (response.data) {
                  var resp = response.data;
                  delete resp['partition_key'];
                  delete resp['sort_key'];
                  res.status(200);
                  res.json(resp);
                } else {
                  res.status(500);
                  res.json(response);
                }
              });
            } else {
              res.status(400);
              res.json(response);
            }
          });
          
        },
        (error) => {
          res.status(500);
          res.json(error);
        }
      )
    } else {
      res.status(400);
      res.json({message: "Invalid username / password"});
    }
  });
});

export const deleteAuth = (email: string, password: string, onSuccess: () => void, onError?: (error: any) => void) => {
  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": email,
      "sort_key": password,
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

export const getCredentials = (email: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  ddb.queryAll(tableName, (auths) => {
    let auth = auths.find(auth => {
      return auth.partition_key == email;
    });

    if(auth) {
      onSuccess(auth);
    } else {
      onError({
        message: "Not found: " + email
      })
    }
  })
}