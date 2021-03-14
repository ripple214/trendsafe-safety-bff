var express = require('express');
var router = express.Router();
var conf = require('config'); 
var uuid = require('uuid');
var moment = require('moment');

var ddb = require('./ddb');

var tableName = conf.get('TABLE_CATEGORY_ELEMENTS');
var DELIMITER = "$";
var CATEGORY = "CATEGORY";
var ELEMENT = "ELEMENT";

var LEVELS = [CATEGORY, ELEMENT];
var LEVEL_DESCRIPTIONS = {
  CATEGORY: "categories", 
  ELEMENT: "elements"
};

/* GET category-element listing. */
router.get('/:type', function(req, res, next) {

  retrieve(req, LEVELS, (dataMap) => {
    var categories = [];

    var allMap = {};
    var parentMap = undefined;
  
    LEVELS.forEach((level, index) => {
      var objectMap = {};

      var levelDescription = LEVEL_DESCRIPTIONS[level];

      dataMap[level].forEach((entity) => {

        objectMap[entity.id] = entity;
        if(level == CATEGORY) {
          categories.push(entity);

        } else {
          var parentId = undefined;

          if(parentMap != undefined) {
  
            var parentArray = entity.parent.split(DELIMITER);
            var parentId = parentArray[parentArray.length-1];
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
        }
      });
      parentMap = objectMap;
    });

    var resp = { "categories": categories };
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
          return a.sort_num - b.sort_num;
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

/* GET categories listing. */
router.get('/categories', function(req, res) {
  var params = getListParams(req, CATEGORY);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"categories": response.data};
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

/* GET elements listing. */
router.get('/elements', function(req, res) {
  var params = getListParams(req, ELEMENT);

  ddb.query(params, function(response) {
    
    if (response.data) {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      var resp = {"elements": response.data};
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
  let type = req.params.type;
  
  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, parent',
    KeyConditionExpression: '#partition_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + type + DELIMITER + level
    },
  };

  return params;
};

/* GET category. */
router.get('/categories/:id', function(req, res) {
  var params = getQueryParams(req, CATEGORY);

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

/* GET element. */
router.get('/:type/elements/:id', function(req, res) {
  var params = getQueryParams(req, ELEMENT);

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

/* POST insert category. */
router.post('/:type/categories', function(req, res) {
  insertCategoryElement(CATEGORY, req, res);
});

/* PUT update category. */
router.put('/:type/categories/:id', function(req, res) {
  updateCategoryElement(CATEGORY, req, res);
});

/* DELETE delete category. */
router.delete('/:type/categories/:id', function(req, res) {
  deleteCategoryElement(CATEGORY, req, res);
});

/* POST insert element. */
router.post('/:type/elements', function(req, res) {
  insertCategoryElement(ELEMENT, req, res);
});

/* PUT update element. */
router.put('/:type/elements/:id', function(req, res) {
  updateCategoryElement(ELEMENT, req, res);
});

/* DELETE delete element. */
router.delete('/:type/elements/:id', function(req, res) {
  deleteCategoryElement(ELEMENT, req, res);
});

const insertCategoryElement = (level, req, res) => {
  let clientId = req.user.clientId;
  let type = req.params.type;
  let name = req.body.name;
  let parent = req.body.parent;
  let siteId = parent.split(DELIMITER)[0];
  let createTime = moment().format();
  let id = uuid.v4();

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId + DELIMITER + type + DELIMITER + level,
      "sort_key": siteId + DELIMITER + id,
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

const updateCategoryElement = (level, req, res) => {
  var queryParams = getQueryParams(req, level);

  let siteId = undefined;
  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {

      if (response.data && response.data.length == 1) {
        let categoryElement = response.data[0];
        let parent = categoryElement.parent;
        siteId = parent.split(DELIMITER)[0];
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
    let type = req.params.type;
    let id = req.params.id;
  
    var params = {
      TableName: tableName,
      Key: {
        "partition_key": clientId + DELIMITER + type + DELIMITER + level,
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
  let type = req.params.type;
  let id = req.params.id;
  
  var params = {
    TableName: tableName,
    IndexName: "IdIndex",
    ProjectionExpression: 'id, #name, parent',
    KeyConditionExpression: '#partition_key = :clientId and #id = :id',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#id": "id",
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId + DELIMITER + type + DELIMITER + level,
      ":id": id
    },
  };

  return params;
}

/* DELETE delete category. */
// TODO check if there are assessments. Also delete children
const deleteCategoryElement = (level, req, res) => {
  var queryParams = getQueryParams(req, level);

  let siteId = undefined;
  var synCaller = new Promise((resolveCall, rejectCall) => {
    ddb.query(queryParams, function(response) {
      if (response.data && response.data.length == 1) {
        let categoryElement = response.data[0];
        let parent = categoryElement.parent;
        siteId = parent.split(DELIMITER)[0];
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
    let type = req.params.type;
    let id = req.params.id;
  
    var params = {
      TableName: tableName,
      Key: {
        "partition_key": clientId + DELIMITER + type + DELIMITER + level,
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
