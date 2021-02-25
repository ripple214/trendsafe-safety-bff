var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_LOCATION_AREAS');
var DELIMITER = "$";
var LOCATION = "LOCATION";
var AREA = "AREA";

var LEVELS = [LOCATION, AREA];
var LEVEL_DESCRIPTIONS = {
  LOCATION: "locations", 
  AREA: "areas"
};

/* GET location-area listing. */
router.get('/', function(req, res, next) {

  retrieve(req, LEVELS, (dataMap) => {
    console.log("done getting data");

    var locations = [];

    var allMap = {};
    var parentMap = undefined;
  
    LEVELS.forEach((level, index) => {
      var objectMap = {};

      var levelDescription = LEVEL_DESCRIPTIONS[level];
      console.log("processing", levelDescription);

      dataMap[level].forEach((entity) => {
        if(level == LOCATION) {
          locations.push(entity);
        }

        objectMap[entity.id] = entity;
        var parentId = undefined;

        if(parentMap != undefined) {

          var parentId = entity.parent;
          var parent = parentMap[parentId];
          if(parent == undefined) {
            parent = allMap[parentId];
          }

          var children = parent[levelDescription];
          if(children == undefined) {
            children = []
            parent[levelDescription] = children;
          }
          children.push(entity);
        }
      });
      parentMap = objectMap;
    });

    var resp = { "locations": locations };
    res.status(200);
    res.json(resp);

    console.log("responded");    
  });
});

const retrieve = (req, levels, callback) => {
  recursiveRetrieve(req, levels, 0, {}, callback);
};

const recursiveRetrieve = (req, levels, index, dataMap, callback) => {

  var dbLooper = new Promise((resolveDBLoop, rejectDBLoop) => {
    var level = levels[index]

    console.log("retrieving", level);

    ddb.query(getParams(req, level), function(response) {
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

/* GET locations listing. */
router.get('/locations', function(req, res) {
  var params = getParams(req, LOCATION);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"locations": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET areas listing. */
router.get('/areas', function(req, res) {
  var params = getParams(req, AREA);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"areas": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

const getParams = (req, level) =>  {
  let clientId = req.user.clientId;
  let siteId = req.query.siteId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, parent',
    KeyConditionExpression: '#partition_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + level + DELIMITER + siteId
    },
  };

  return params;
};

/* POST insert location. */
router.post('/locations', function(req, res) {
  insertLocationArea(LOCATION, req.body.name, req.body.parent, req, res);
});

/* PUT update location. */
router.put('/locations/:id', function(req, res) {
  updateLocationArea(LOCATION, req, res);
});

/* DELETE delete location. */
router.delete('/locations/:id', function(req, res) {
  deleteLocationArea(LOCATION, req, res);
});

/* POST insert area. */
router.post('/areas', function(req, res) {
  insertLocationArea(AREA, req.body.name, req.body.parent, req, res);
});

/* PUT update area. */
router.put('/areas/:id', function(req, res) {
  updateLocationArea(AREA, req, res);
});

/* DELETE delete area. */
router.delete('/areas/:id', function(req, res) {
  deleteLocationArea(AREA, req, res);
});

const insertLocationArea = (level, name, parent, req, res) => {
  let clientId = req.user.clientId;
  let siteId = req.query.siteId;
  let createTime = moment().format();
  let id = uuid.v4();

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId + DELIMITER + level + DELIMITER + siteId,
      "sort_key": id,
      "id": id,
      "name": name,
      "parent": parent,
      "created_ts": createTime, 
      "created_by": req.user.emailAddress,
      "updated_ts": createTime,
      "updated_by": req.user.emailAddress
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

const updateLocationArea = (level, req, res) => {
  let clientId = req.user.clientId;
  let id = req.params.id;
  let siteId = req.query.siteId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId + DELIMITER + level + DELIMITER + siteId,
      "sort_key": id,
    },
    UpdateExpression: 'set #name = :name, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeNames:{
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": req.body.name,
      ":updated_ts": moment().format(),
      ":updated_by": req.user.emailAddress,
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
}

/* DELETE delete location. */
// TODO check if there are assessments. Also delete children
const deleteLocationArea = (level, req, res) => {
  let clientId = req.user.clientId;
  let id = req.params.id;
  let siteId = req.query.siteId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId + DELIMITER + level + DELIMITER + siteId,
      "sort_key": id,
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
};

module.exports = router;
