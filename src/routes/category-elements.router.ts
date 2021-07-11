import { default as express } from 'express';
import { default as conf } from 'config'; 
import { v4 as uuid } from 'uuid';
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';
import { SequentialExecutor } from '../common/sequential-executor';

export const router = express.Router();

const tableName = conf.get('TABLE_CATEGORY_ELEMENTS');
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
  let type = req.params.type;

  retrieve(req, type, (categories) => {
    var resp = { "categories": categories };
    res.status(200);
    res.json(resp);
  });
});

export const retrieve = (req, type, callback: (categories: any[]) => void) => {
  recursiveRetrieve(req, type, 0, {}, (dataMap) => {
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

    callback(categories);
  });
};

const recursiveRetrieve = (req, type, index, dataMap, callback) => {

  var dbLooper = new Promise((resolveDBLoop:any, rejectDBLoop:any) => {
    var level = LEVELS[index]

    ddb.query(getListParams(req, type, level), function(response) {
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
    if(index == LEVELS.length-1) {
      callback(dataMap);
    } else {
      recursiveRetrieve(req, type, ++index, dataMap, callback)
    }
  });
};

/* GET categories listing. */
router.get('/:type/categories', function(req, res) {
  let type = req.params.type;

  var params = getListParams(req, type, CATEGORY);

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
router.get('/:type/elements', function(req, res) {
  let type = req.params.type;

  var params = getListParams(req, type, ELEMENT);

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

const getListParams = (req, type, level) =>  {
  let clientId = req['user'].client_id;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'id, #name, parent, sort_num',
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
  let clientId = req['user'].client_id;
  let type = req.params.type;
  let name = req.body.name;
  let parent = req.body.parent;
  let siteId = parent.split(DELIMITER)[0];
  let createTime = moment().format();
  let id = uuid();

  var params:any = {
    TableName: tableName,
    Item: {
      "partition_key": clientId + DELIMITER + type + DELIMITER + level,
      "sort_key": siteId + DELIMITER + id,
      "id": id,
      "name": name,
      "parent": parent,
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

const updateCategoryElement = (level, req, res) => {
  var queryParams = getQueryParams(req, level);

  let siteId = undefined;
  var synCaller = new Promise((resolveCall:any, rejectCall:any) => {
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
    let clientId = req['user'].client_id;
    let type = req.params.type;
    let id = req.params.id;
  
    var params:any = {
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
}

const getQueryParams = (req, level) => {
  let clientId = req['user'].client_id;
  let type = req.params.type;
  let id = req.params.id;
  
  var params:any = {
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
  var synCaller = new Promise((resolveCall:any, rejectCall:any) => {
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
    let clientId = req['user'].client_id;
    let type = req.params.type;
    let id = req.params.id;
  
    var params:any = {
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


export const createDefaultCategoryElements = (clientId, string, userEmail: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let createTime = moment().format();

  let error: any;
  let parallels = [];

  let defaultCategoryElements = [
    {"sort_num": 4,"parent": "","id": "1004","name": "Behaviours","partition_key": "$assessments$CATEGORY"},
    {"sort_num": 12,"parent": "","id": "1012","name": "Competencies","partition_key": "$assessments$CATEGORY"},
    {"sort_num": 1,"parent": "","id": "1001","name": "Documentation","partition_key": "$assessments$CATEGORY"},
    {"sort_num": 7,"parent": "","id": "1007","name": "Physical Conditions","partition_key": "$assessments$CATEGORY"},
    {"sort_num": 8,"parent": "","id": "1021","name": "Accessibility and Operability","partition_key": "$inspections$CATEGORY"},
    {"sort_num": 14,"parent": "","id": "1027","name": "Emergency Preparedness","partition_key": "$inspections$CATEGORY"},
    {"sort_num": 1,"parent": "","id": "1014","name": "Functional Status","partition_key": "$inspections$CATEGORY"},
    {"sort_num": 5,"parent": "","id": "1018","name": "General Order","partition_key": "$inspections$CATEGORY"},
    {"sort_num": 11,"parent": "","id": "1024","name": "Notification","partition_key": "$inspections$CATEGORY"},
    {"sort_num": 33,"parent": "","id": "1046","name": "Chemical","partition_key": "$hazards$CATEGORY"},
    {"sort_num": 48,"parent": "","id": "1061","name": "Electrical","partition_key": "$hazards$CATEGORY"},
    {"sort_num": 27,"parent": "","id": "1040","name": "Gravity","partition_key": "$hazards$CATEGORY"},
    {"sort_num": 17,"parent": "","id": "1030","name": "Mechanical","partition_key": "$hazards$CATEGORY"},
    {"sort_num": 53,"parent": "","id": "1066","name": "Pressure","partition_key": "$hazards$CATEGORY"},
    {"sort_num": 58,"parent": "","id": "1071","name": "Radiation","partition_key": "$hazards$CATEGORY"},
    {"sort_num": 43,"parent": "","id": "1056","name": "Thermal","partition_key": "$hazards$CATEGORY"},
    {"sort_num": 114,"parent": "","id": "1127","name": "Document / Procedure","partition_key": "$controls$CATEGORY"},
    {"sort_num": 99,"parent": "","id": "1112","name": "Emergency Preparedness","partition_key": "$controls$CATEGORY"},
    {"sort_num": 80,"parent": "","id": "1093","name": "Engineering Barriers","partition_key": "$controls$CATEGORY"},
    {"sort_num": 63,"parent": "","id": "1076","name": "General","partition_key": "$controls$CATEGORY"},
    {"sort_num": 90,"parent": "","id": "1103","name": "Plant and Equipment","partition_key": "$controls$CATEGORY"},
    {"sort_num": 107,"parent": "","id": "1120","name": "Materials Management","partition_key": "$controls$CATEGORY"},
    {"sort_num": 130,"parent": "","id": "1143","name": "PPE","partition_key": "$controls$CATEGORY"},
    {"sort_num": 122,"parent": "","id": "1135","name": "Workplace Notification","partition_key": "$controls$CATEGORY"},
    {"sort_num": 11,"parent": "1007","id": "1011","name": "Barricading and Signage","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 3,"parent": "1001","id": "1003","name": "Hazard ID and Control","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 6,"parent": "1004","id": "1006","name": "Health Compliance","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 10,"parent": "1007","id": "1010","name": "Housekeeping","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 2,"parent": "1001","id": "1002","name": "Permits and Authorisation","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 9,"parent": "1007","id": "1009","name": "PPE Condition and Suitability","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 5,"parent": "1004","id": "1005","name": "Safety Compliance","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 7,"parent": "1007","id": "1158","name": "Isolations","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 8,"parent": "1007","id": "1008","name": "Tools, Equipment, and Machinery","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 13,"parent": "1012","id": "1013","name": "Training and Skills","partition_key": "$assessments$ELEMENT"},
    {"sort_num": 10,"parent": "1021","id": "1023","name": "Access and egress","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 13,"parent": "1024","id": "1026","name": "Alarms and Signals","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 9,"parent": "1021","id": "1022","name": "Ergonomics","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 15,"parent": "1027","id": "1028","name": "Fire Equipment","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 16,"parent": "1027","id": "1029","name": "First aid and Refuge","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 3,"parent": "1014","id": "1016","name": "Guarding","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 6,"parent": "1018","id": "1019","name": "Housekeeping","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 2,"parent": "1014","id": "1015","name": "Operational Condition","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 12,"parent": "1024","id": "1025","name": "Signage","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 7,"parent": "1018","id": "1020","name": "Storage","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 4,"parent": "1014","id": "1017","name": "Ventilation","partition_key": "$inspections$ELEMENT"},
    {"sort_num": 41,"parent": "1046","id": "1054","name": "Biological","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 21,"parent": "1030","id": "1034","name": "Caught on / between","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 34,"parent": "1046","id": "1047","name": "Chemical contact","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 56,"parent": "1066","id": "1069","name": "Contact with pressire","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 22,"parent": "1030","id": "1035","name": "Cuts, abrasion","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 31,"parent": "1040","id": "1044","name": "Dropped object","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 38,"parent": "1046","id": "1051","name": "Dust / fibres","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 49,"parent": "1061","id": "1062","name": "Electrical contact","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 23,"parent": "1030","id": "1036","name": "Engulfed","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 55,"parent": "1066","id": "1068","name": "Explosion","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 28,"parent": "1040","id": "1041","name": "Fall to below","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 29,"parent": "1040","id": "1042","name": "Fall to same level","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 30,"parent": "1040","id": "1043","name": "Falling material","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 44,"parent": "1056","id": "1057","name": "Fire","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 20,"parent": "1030","id": "1033","name": "Flying particles","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 37,"parent": "1046","id": "1050","name": "Fumes","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 35,"parent": "1046","id": "1048","name": "Gas / vapour","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 45,"parent": "1056","id": "1058","name": "Hot surfaces / items","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 59,"parent": "1071","id": "1072","name": "Ionizing radiation","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 51,"parent": "1061","id": "1064","name": "Magnetic fields","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 36,"parent": "1046","id": "1049","name": "Mist","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 54,"parent": "1066","id": "1067","name": "Noise","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 26,"parent": "1030","id": "1039","name": "Other","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 32,"parent": "1040","id": "1045","name": "Other","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 42,"parent": "1046","id": "1055","name": "Other","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 47,"parent": "1056","id": "1060","name": "Other","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 52,"parent": "1061","id": "1065","name": "Other","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 57,"parent": "1066","id": "1070","name": "Other","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 62,"parent": "1071","id": "1075","name": "Other","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 39,"parent": "1046","id": "1052","name": "Oxygen deficiency","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 40,"parent": "1046","id": "1053","name": "Oxygen excess","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 50,"parent": "1061","id": "1063","name": "Static electricity","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 25,"parent": "1030","id": "1038","name": "Strain, sprain","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 19,"parent": "1030","id": "1032","name": "Struck against","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 18,"parent": "1030","id": "1031","name": "Struck by","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 46,"parent": "1056","id": "1059","name": "Temperature extremes","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 60,"parent": "1071","id": "1073","name": "UV radiation","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 24,"parent": "1030","id": "1037","name": "Vibration","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 61,"parent": "1071","id": "1074","name": "Visibility","partition_key": "$hazards$ELEMENT"},
    {"sort_num": 137,"parent": "1143","id": "1150","name": "Air Supply Breathing Apparatus","partition_key": "$controls$ELEMENT"},
    {"sort_num": 112,"parent": "1120","id": "1125","name": "Bunding","partition_key": "$controls$ELEMENT"},
    {"sort_num": 136,"parent": "1143","id": "1149","name": "Cartridge respirator","partition_key": "$controls$ELEMENT"},
    {"sort_num": 95,"parent": "1103","id": "1108","name": "Check condition","partition_key": "$controls$ELEMENT"},
    {"sort_num": 94,"parent": "1103","id": "1107","name": "Check inspection tags","partition_key": "$controls$ELEMENT"},
    {"sort_num": 91,"parent": "1103","id": "1104","name": "Check interlocks / deadman","partition_key": "$controls$ELEMENT"},
    {"sort_num": 96,"parent": "1103","id": "1109","name": "Check workload limit","partition_key": "$controls$ELEMENT"},
    {"sort_num": 133,"parent": "1143","id": "1146","name": "Chemical gloves","partition_key": "$controls$ELEMENT"},
    {"sort_num": 138,"parent": "1143","id": "1151","name": "Chemical suit","partition_key": "$controls$ELEMENT"},
    {"sort_num": 66,"parent": "1076","id": "1079","name": "Clean area","partition_key": "$controls$ELEMENT"},
    {"sort_num": 76,"parent": "1076","id": "1089","name": "Clearance distance","partition_key": "$controls$ELEMENT"},
    {"sort_num": 128,"parent": "1135","id": "1141","name": "Communication / Signals","partition_key": "$controls$ELEMENT"},
    {"sort_num": 125,"parent": "1135","id": "1138","name": "Cones","partition_key": "$controls$ELEMENT"},
    {"sort_num": 109,"parent": "1120","id": "1122","name": "Correct storage","partition_key": "$controls$ELEMENT"},
    {"sort_num": 86,"parent": "1093","id": "1099","name": "Depressurise, vent, drain","partition_key": "$controls$ELEMENT"},
    {"sort_num": 135,"parent": "1143","id": "1148","name": "Disposable respirator","partition_key": "$controls$ELEMENT"},
    {"sort_num": 139,"parent": "1143","id": "1152","name": "Disposable suit","partition_key": "$controls$ELEMENT"},
    {"sort_num": 75,"parent": "1076","id": "1088","name": "Elevate leads","partition_key": "$controls$ELEMENT"},
    {"sort_num": 87,"parent": "1093","id": "1100","name": "Erect Screen","partition_key": "$controls$ELEMENT"},
    {"sort_num": 73,"parent": "1076","id": "1086","name": "Establish clear exit route","partition_key": "$controls$ELEMENT"},
    {"sort_num": 131,"parent": "1143","id": "1144","name": "Face shield","partition_key": "$controls$ELEMENT"},
    {"sort_num": 104,"parent": "1112","id": "1117","name": "Fire blanket","partition_key": "$controls$ELEMENT"},
    {"sort_num": 126,"parent": "1135","id": "1139","name": "Flagging","partition_key": "$controls$ELEMENT"},
    {"sort_num": 71,"parent": "1076","id": "1084","name": "Gas monitoring","partition_key": "$controls$ELEMENT"},
    {"sort_num": 134,"parent": "1143","id": "1147","name": "General purpose gloves","partition_key": "$controls$ELEMENT"},
    {"sort_num": 132,"parent": "1143","id": "1145","name": "Goggles","partition_key": "$controls$ELEMENT"},
    {"sort_num": 83,"parent": "1093","id": "1096","name": "Hard Barricade","partition_key": "$controls$ELEMENT"},
    {"sort_num": 143,"parent": "1143","id": "1156","name": "Hearing protection","partition_key": "$controls$ELEMENT"},
    {"sort_num": 97,"parent": "1103","id": "1110","name": "Integrity inspection","partition_key": "$controls$ELEMENT"},
    {"sort_num": 81,"parent": "1093","id": "1094","name": "Isolate","partition_key": "$controls$ELEMENT"},
    {"sort_num": 65,"parent": "1076","id": "1078","name": "Job rotation","partition_key": "$controls$ELEMENT"},
    {"sort_num": 110,"parent": "1120","id": "1123","name": "Label","partition_key": "$controls$ELEMENT"},
    {"sort_num": 119,"parent": "1127","id": "1132","name": "Lift Study","partition_key": "$controls$ELEMENT"},
    {"sort_num": 77,"parent": "1076","id": "1090","name": "Lighting","partition_key": "$controls$ELEMENT"},
    {"sort_num": 84,"parent": "1093","id": "1097","name": "Local exhaust ventillation","partition_key": "$controls$ELEMENT"},
    {"sort_num": 93,"parent": "1103","id": "1106","name": "Logbook inspection","partition_key": "$controls$ELEMENT"},
    {"sort_num": 68,"parent": "1076","id": "1081","name": "Manual handling techniques","partition_key": "$controls$ELEMENT"},
    {"sort_num": 99,"parent": "1112","id": "1140","name": "Notify emergency service","partition_key": "$controls$ELEMENT"},
    {"sort_num": 79,"parent": "1076","id": "1092","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 89,"parent": "1093","id": "1102","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 98,"parent": "1103","id": "1111","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 106,"parent": "1112","id": "1119","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 113,"parent": "1120","id": "1126","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 121,"parent": "1127","id": "1134","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 129,"parent": "1135","id": "1142","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 144,"parent": "1143","id": "1157","name": "Other","partition_key": "$controls$ELEMENT"},
    {"sort_num": 115,"parent": "1127","id": "1128","name": "Permit","partition_key": "$controls$ELEMENT"},
    {"sort_num": 82,"parent": "1093","id": "1095","name": "Place lock and tag","partition_key": "$controls$ELEMENT"},
    {"sort_num": 102,"parent": "1112","id": "1115","name": "Position fire extinguisher","partition_key": "$controls$ELEMENT"},
    {"sort_num": 92,"parent": "1103","id": "1105","name": "Prestart check","partition_key": "$controls$ELEMENT"},
    {"sort_num": 67,"parent": "1076","id": "1080","name": "Regular fluid intake","partition_key": "$controls$ELEMENT"},
    {"sort_num": 105,"parent": "1112","id": "1118","name": "Rescue plan","partition_key": "$controls$ELEMENT"},
    {"sort_num": 88,"parent": "1093","id": "1101","name": "Residual Current Device","partition_key": "$controls$ELEMENT"},
    {"sort_num": 108,"parent": "1120","id": "1121","name": "Restrain and Secure","partition_key": "$controls$ELEMENT"},
    {"sort_num": 118,"parent": "1127","id": "1131","name": "Review manufacturer manual","partition_key": "$controls$ELEMENT"},
    {"sort_num": 116,"parent": "1127","id": "1129","name": "Risk Assessment / Procedure","partition_key": "$controls$ELEMENT"},
    {"sort_num": 117,"parent": "1127","id": "1130","name": "Safety Data Sheet","partition_key": "$controls$ELEMENT"},
    {"sort_num": 111,"parent": "1120","id": "1124","name": "Segregate","partition_key": "$controls$ELEMENT"},
    {"sort_num": 120,"parent": "1127","id": "1133","name": "Service / process drawings","partition_key": "$controls$ELEMENT"},
    {"sort_num": 123,"parent": "1135","id": "1136","name": "Signs","partition_key": "$controls$ELEMENT"},
    {"sort_num": 103,"parent": "1112","id": "1116","name": "Test alarm","partition_key": "$controls$ELEMENT"},
    {"sort_num": 64,"parent": "1076","id": "1077","name": "Test before touch","partition_key": "$controls$ELEMENT"},
    {"sort_num": 101,"parent": "1112","id": "1114","name": "Test eyewash station","partition_key": "$controls$ELEMENT"},
    {"sort_num": 100,"parent": "1112","id": "1113","name": "Test safety shower","partition_key": "$controls$ELEMENT"},
    {"sort_num": 70,"parent": "1076","id": "1083","name": "Time restrictions","partition_key": "$controls$ELEMENT"},
    {"sort_num": 78,"parent": "1076","id": "1091","name": "Tool layard","partition_key": "$controls$ELEMENT"},
    {"sort_num": 38,"parent": "1120","id": "1085","name": "Use mechanical lifting equipment","partition_key": "$controls$ELEMENT"},
    {"sort_num": 74,"parent": "1076","id": "1087","name": "User spotter","partition_key": "$controls$ELEMENT"},
    {"sort_num": 85,"parent": "1093","id": "1098","name": "Ventilation","partition_key": "$controls$ELEMENT"},
    {"sort_num": 124,"parent": "1135","id": "1137","name": "Warning tape","partition_key": "$controls$ELEMENT"},
    {"sort_num": 140,"parent": "1143","id": "1153","name": "Welding gloves","partition_key": "$controls$ELEMENT"},
    {"sort_num": 142,"parent": "1143","id": "1155","name": "Welding helmet","partition_key": "$controls$ELEMENT"},
    {"sort_num": 141,"parent": "1143","id": "1154","name": "Welding jacket / apron","partition_key": "$controls$ELEMENT"},
    {"sort_num": 69,"parent": "1076","id": "1082","name": "Work/Rest regime","partition_key": "$controls$ELEMENT"}
  ];

  defaultCategoryElements.forEach(defaultCategoryElement => {
    parallels.push(
      (resolve, reject) => {
        var params:any = {
          TableName: tableName,
          Item: {
            "partition_key": clientId + defaultCategoryElement.partition_key,
            "sort_key": defaultCategoryElement.id,
            "id": defaultCategoryElement.id,
            "name": defaultCategoryElement.name,
            "parent": defaultCategoryElement.parent,
            "sort_num": defaultCategoryElement.sort_num,
            "created_ts": createTime, 
            "created_by": userEmail,
            "updated_ts": createTime,
            "updated_by": userEmail
          }
        };
      
        ddb.insert(params, function(response) {
          if(response.data) {
            resolve(true);
          } else {
            error = response;
            reject(response);
          }
        });  
      
      }
    );
  });

  new SequentialExecutor().chain()
  .parallel(parallels)
  .success(() => {
    onSuccess("{ status: 'done' }");
  })
  .fail((error) => {
    onError(error);
  })
  .execute();
}
