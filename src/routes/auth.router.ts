import { ACCESS_TOKEN_SECRET } from "../common/constants";

import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as jwt } from 'jsonwebtoken';

import { db_service as ddb } from '../services/ddb.service';
import moment from "moment";
import crypto from "crypto";
import { email_service } from "../services/email.service";
import { BffResponse } from "../common/bff.response";
import { getActions } from "./actions.router";

export const router = express.Router();

var tableName = conf.get('TABLE_AUTHS');

router.post("/login", (req, res, next) => {

  let email = req.body.email;
  let password = req.body.password;

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
      ":password": password
    },
  };

  ddb.query(authParams, function(authResponse) {
    
    if (authResponse.data && authResponse.data.length == 1) {
      var authDetails = authResponse.data[0];
      authDetails['email'] = email;

      var authToken:any = {
        session_id: uuid(),
        email: email,
        module: authDetails.module
      };      
      
      if(authDetails.module == 'CLIENT') {
        let clientId = authDetails.client_id;
        let userId = authDetails.user_id;

        var userParams = {
          TableName: conf.get('TABLE_USERS'),
          ProjectionExpression: 'last_name, first_name, email, administrator, leader, #user, authorizer, recipient, module_access, \
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
      
        ddb.query(userParams, function(usersResponse) {
          if (usersResponse.data && usersResponse.data.length == 1) {
            var userDetails = usersResponse.data[0];

            authToken.client_id = clientId;
            authToken.user_id = userId;
            authToken.last_name = userDetails.last_name;
            authToken.first_name = userDetails.first_name;
            authToken.email = userDetails.email;
            authToken.administrator = userDetails.administrator;
            authToken.leader = userDetails.leader;
            authToken.user = userDetails.user;
            authToken.authorizer = userDetails.authorizer;
            authToken.recipient = userDetails.recipient;
            authToken.module_access = userDetails.module_access;
            /*
            authToken.dataEntryDivisionIds = userDetails.dataEntryDivisionIds;
            authToken.dataEntryProjectIds = userDetails.dataEntryProjectIds;
            authToken.dataEntrySiteIds = userDetails.dataEntrySiteIds;
            authToken.dataEntrySubsiteIds = userDetails.dataEntrySubsiteIds;
            authToken.dataEntryDepartmentIds = userDetails.dataEntryDepartmentIds;
            authToken.reportingDivisionIds = userDetails.reportingDivisionIds;
            authToken.reportingProjectIds = userDetails.reportingProjectIds;
            authToken.reportingSiteIds = userDetails.reportingSiteIds;
            authToken.reportingSubsiteIds = userDetails.reportingSubsiteIds;
            authToken.reportingDepartmentIds = userDetails.reportingDepartmentIds;
            */

            authDetails['user_id'] = userId;
            authDetails['last_name'] = userDetails.last_name;
            authDetails['first_name'] = userDetails.first_name;
            authDetails['email'] = userDetails.email;
            authDetails['administrator'] = userDetails.administrator;
            authDetails['leader'] = userDetails.leader;
            authDetails['user'] = userDetails.user;
            authDetails['authorizer'] = userDetails.authorizer;
            authDetails['recipient'] = userDetails.recipient;
            authDetails['module_access'] = userDetails.module_access;
            authDetails['data_entry'] = {
              division_ids: userDetails.dataEntryDivisionIds,
              project_ids: userDetails.dataEntryProjectIds,
              site_ids: userDetails.dataEntrySiteIds,
              subsite_ids: userDetails.dataEntrySubsiteIds,
              department_ids: userDetails.dataEntryDepartmentIds
            };
            authDetails['reporting'] = {
              division_ids: userDetails.reportingDivisionIds,
              project_ids: userDetails.reportingProjectIds,
              site_ids: userDetails.reportingSiteIds,
              subsite_ids: userDetails.reportingSubsiteIds,
              department_ids: userDetails.reportingDepartmentIds
            };

            let accessToken = jwt.sign(authToken, ACCESS_TOKEN_SECRET, {expiresIn: "30m"});
            res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=Lax; ');
        
            //console.log("accessToken", accessToken)

            getActions(clientId, 
              (actions) => {
                authDetails['assigned_actions'] = actions.filter(action => {
                  return action.assigned_to && action.assigned_to.id == userId;
                }).length;

                res.status(200);
                res.json(authDetails);
              }, 
              (error) => {
                res.status(500);
                res.json(error);
              }
            );

          } else {
            res.status(403);
            res.json();
          }
        });
      } else {
        let accessToken = jwt.sign(authToken, ACCESS_TOKEN_SECRET, {expiresIn: "30m"});
        res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=Lax; ');
        
        res.status(200);
        res.json(authDetails);
      }
    } else {
      res.status(403);
      res.json();
    }
  });

});

router.post("/logout", (req, res, next) => {  
    res.cookie("Authorization", null, {maxAge: 0});
    res.status(204);
    res.json();
});

router.post("/retrieve-password", (req, res, next) => {
  let email = req.body.email;

  var authParams = {
    TableName: tableName,
    ProjectionExpression: '#sort_key',
    KeyConditionExpression: '#partition_key = :email',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
    },
    ExpressionAttributeValues: {
      ":email": email
    },
  };

  ddb.query(authParams, function(authResponse) {
    if (authResponse.data && authResponse.data.length == 1) {
      var authDetails = authResponse.data[0];
      email_service.send_retrieve_password( 
        {
          toAddress: email,
          name: email, 
          password: authDetails['sort_key']
        }
      );
    }
    res.status(200);
    res.json("Password sent to email address");
  });

});

export const createAuth = (email: string, clientId: string, userId: string, userEmail:string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let createTime = moment().format();
  let password = crypto.randomBytes(12).toString("hex");
  
  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": email,
      "sort_key": password,
      "module": "CLIENT",
      "client_id": clientId,
      "user_id": userId,
      "failed_attempts": 0,
      "password_changed": false,
      "created_ts": createTime, 
      "created_by": userEmail,
      "updated_ts": createTime,
      "updated_by": userEmail
    }
  };

  ddb.insert(params, function(response) {
    if(response.data) {
      let resp = response.data;
        email_service.send_registration( 
          {
            toAddress: email,
            username: email, 
            password: password
          }, 
          (response: BffResponse) => {
            if (response.data) {
              onSuccess(resp);
            } else {
              onError(response);
            }
          }
        );
      } else {
        onError(response);
      }
    }
  );  
}

export const deleteAuthByEmail = (email: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  getAuthByEmail(email, 
    (data) => {
      var params = {
        TableName: tableName,
        Key: {
          "partition_key": email,
          "sort_key": data.sort_key
        },
      };
      
      ddb.delete(params, function(response) {
        if(!response.error) {
          onSuccess(response.data);
        } else {
          onError(response);
        }
      });
    }, 
    (error) => {
      onError(error);
    }
  )
}

const getAuthByEmail = (email: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  ddb.queryAll(tableName, (auths) => {
    let auth = auths.find(auth => {
      //console.log("searching", email, auth.partition_key)
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
