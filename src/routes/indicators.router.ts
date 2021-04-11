import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';

export const router = express.Router();

var tableName = conf.get('TABLE_INDICATORS');

/* GET indicators listing. */
router.get('/', function(req, res, next) {
  let clientId = req['user'].client_id;

  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, report_date, site, total_hours',
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
        return b.report_date.localeCompare(a.report_date);
      });

      var resp = {"indicators": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET indicator. */
router.get('/:indicatorId', function(req, res) {
  var params = getQueryParams(req);

  ddb.query(params, function(response) {
    
    if (response.data && response.data.length == 1) {
      var resp = response.data[0];
      res.status(200);
      res.json(resp);
    } else {
      res.status(404);
      res.json();
    }
  });
});

const getQueryParams = (req) => {
  let clientId = req['user'].client_id;
  let indicatorId = req.params.indicatorId;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, report_date, site, total_hours',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :indicatorId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":indicatorId": indicatorId
    },
  };

  return params;
}

/* PUT update indicator. */
router.put('/:indicatorId', function(req, res, next) {
  let clientId = req['user'].client_id;
  let indicatorId = req.params.indicatorId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": indicatorId,
    },
    UpdateExpression: 'set #name = :name, \
      report_date = :report_date, \
      site = :site, \
      total_hours = :total_hours, \
      updated_ts = :updated_ts, \
      updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":report_date": req.body.report_date,
      ":site": req.body.site,
      ":total_hours": req.body.total_hours,
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

/* POST insert indicator. */
router.post('/', function(req, res, next) {
  let clientId = req['user'].client_id;
  let createTime = moment().format();
  let id = uuid();
  let name = id.replace(/-/g, "").substring(0, 12).toUpperCase();

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "name": name,
      "report_date": req.body.report_date,
      "site": req.body.site,
      "total_hours": req.body.total_hours,
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

/* DELETE delete indicator. */
router.delete('/:indicatorId', function(req, res) {
  let clientId = req['user'].client_id;
  let indicatorId = req.params.indicatorId;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": indicatorId,
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


