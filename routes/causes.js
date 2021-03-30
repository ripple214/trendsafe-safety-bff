var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_CAUSES');
var DELIMITER = "$";
var HEADING = "HEADING";
var ITEM = "ITEM";

var LEVELS = [HEADING, ITEM];
var LEVEL_DESCRIPTIONS = {
  HEADING: "headings", 
  ITEM: "items"
};

/* GET cause listing. */
router.get('/', function(req, res, next) {

  retrieve(req, LEVELS, (dataMap) => {
    var headings = [];

    var allMap = {};
    var parentsMap = undefined;
  
    LEVELS.forEach((level, index) => {
      var objectMap = {};

      var levelDescription = LEVEL_DESCRIPTIONS[level];

      dataMap[level].forEach((entity) => {

        objectMap[entity.id] = entity;
        if(level == HEADING) {
          headings.push(entity);

        } else {
          var parentsId = undefined;

          if(parentsMap != undefined) {
  
            var parentsArray = entity.parents.split(DELIMITER);
            var parentsId = parentsArray[parentsArray.length-1];
            var parents = parentsMap[parentsId];
            if(parents == undefined) {
              parents = allMap[parentsId];
            }
            var children = parents[levelDescription];
            if(children == undefined) {
              children = []
              parents[levelDescription] = children;
            }
            children.push(entity);
          }
        }
      });
      parentsMap = objectMap;
    });

    var resp = { "headings": headings };
    res.status(200);
    res.json(resp);
  });
});

const retrieve = (req, levels, callback) => {
  recursiveRetrieve(req, levels, 0, {}, callback);
};

const recursiveRetrieve = (req, levels, index, dataMap, callback) => {

  var dbLooper = new Promise((resolveDBLoop, rejectDBLoop) => {
    var level = levels[index]

    ddb.query(getListParams(req, level), function(response) {
      if (response.data) {
        response.data.sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
        dataMap[level] = response.data;
      } else {
        dataMap[level] = [];
      }

      resolveDBLoop();
    });
  });

  dbLooper.then(() => {
    if(index == levels.length-1) {
      callback(dataMap);
    } else {
      recursiveRetrieve(req, levels, ++index, dataMap, callback)
    }
  });
};

/* GET headings listing. */
router.get('/headings', function(req, res) {
  var params = getListParams(req, HEADING);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"headings": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET items listing. */
router.get('/items', function(req, res) {
  var params = getListParams(req, ITEM);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"items": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

const getListParams = (req, level) =>  {
  let clientId = req.user.client_id;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, parents',
    KeyConditionExpression: '#partition_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + level
    }
  };

  return params;
};

/* GET heading. */
router.get('/headings/:id', function(req, res) {
  var params = getQueryParams(req, HEADING);

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

/* GET item. */
router.get('/items/:id', function(req, res) {
  var params = getQueryParams(req, ITEM);

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

/* POST insert heading. */
router.post('/headings', function(req, res) {
  insertCause(HEADING, req, res);
});

/* PUT update heading. */
router.put('/headings/:id', function(req, res) {
  updateCause(HEADING, req, res);
});

/* DELETE delete heading. */
router.delete('/headings/:id', function(req, res) {
  deleteCause(HEADING, req, res);
});

/* POST insert item. */
router.post('/items', function(req, res) {
  insertCause(ITEM, req, res);
});

/* PUT update item. */
router.put('/items/:id', function(req, res) {
  updateCause(ITEM, req, res);
});

/* DELETE delete item. */
router.delete('/items/:id', function(req, res) {
  deleteCause(ITEM, req, res);
});

const insertCause = (level, req, res) => {
  let clientId = req.user.client_id;
  let name = req.body.name;
  let parents = req.body.parents;
  let createTime = moment().format();
  let id = uuid.v4();

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId + DELIMITER + level,
      "sort_key": id,
      "id": id,
      "name": name,
      "parents": parents,
      "created_ts": createTime, 
      "created_by": req.user.email,
      "updated_ts": createTime,
      "updated_by": req.user.email
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
}

const updateCause = (level, req, res) => {
  var queryParams = getQueryParams(req, level);

  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {

      if (response.data && response.data.length == 1) {
        resolveCall();
      } else {
        res.status(404);
        res.json();1
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req.user.client_id;
    let id = req.params.id;
  
    var params = {
      TableName: tableName,
      Key: {
        "partition_key": clientId + DELIMITER + level,
        "sort_key": id,
      },
      UpdateExpression: 'set #name = :name, updated_ts = :updated_ts, updated_by = :updated_by',
      ExpressionAttributeNames:{
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": req.body.name,
        ":updated_ts": moment().format(),
        ":updated_by": req.user.email,
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
}

const getQueryParams = (req, level) => {
  let clientId = req.user.client_id;
  let id = req.params.id;
  
  var params = {
    TableName: tableName,
    IndexName: "IdIndex",
    ProjectionExpression: 'id, #name, parents',
    KeyConditionExpression: '#partition_key = :clientId and #id = :id',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#id": "id",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + level,
      ":id": id
    },
  };

  return params;
}

/* DELETE delete heading. */
// TODO check if there are assessments. Also delete children
const deleteCause = (level, req, res) => {
  var queryParams = getQueryParams(req, level);

  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {
      if (response.data && response.data.length == 1) {
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req.user.client_id;
    let id = req.params.id;
  
    var params = {
      TableName: tableName,
      Key: {
        "partition_key": clientId + DELIMITER + level,
        "sort_key": id,
      },
    };
  
    ddb.delete(params, function(response) {
      if (!response.error) {
        res.status(204);
        res.json();
      } else {
        res.status(400);
        res.json(response);
      }
    });
  });

};

module.exports = router;
