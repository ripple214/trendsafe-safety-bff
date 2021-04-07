var express = require('express');
var router = express.Router();
var conf = require('config'); 
var moment = require('moment');

var ddb = require('./ddb');

/* GET compliance-by-element report */
router.get('/compliance-by-element', function(req, res, next) {
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  getCategories(req, "assessments", (categories) => {
    var params = getAssessmentsParam(req);

    ddb.query(params, function(response) {
      if (response.data) {
        let chartData = [];
        let tableData = [];
        let assessments = response.data;
  
        categories.forEach((category) => {
          category.elements.forEach((element) => {
            let compliantCount = 0;
            let nonCompliantCount = 0;
            let notApplicableCount = 0;
            let total = assessments.length;
            assessments.forEach((assessment) => {
              let isCompliant = assessment.element_compliance[element.id]['Y'];
              if(isCompliant) {
                compliantCount++;
              }
  
              let isNonCompliant = assessment.element_compliance[element.id]['N'];
              if(isNonCompliant) {
                nonCompliantCount++;
              }
  
              let isNotApplicable = assessment.element_compliance[element.id]['NA'];
              if(isNotApplicable) {
                notApplicableCount++;
              }
            });
            var percentage = (compliantCount / total * 100).toFixed(2);
            chartData.push({
              name: element.name + ' ' + percentage + '%',
              value: percentage
            });
  
            tableData.push({
              category: category.name,
              element: element.name,
              compliance: {
                y: {
                  total: compliantCount,
                  percent_total: (compliantCount / total * 100).toFixed(0),
                  percent_applicable: (compliantCount / (total-notApplicableCount) * 100).toFixed(0),
                },
                n: {
                  total: nonCompliantCount,
                  percent_total: (nonCompliantCount / total * 100).toFixed(0),
                  percent_applicable: (nonCompliantCount / (total-notApplicableCount) * 100).toFixed(0),
                },
                na: {
                  total: notApplicableCount,
                  percent_total: (notApplicableCount / total * 100).toFixed(0)
                }
              }
            });
          });
        });
  
        var resp = {"report-data": {
          start_date: startDate,
          end_date: endDate,
          no_of_assessments: assessments.length, 
          summary: chartData,
          details: tableData
        }};
        res.status(200);
        res.json(resp);
      } else {
        res.status(400);
        res.json(response);
      }
    });    
  });
});

const getAssessmentsParam = (req) => {
  let tableName = conf.get('TABLE_ASSESSMENTS');
  let clientId = req.user.client_id;

  var params = {
    TableName: tableName,
    ProjectionExpression: 'id, element_compliance',
    KeyConditionExpression: '#partition_key = :clientId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
    },
    ExpressionAttributeValues: {
      ":clientId": clientId
    },
  };

  return params;
};

var DELIMITER = "$";
var CATEGORY = "CATEGORY";
var ELEMENT = "ELEMENT";

var LEVELS = [CATEGORY, ELEMENT];
var LEVEL_DESCRIPTIONS = {
  CATEGORY: "categories", 
  ELEMENT: "elements"
};

const getCategories = (req, type, callback) => {
  retrieve(req, type, LEVELS, (dataMap) => {
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
}

const retrieve = (req, type, levels, callback) => {
  recursiveRetrieve(req, type, levels, 0, {}, callback);
};

const recursiveRetrieve = (req, type, levels, index, dataMap, callback) => {

  var dbLooper = new Promise((resolveDBLoop, rejectDBLoop) => {
    var level = levels[index]

    ddb.query(getCategoryElementsListParams(req, type, level), function(response) {
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
      recursiveRetrieve(req, type, levels, ++index, dataMap, callback)
    }
  });
};

const getCategoryElementsListParams = (req, type, level) =>  {
  let tableName = conf.get('TABLE_CATEGORY_ELEMENTS');
  let clientId = req.user.client_id;
  
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

module.exports = router;
