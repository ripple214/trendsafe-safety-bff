var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_HIERARCHIES');
var DELIMITER = "$";
var DIVISION = "DIVISION";
var PROJECT = "PROJECT";
var SITE = "SITE";
var SUBSITE = "SUBSITE";
var DEPARTMENT = "DEPARTMENT";

//var LEVELS = [DIVISION, PROJECT, SITE, SUBSITE, DEPARTMENT];
var LEVELS = [DIVISION, PROJECT];
var LEVEL_DESCRIPTIONS = {
  DIVISION: "divisions", 
  PROJECT: "projects", 
  SITE: "sites", 
  SUBSITE: "subsites",
  DEPARTMENTS: "departments"
};

/* GET hierarchies listing. */
router.get('/', function(req, res, next) {

  var divisions = [];

  var allMap = {};
  var parentsMap = undefined;

  var looper = new Promise((resolve, reject) => {
    var total = 0;

    LEVELS.forEach((level, index) => {
      let levelDescription = LEVEL_DESCRIPTIONS[level];
  
      divisions[levelDescription] = [];
      objectMap = {};
  
      var dbLooper = new Promise((resolveDBLoop, rejectDBLoop) => {
        ddb.query(getParams(req, level), function(response) {
          if (response.data) {
            response.data.forEach((entity, counter) => {
              if(level == DIVISION) {
                divisions.push(entity);
              }
    
              allMap[entity.id] = entity;
              objectMap[entity.id] = entity;
    
              if(parentsMap != undefined) {
                var parents = entity.parents.split(DELIMITER);
                var parent = undefined;
                for(var i=parents.length-1; i>=0; i--) {
                  var parentId = parents[parents.length-1];
                  var currentParent = parentsMap[parentId];
                  if(currentParent == undefined) {
                    currentParent = {id: -1, name: "Skipped" + level};
                    allMap[currentParent.id] = currentParent;
                  }
    
                  if(parent == undefined) {
                    parentsMap[currentParent.id] = currentParent;
                    parent = currentParent;
                  }
                }
    
                if(parent == undefined) {
                  console.error("Parent is missing. Hierarchy might be invalid.", entity);
                }
    
                var children = parent[levelDescription];
                if(children == undefined) {
                  children = []
                  currentParent[levelDescription] = children;
                }
                children.push(entity);
              }
    
              if(counter == response.data.length-1) {
                console.log("looped", counter, response.data.length, index, LEVELS.length);
                parentsMap = objectMap;
                resolveDBLoop();
              }
            });
          } else {
            res.status(400);
            res.json(response);
            return;
          }
        });
      });
  
      dbLooper.then(() => {
        total++;
        if(total == LEVELS.length) {
          resolve();
        }
      });
    });
  });

  looper.then(() => {
    var resp = {"hierarchies": { "divisions": divisions } };
    res.status(200);
    res.json(resp);

    console.log("responded");    
  });
});

const sendResponse = () => {

};

const getParams = (req, level) =>  {
  let clientId = req.user.clientId;

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
    },
  };

  return params;
};

/* GET divisions listing. */
router.get('/divisions', function(req, res, next) {
  var params = getParams(req, DIVISION);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"divisions": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET projects listing. */
router.get('/projects', function(req, res, next) {
  var params = getParams(req, PROJECT);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"projects": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET sites listing. */
router.get('/sites', function(req, res, next) {
  var params = getParams(req, SITE);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"sites": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET subsites listing. */
router.get('/subsites', function(req, res, next) {
  var params = getParams(req, SUBSITE);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"subsites": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET department listing. */
router.get('/departments', function(req, res, next) {
  var params = getParams(req, DEPARTMENT);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"departments": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});


/* PUT update hierarchy. */
router.put('/:hierarchyId', function(req, res, next) {
  let clientId = req.user.clientId;
  let hierarchyId = req.params.hierarchyId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": hierarchyId,
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

/* POST insert hierarchy. */
router.post('/', function(req, res, next) {
  let clientId = req.user.clientId;
  let createTime = moment().format();
  let id = uuid.v4();

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId,
      "sort_key": id,
      "id": id,
      "name": req.body.name,
      "sort_num": req.body.sort_num,
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
});

/* DELETE delete hierarchy. */
router.delete('/:hierarchyId', function(req, res) {
  let clientId = req.user.clientId;
  let hierarchyId = req.params.hierarchyId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": hierarchyId,
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

module.exports = router;
