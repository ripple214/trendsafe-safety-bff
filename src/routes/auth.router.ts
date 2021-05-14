import { ACCESS_TOKEN_SECRET } from "../common/constants";

import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as jwt } from 'jsonwebtoken';

import { db_service as ddb } from '../services/ddb.service';
import moment from "moment";
import { email_service } from "../services/email.service";
import { BffResponse } from "../common/bff.response";

export const router = express.Router();

var tableName = conf.get('TABLE_AUTHS');

router.post("/login", (req, res, next) => {

  let email = req.body.email;
  let password = req.body.password;

  var authParams = {
    TableName: tableName,
    ProjectionExpression: 'client_id, last_login, failed_attempts, user_id, #module',
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

            let accessToken = jwt.sign(authToken, ACCESS_TOKEN_SECRET, {expiresIn: "30m"});
            res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=Lax; ');
        
            var actionsParams = {
              TableName: conf.get('TABLE_ACTIONS'),
              ProjectionExpression: 'id, assigned_to, completed_date',
              KeyConditionExpression: '#partition_key = :clientId',
              ExpressionAttributeNames:{
                "#partition_key": "partition_key",
                "#name": "name",
              },
              ExpressionAttributeValues: {
                ":clientId": clientId
              },
            };

            res.status(200);
            res.json(authDetails);
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
  var response = {
    account: {
      email: req.body.email
    }
  };

  res.json(response);
});

export const createAuth = (email: string, clientId: string, userId: string, userEmail:string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let createTime = moment().format();
  let password = "Singapore1";
  
  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": email,
      "sort_key": password,
      "module": "CLIENT",
      "client_id": clientId,
      "user_id": userId,
      "failed_attempts": 0,
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
        }, (response: BffResponse) => {
        if (response.data) {
          onSuccess(resp);
        } else {
          onError(response);
        }
      });
    } else {
      onError(response);
    }
  });  
}
