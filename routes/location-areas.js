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
    var locations = [];

    var allMap = {};
    var parentsMap = undefined;
  
    LEVELS.forEach((level, index) => {
      var objectMap = {};

      var levelDescription = LEVEL_DESCRIPTIONS[level];

      dataMap[level].forEach((entity) => {

        objectMap[entity.id] = entity;
        if(level == LOCATION) {
          locations.push(entity);

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

    var resp = { "locations": locations };
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

/* GET locations listing. */
router.get('/locations', function(req, res) {
  var params = getListParams(req, LOCATION);

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
  var params = getListParams(req, AREA);

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

const getListParams = (req, level) =>  {
  let clientId = req.user.clientId;
  let siteId = req.query.siteId;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, parents',
    KeyConditionExpression: '#partition_key = :clientId and begins_with(#sort_key, :siteId)',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + level,
      ":siteId": siteId + DELIMITER
    },
  };

  return params;
};

/* GET location. */
router.get('/locations/:id', function(req, res) {
  var params = getQueryParams(req, LOCATION);

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

/* GET area. */
router.get('/areas/:id', function(req, res) {
  var params = getQueryParams(req, AREA);

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

/* POST insert location. */
router.post('/locations', function(req, res) {
  insertLocationArea(LOCATION, req, res);
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
  insertLocationArea(AREA, req, res);
});

/* PUT update area. */
router.put('/areas/:id', function(req, res) {
  updateLocationArea(AREA, req, res);
});

/* DELETE delete area. */
router.delete('/areas/:id', function(req, res) {
  deleteLocationArea(AREA, req, res);
});

const insertLocationArea = (level, req, res) => {
  let clientId = req.user.clientId;
  let name = req.body.name;
  let parents = req.body.parents;
  let siteId = parents.split(DELIMITER)[0];
  let createTime = moment().format();
  let id = uuid.v4();

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId + DELIMITER + level,
      "sort_key": siteId + DELIMITER + id,
      "id": id,
      "name": name,
      "parents": parents,
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
  var queryParams = getQueryParams(req, level);

  let siteId = undefined;
  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {

      if (response.data && response.data.length == 1) {
        let locationArea = response.data[0];
        let parents = locationArea.parents;
        siteId = parents.split(DELIMITER)[0];
        resolveCall();
      } else {
        res.status(404);
        res.json();1
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req.user.clientId;
    let id = req.params.id;
  
    var params = {
      TableName: tableName,
      Key: {
        "partition_key": clientId + DELIMITER + level,
        "sort_key": siteId + DELIMITER + id,
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
  });
}

const getQueryParams = (req, level) => {
  let clientId = req.user.clientId;
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

/* DELETE delete location. */
// TODO check if there are assessments. Also delete children
const deleteLocationArea = (level, req, res) => {
  var queryParams = getQueryParams(req, level);

  let siteId = undefined;
  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {
      console.log("sa delete", response);
      if (response.data && response.data.length == 1) {
        let locationArea = response.data[0];
        let parents = locationArea.parents;
        siteId = parents.split(DELIMITER)[0];
        resolveCall();
      } else {
        res.status(404);
        res.json();
        rejectCall();
      }
    });
  });

  synCaller.then(() => {
    let clientId = req.user.clientId;
    let id = req.params.id;
  
    var params = {
      TableName: tableName,
      Key: {
        "partition_key": clientId + DELIMITER + level,
        "sort_key": siteId + DELIMITER + id,
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
