import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';

export const router = express.Router();

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

  getEntityMap(req, 
    (entityMap) => {
      let retVal = [];
      if(entityMap[DIVISION]) {
        Object.keys(entityMap[DIVISION]).forEach(divisionId => {
          retVal.push(entityMap[DIVISION][divisionId]);
        });
      }    
    
      let resp = {"hierarchies": {"divisions": retVal}};
      res.status(200);
      res.json(resp);
    
      console.log("responded");
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

const getEntityMap = (req, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let divisions: any[];
  let projects: any[];
  let sites: any[];
  let subsites: any[];
  let departments: any[];

  let error: any;

  new SequentialExecutor().chain()
  .parallel([
    (resolve, reject) => {
      getDivisions(req, 
        (data) => {
          divisions = data;
          resolve(true);
        }, 
        (err) => {
          error = err;
          reject(err);
        }
      );
    },
    (resolve, reject) => {
      getProjects(req, 
        (data) => {
          projects = data;
          resolve(true);
        }, 
        (err) => {
          error = err;
          reject(err);
        }
      );
    },
    (resolve, reject) => {
      getSites(req, 
        (data) => {
          sites = data;
          resolve(true);
        }, 
        (err) => {
          error = err;
          reject(err);
        }
      );
    },
    (resolve, reject) => {
      getSubsites(req, 
        (data) => {
          subsites = data;
          resolve(true);
        }, 
        (err) => {
          error = err;
          reject(err);
        }
      );
    },
    (resolve, reject) => {
      getDepartments(req, 
        (data) => {
          departments = data;
          resolve(true);
        }, 
        (err) => {
          error = err;
          reject(err);
        }
      );
    }
  ])
  .success(() => {
    try {
      let entityMap = {};
      divisions.forEach(division => {
        setHierarchy(entityMap, division, DIVISION);
      });
      projects.forEach(project => {
        setHierarchy(entityMap, project, PROJECT);
      });
      sites.forEach(site => {
        setHierarchy(entityMap, site, SITE);
      });
      subsites.forEach(subsite => {
        setHierarchy(entityMap, subsite, SUBSITE);
      });
      departments.forEach(department => {
        setHierarchy(entityMap, department, DEPARTMENT);
      });
  
      // set parent names
      LEVELS.forEach((level, index) => {
        Object.keys(entityMap[level]).forEach(id => {
          let entity = entityMap[level][id];
          let parents = entity.parents;
          if(parents != '') {
            let parent = entityMap[LEVELS[index-1]][parents];
            let parentNames = (parent.parentNames || '');
            if(parentNames == '') {
              parentNames = parent.name;
            } else {
              parentNames = parentNames + ' / ' + parent.name;
            }
            entity.parentNames = parentNames;
          }
        });
      });
  
      onSuccess(entityMap);
    } catch(e) {
      console.log("error", e);
      error = e;
      onError(error);
    }
  })
  .fail(() => {
    onError(error);
  })
  .execute();
};

const setHierarchy = (entityMap, entity, level) => {
  if(entityMap[level] == undefined) {
    entityMap[level] = {};
  }

  let currentEntity = entity;
  let parents = currentEntity.parents;
  if(parents) {
    entityMap[level][parents + DELIMITER + currentEntity.id] = currentEntity;
  } else {
    entityMap[level][currentEntity.id] = currentEntity;
  }

  let levelIndex = LEVELS.indexOf(level);

  //console.log("level", level, currentEntity.name, currentEntity.id);

  while(parents != "") {
    //console.log("\tparents", parents);

    let parentChildDescription = LEVEL_DESCRIPTIONS[LEVELS[levelIndex]];
    levelIndex--;
    let parentLevel = LEVELS[levelIndex];
    let parentId = parents;

    if(entityMap[parentLevel] == undefined) {
      entityMap[parentLevel] = {};
    }
    let parent = entityMap[parentLevel][parentId];

    let immediateParentId = parents.substring(parents.lastIndexOf(DELIMITER)+1);
    if(parent == undefined && immediateParentId == -1) {
      parent = {
        id: -1,
        parents: parents.substring(0, parents.lastIndexOf(DELIMITER)),
        //name: "Skipped " + parentLevel
        name: "-"
      }
      entityMap[parentLevel][parents] = parent;
    }

    if(parent) {
      let children = parent[parentChildDescription];
      if(children == undefined) {
        children = []
        parent[parentChildDescription] = children;
      }

      if(children.find((child) => {
        return currentEntity.id == child.id
      }) == undefined) {
        
        //currentEntity.parentNames = (parent.parentNames ? parent.parentNames + ', ' : '') + parent.name;
        children.push(currentEntity);
      }
      currentEntity = parent;
    }

    //console.log("\t\tparent", parent, "immediateParentId", immediateParentId);

    parents = parents.substring(0, parents.lastIndexOf(DELIMITER));
  }
};

const getParams = (req, level) => {
  let clientId = req['user'].client_id;

  return {
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
  let clientId = req['user'].client_id;
  let createTime = moment().format();
  let id = uuid();

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

  var params:any = {
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
}

const updateHierarchy = (level, req, res) => {
  let clientId = req['user'].client_id;
  let hierarchyId = req.params.hierarchyId;

  var params:any = {
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
}

/* DELETE delete hierarchy. */
// TODO check if there are assessments
const deleteHierarchy = (level, req, res) => {
  let clientId = req['user'].client_id;
  let hierarchyId = req.params.hierarchyId;

  if(level == DIVISION) {
    req.query["divisionId"] = hierarchyId;
  } else if(level == PROJECT) {
    req.query["projectId"] = hierarchyId;
  } else if(level == SITE) {
    req.query["siteId"] = hierarchyId;
  } else if(level == SUBSITE) {
    req.query["subsiteId"] = hierarchyId;
  } 

  let resp = {};
  let error = {};
  let executor = new SequentialExecutor();

  executor.chain((resolve, reject) => {
    let params:any = {
      TableName: tableName,
      Key: {
        "partition_key": clientId + DELIMITER + level,
        "sort_key": hierarchyId,
      },
    };
    console.log("delete requested entity", level, hierarchyId);

    ddb.delete(params, function(response) {
      if (!response.error) {
        resolve(true);
        resp = response;
      } else {
        error = response;
        reject(error);
      }
    });
  });

  let parallels= [];

  for(let i=LEVELS.indexOf(level)+1; i<LEVELS.length; i++) {    
    parallels.push(
      (resolve, reject) => {
        getHierarchy(req, LEVELS[i], 
          (data) => {
            //console.log("get id of children", LEVELS[i], data.map(child => { return { id: child.id, name: child.name } }));
            data.forEach((entity) => {
              let params:any = {
                TableName: tableName,
                Key: {
                  "partition_key": clientId + DELIMITER + LEVELS[i],
                  "sort_key": entity.id,
                },
              };
              console.log("deleting entity", LEVELS[i], entity.id, entity.name);

              ddb.delete(params, function(response) {
                if (!response.error) {
                  resolve(true);
                } else {
                  error = response;
                  reject(error);
                }
              });
            });

            if(data.length == 0) {
              resolve(true);
            }
          }, 
          (err) => {
            error = err;
            reject(error);
          }
        );
      }
    )
  }
  if(parallels.length) {
    executor.parallel(parallels);
  }

  executor.success(() => {
    res.status(204);
    res.json();
  })
  .fail(() => {
    res.status(400);
    res.json(error);
  });
  
  executor.execute();
};

/* GET divisions listing. */
router.get('/divisions', function(req, res, next) {
  getEntities(req, DIVISION,
    (data) => {
      var resp = {"divisions": data};
      res.status(200);
      res.json(resp);
    }, 
    (err) => {
      res.status(400);
      res.json(err);
    }
  );
});

/* GET projects listing. */
router.get('/projects', function(req, res, next) {
  getEntities(req, PROJECT, 
    (data) => {
      var resp = {"projects": data};
      res.status(200);
      res.json(resp);
    }, 
    (err) => {
      res.status(400);
      res.json(err);
    }
  );
});

/* GET sites listing. */
router.get('/sites', function(req, res, next) {
  getEntities(req, SITE,
    (data) => {
      var resp = {"sites": data};
      res.status(200);
      res.json(resp);
    }, 
    (err) => {
      res.status(400);
      res.json(err);
    }
  );
});

/* GET subsites listing. */
router.get('/subsites', function(req, res, next) {
  getEntities(req, SUBSITE,
    (data) => {
      var resp = {"subsites": data};
      res.status(200);
      res.json(resp);
    }, 
    (err) => {
      res.status(400);
      res.json(err);
    }
  );
});

/* GET department listing. */
router.get('/departments', function(req, res, next) {
  getEntities(req, DEPARTMENT,
    (data) => {
      var resp = {"departments": data};
      res.status(200);
      res.json(resp);
    }, 
    (err) => {
      res.status(400);
      res.json(err);
    }
  );
});

const getFilter = (req): {parentField: string, parentFieldValue: string} => {
  let divisionId = req.query.divisionId;
  let projectId = req.query.projectId;
  let siteId = req.query.siteId;
  let subsiteId = req.query.subsiteId;

  let parentField = undefined;
  let parentFieldValue = undefined;

  if(divisionId) {
    parentField = "division_id";
    parentFieldValue = divisionId;
  }

  if(projectId) {
    parentField = "project_id";
    parentFieldValue = projectId;
  }

  if(siteId) {
    parentField = "site_id";
    parentFieldValue = siteId;
  }

  if(subsiteId) {
    parentField = "subsite_id";
    parentFieldValue = subsiteId;
  }

  if(parentField && parentFieldValue) {
    return {
      parentField: parentField, 
      parentFieldValue: parentFieldValue
    }
  } else {
    return undefined;
  }
};

const getEntities = (req, level, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let filter = getFilter(req);
  getEntityMap(req, 
    (entityMap) => {
      let entities = [].concat(Object.values(entityMap[level]))
      .filter(entity => {
        let isMatch = entity.id != -1;
        if(filter) {
          isMatch = isMatch && entity[filter.parentField] == filter.parentFieldValue
        }
        return isMatch;
      })
      .map(entity => {
        return {
          id: entity.id,
          name: entity.name,
          parents: entity.parents,
          parentNames: entity.parentNames,
          division_id: entity.division_id,
          project_id: entity.project_id,
          site_id: entity.site_id,
          subsite_id: entity.subsite_id,
          department_id: entity.department_id
        }
      })
      onSuccess(entities);
    }, 
    (error) => {
      onError(error);
    }
  );
}

export const getDivisions = (req, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  getHierarchy(req, DIVISION, onSuccess, onError);
}

export const getProjects = (req, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  getHierarchy(req, PROJECT, onSuccess, onError);
}

export const getSites = (req, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  getHierarchy(req, SITE, onSuccess, onError);
}

export const getSubsites = (req, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  getHierarchy(req, SUBSITE, onSuccess, onError);
}

export const getDepartments = (req, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  getHierarchy(req, DEPARTMENT, onSuccess, onError);
}

const getHierarchy = (req, level, onSuccess: (data: any) => void, onError?: (error: any) => void) => {

  var params = getParams(req, level);

  ddb.query(params, function(response) {
    if(response.error) {
      onError(response);
    } else {
      response.data.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
      onSuccess(response.data);
    }
  });
}


