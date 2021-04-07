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

var LEVELS = [DIVISION, PROJECT, SITE, SUBSITE, DEPARTMENT];
var LEVEL_DESCRIPTIONS = {
  DIVISION: "divisions", 
  PROJECT: "projects", 
  SITE: "sites", 
  SUBSITE: "subsites",
  DEPARTMENT: "departments"
};

/* GET hierarchies listing. */
router.get('/', function(req, res, next) {

  retrieve(req, LEVELS, (dataMap) => {
    console.log("done getting data");

    var divisions = [];

    var allMap = {};
    var parentsMap = undefined;
  
    LEVELS.forEach((level, index) => {
      var objectMap = {};

      var levelDescription = LEVEL_DESCRIPTIONS[level];
      console.log("processing", levelDescription);

      dataMap[level].forEach((entity) => {
        if(level == DIVISION) {
          divisions.push(entity);
        }

        objectMap[entity.id] = entity;
        var parentId = undefined;

        if(parentsMap != undefined) {

          var parents = entity.parents.split(DELIMITER);
          var ancestor = entity.parents;
          for(var i=parents.length; i>0; i--) {
            var currentParentId = parents[i-1];

            if(parentId == undefined) {
              if(currentParentId == -1) {
                parentId = ancestor;
              } else {
                parentId = currentParentId;
              }
            }

            if(currentParentId == -1) {
              if(allMap[ancestor] == undefined) {
                console.log("creating skipped");
                var parent = {id: -1, name: "Skipped " + LEVELS[i-1]};
                allMap[ancestor] = parent;
                if(ancestor == -1) {
                  divisions.push(parent);
                }
              }

              ancestor = ancestor.substring(0, ancestor.length-(currentParentId.length+1));
              console.log("ancestor", ancestor);
            } else {
              break;
            }
          }

          // make sure skipped levels are added as children as well
          // TODO
          var ancestor = entity.parents;
          for(var i=parents.length; i>0; i--) {
            var currentParentId = parents[i-1];
            if(currentParentId == -1) {
              ancestor = ancestor.substring(0, ancestor.length-(currentParentId.length+1));
            } else {
              break;
            }
          }

          var parent = parentsMap[parentId];
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
      parentsMap = objectMap;
    });

    var resp = {"hierarchies": { "divisions": divisions } };
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

const getParams = (req, level) =>  {
  let clientId = req.user.client_id;

  let divisionId = req.query.division_id;
  let projectId = req.query.project_id;
  let siteId = req.query.site_id;
  let subsiteId = req.query.subsite_id;
  let departmentId = req.query.department_id;

  var params = {};

  if(divisionId || projectId || siteId || subsiteId || departmentId) {
    let indexName = "DivisionIdIndex";
    let parentField = "division_id";
    let parentId = divisionId;
    if(level == SITE) {
      if(projectId) {
        indexName = "ProjectIdIndex";
        parentField = "project_id";
        parentId = projectId;
      }
    } else if(level == SUBSITE) {
      if(projectId) {
        indexName = "ProjectIdIndex";
        parentField = "project_id";
        parentId = projectId;
      }
      if(siteId) {
        indexName = "SiteIdIndex";
        parentField = "site_id";
        parentId = siteId;
      }
    } else if(level == DEPARTMENT) {
      if(projectId) {
        indexName = "ProjectIdIndex";
        parentField = "project_id";
        parentId = projectId;
      }
      if(siteId) {
        indexName = "SiteIdIndex";
        parentField = "site_id";
        parentId = siteId;
      }
      if(subsiteId) {
        indexName = "SubsiteIdIndex";
        parentField = "subsite_id";
        parentId = subsiteId;
      }
    }

    params = {
      TableName: tableName,
      IndexName: indexName,
      ProjectionExpression: 'id, #name, parents, division_id, project_id, site_id, subsite_id, department_id',
      KeyConditionExpression: '#partition_key = :clientId and #parent = :parent',
      ExpressionAttributeNames:{
        "#partition_key": "partition_key",
        "#parent": parentField,
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":clientId": clientId + DELIMITER + level,
        ":parent": parentId
      },
    };  
  } else {
    params = {
      TableName: tableName,
      ProjectionExpression: 'id, #name, parents, division_id, project_id, site_id, subsite_id, department_id',
      KeyConditionExpression: '#partition_key = :clientId',
      ExpressionAttributeNames:{
        "#partition_key": "partition_key",
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":clientId": clientId + DELIMITER + level
      },
    };
  }

  return params;
};

/* POST insert division. */
router.post('/divisions', function(req, res) {
  insertHierarchy(DIVISION, req.body.name, "", req, res);
});

/* PUT update division. */
router.put('/divisions/:hierarchyId', function(req, res) {
  updateHierarchy(DIVISION, req, res);
});

/* DELETE delete division. */
router.delete('/divisions/:hierarchyId', function(req, res) {
  deleteHierarchy(DIVISION, req, res);
});

/* POST insert project. */
router.post('/projects', function(req, res) {
  insertHierarchy(PROJECT, req.body.name, req.body.parents, req, res);
});

/* PUT update project. */
router.put('/projects/:hierarchyId', function(req, res) {
  updateHierarchy(PROJECT, req, res);
});

/* DELETE delete project. */
router.delete('/projects/:hierarchyId', function(req, res) {
  deleteHierarchy(PROJECT, req, res);
});

/* POST insert site. */
router.post('/sites', function(req, res) {
  insertHierarchy(SITE, req.body.name, req.body.parents, req, res);
});

/* PUT update site. */
router.put('/sites/:hierarchyId', function(req, res) {
  updateHierarchy(SITE, req, res);
});

/* DELETE delete site. */
router.delete('/sites/:hierarchyId', function(req, res) {
  deleteHierarchy(SITE, req, res);
});

/* POST insert subsite. */
router.post('/subsites', function(req, res) {
  insertHierarchy(SUBSITE, req.body.name, req.body.parents, req, res);
});

/* PUT update subsite. */
router.put('/subsites/:hierarchyId', function(req, res) {
  updateHierarchy(SUBSITE, req, res);
});

/* DELETE delete subsite. */
router.delete('/subsites/:hierarchyId', function(req, res) {
  deleteHierarchy(SUBSITE, req, res);
});

/* POST insert department. */
router.post('/departments', function(req, res) {
  insertHierarchy(DEPARTMENT, req.body.name, req.body.parents, req, res);
});

/* PUT update department. */
router.put('/departments/:hierarchyId', function(req, res) {
  updateHierarchy(DEPARTMENT, req, res);
});

/* DELETE delete department. */
router.delete('/departments/:hierarchyId', function(req, res) {
  deleteHierarchy(DEPARTMENT, req, res);
});

const insertHierarchy = (level, name, parents, req, res) => {
  let clientId = req.user.client_id;
  let createTime = moment().format();
  let id = uuid.v4();

  let parentsArray = parents.split('$');
	let divisionId = "0";
	let projectId = "0";
	let siteId = "0";
	let subsiteId = "0";
	let departmentId = "0";

	if(level == DIVISION) {
		divisionId = id;
	} else if(level == PROJECT) {
		divisionId = parentsArray[0];
		projectId = id;
	} else if(level == SITE) {
		divisionId = parentsArray[0];
		projectId = parentsArray[1];
		siteId = id;
	} else if(level == SUBSITE) {
		divisionId = parentsArray[0];
		projectId = parentsArray[1];
		siteId = parentsArray[2];
		subsiteId = id;
	} else if(level == DEPARTMENT) {
		divisionId = parentsArray[0];
		projectId = parentsArray[1];
		siteId = parentsArray[2];
		subsiteId = parentsArray[3];
		departmentId = id;
  }

  var params = {
    TableName: tableName,
    Item: {
      "partition_key": clientId + DELIMITER + level,
      "sort_key": id,
      "id": id,
      "name": name,
      "parents": parents,
      "division_id": divisionId,
      "project_id": projectId,
      "site_id": siteId,
      "subsite_id": subsiteId,
      "department_id": departmentId,
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

const updateHierarchy = (level, req, res) => {
  let clientId = req.user.client_id;
  let hierarchyId = req.params.hierarchyId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId + DELIMITER + level,
      "sort_key": hierarchyId,
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
}

/* DELETE delete hierarchy. */
// TODO check if there are assessments. Also delete children
const deleteHierarchy = (level, req, res) => {
  let clientId = req.user.client_id;
  let hierarchyId = req.params.hierarchyId;

  var params = {
    TableName: tableName,
    Key: {
      "partition_key": clientId + DELIMITER + level,
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

module.exports = router;
