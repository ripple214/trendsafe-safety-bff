import { default as express } from 'express';
import { default as conf } from 'config'; 
import { default as moment } from 'moment';
import { db_service as ddb } from '../services/ddb.service';
import { isAfter } from '../common/date-util';

export const router = express.Router();

const tableName = conf.get('TABLE_KPIS');
var DELIMITER = "$";

/* GET kpis listing. */
router.get('/', function(req, res) {
  let clientId = req['user'].client_id;
  let siteId = req.query.siteId;
  
  getKPIs(clientId, siteId, 
    (data) => {
      var resp = {"kpis": data};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getKPIs = (clientId: string, siteId: any, onSuccess: (data: any) => void, onError?: (error: any) => void) => {

  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, parent, kpi_date, targets',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId
    },
  };

  if(siteId) {
    params.KeyConditionExpression = '#partition_key = :clientId and begins_with(#sort_key, :siteId)';
    params.ExpressionAttributeNames["#sort_key"] = "sort_key";
    params.ExpressionAttributeValues[":siteId"] = siteId + DELIMITER;
  } else {
    params.KeyConditionExpression = '#partition_key = :clientId';
  }

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return isAfter(b.completed_date, a.completed_date) ? 1 : -1;
      });

      if(response.data) {
        onSuccess(response.data);
      } else {
        onError(response);
      }
    } else {
      onError(response);
    }
  });
};

/* GET kpi. */
router.get('/:kpiId', function(req, res) {
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
  let kpiId = req.params.kpiId;
  
  var params:any = {
    TableName: tableName,
    IndexName: "IdIndex",
    ProjectionExpression: 'id, parent, kpi_date, targets',
    KeyConditionExpression: '#partition_key = :clientId and #id = :kpiId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#id": "id",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":kpiId": kpiId
    },
  };

  return params;
}


/* POST insert kpi. */
router.post('/', function(req, res) {
  let clientId = req['user'].client_id;
  let parent = req.body.parent;
  let createTime = moment().format();
  let kpi_date = req.body.kpi_date;
  let targets = req.body.targets;
  let id = moment(kpi_date).format("YYYYMM");

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": parent + DELIMITER + id,
      "id": id,
      "parent": parent,
      "kpi_date": kpi_date,
      "targets": targets,
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

/* PUT update kpi. */
router.put('/:kpiId', function(req, res) {
  var queryParams = getQueryParams(req);

  let parent = undefined;
  var synCaller = new Promise((resolveCall:any, rejectCall:any) => {
    ddb.query(queryParams, function(response) {
    
      if (response.data && response.data.length == 1) {
        var kpi = response.data[0];
        parent = kpi.parent;
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req['user'].client_id;
    let kpiId = req.params.kpiId;
    let kpi_date = req.body.kpi_date;
    let targets = req.body.targets;

    var updateParams = {
      TableName: tableName,
      Key: {
        "partition_key": clientId,
        "sort_key": parent + DELIMITER + kpiId,
      },
      UpdateExpression: 'set kpi_date = :kpi_date, targets = :targets, updated_ts = :updated_ts, updated_by = :updated_by',
      ExpressionAttributeValues: {
        ":kpi_date": kpi_date,
        ":targets": targets,
        ":updated_ts": moment().format(),
        ":updated_by": req['user'].email,
      },
      ReturnValues:"ALL_NEW"
    };
  
    ddb.update(updateParams, function(response) {
      
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
});

/* DELETE delete kpi. */
router.delete('/:kpiId', function(req, res) {
  var queryParams = getQueryParams(req);
  
  let siteId = undefined;
  var synCaller = new Promise((resolveCall:any, rejectCall:any) => {
    ddb.query(queryParams, function(response) {
    
      if (response.data && response.data.length == 1) {
        var kpi = response.data[0];
        siteId = kpi.parent;
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req['user'].client_id;
    let kpiId = req.params.kpiId;

    var deleteParams = {
      TableName: tableName,
      Key: {
        "partition_key": clientId,
        "sort_key": siteId + DELIMITER + kpiId,
      },
    };

    ddb.delete(deleteParams, function(response) {
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
});
