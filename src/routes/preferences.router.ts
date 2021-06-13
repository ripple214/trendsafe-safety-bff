import { default as express } from 'express';
import { default as conf } from 'config'; 
import { default as moment } from 'moment';

import { db_service as ddb } from '../services/ddb.service';

export const router = express.Router();

const tableName = conf.get('TABLE_PREFERENCES');

/* GET preferences */
router.get('/', function(req, res) {
  getPreferences(req, 
    (data) => {
      var resp = {"preferences": data};
      res.status(200);
      res.json(resp);
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
});

export const getPreferences = (req, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let clientId = req['user'].client_id;
  let userId = req['user'].user_id;
  
  var params:any = {
    TableName: tableName,
    ProjectionExpression: 'widgets',
    KeyConditionExpression: '#partition_key = :clientId and #sort_key = :userId',
    ExpressionAttributeNames:{
      "#partition_key": "partition_key",
      "#sort_key": "sort_key"
    },
    ExpressionAttributeValues: {
      ":clientId": clientId,
      ":userId": userId
    },
  };

  ddb.query(params, function(response) {
    if(response.data) {
      let userPreferences = {};

      if(response.data.length > 0) {
        userPreferences = response.data[0];
      }

      /*
      if(userPreferences['widgets']) {
        userPreferences['widgets'].sort(function (a, b) {
          return a.sort_num - b.sort_num;
        });
      }
      */

      let userWidgets = (userPreferences['widgets'] || []).filter(userWidget => {
        return (defaultWidgets.find((defaultWidget) => {
          return defaultWidget.id == userWidget.id
        }) != undefined)
      });

      let widgets = defaultWidgets.filter(widget => {
        return (userWidgets.find((userWidget) => {
          return widget.id == userWidget.id
        }) == undefined)
      });

      let mergedWidgets = widgets.concat(userWidgets);
      userPreferences['widgets'] = mergedWidgets;

      onSuccess(userPreferences);
    } else {
      onError({ 
        error: {
          message: "Preferences not found", 
          id: userId
        }
      })
    }
  });
}

/* PUT update preference. */
router.put('/', function(req, res) {
  let clientId = req['user'].client_id;
  let userId = req['user'].user_id;

  let widgets = req.body.widgets;

  var params:any = {
    TableName: tableName,
    Key: {
      "partition_key": clientId,
      "sort_key": userId,
    },
    UpdateExpression: 'set widgets = :widgets, updated_ts = :updated_ts, updated_by = :updated_by',
    ExpressionAttributeValues: {
      ":widgets": widgets,
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

const defaultWidgets =
[
  {id: "TA-CE", name: "Task Assessment - Compliance by Element", is_activated: true},
  {id: "TA-CC", name: "Task Assessment - Compliance by Category", is_activated: true},
  {id: "TA-EMT", name: "Task Assessment - Element Monthly Trend", is_activated: true},
  {id: "TA-RR", name: "Task Assessment - Risk Rating", is_activated: true},
  {id: "TA-MRC", name: "Task Assessment - Major Risk Categories", is_activated: true},
  {id: "TA-SR", name: "Task Assessment - Safety Rules", is_activated: true},
  {id: "TA-APD", name: "Task Assessment - Assessments performed by department / contractor", is_activated: true},
  {id: "TA-AA", name: "Task Assessment - Assessments by Assessor", is_activated: true},
  
  {id: "PAI-CE", name: "Plant / Area Inspection - Compliance by Element", is_activated: true},
  {id: "PAI-CC", name: "Plant / Area Inspection - Compliance by Category", is_activated: true},
  {id: "PAI-EMT", name: "Plant / Area Inspection - Element Monthly Trend", is_activated: true},
  {id: "PAI-RR", name: "Plant / Area Inspection - Risk Rating", is_activated: true},
  {id: "PAI-MRC", name: "Plant / Area Inspection - Major Risk Categories", is_activated: true},
  {id: "PAI-IPD", name: "Plant / Area Inspection - Inspections performed by department / contractor", is_activated: true},
  {id: "PAI-IA", name: "Plant / Area Inspection - Inspections by Assessor", is_activated: true},
  
  {id: "HR-HR", name: "Hazard Report - Hazard Reports", is_activated: true},
  {id: "HR-DER", name: "Hazard Report - Damaging Energies Report", is_activated: true},
  {id: "HR-RR", name: "Hazard Report - Risk Rating", is_activated: true},
  {id: "HR-SR", name: "Hazard Report - Safety Rules", is_activated: true},
  {id: "HR-MRC", name: "Hazard Report - Major Risk Categories", is_activated: true},
  {id: "HR-HRPD", name: "Hazard Report - Hazard reports performed by department / contractor", is_activated: true},
  {id: "HR-HRP", name: "Hazard Report - Hazard reports by Person", is_activated: true},
  
  {id: "TRM-HP", name: "Task Risk Management - Hazard Profile", is_activated: true},
  {id: "TRM-DER", name: "Task Risk Management - Damaging Energies Report", is_activated: true},
      
  {id: "II-APFM-DE", name: "Incident Investigation - Actual / potential failure mechanism - damaging energies", is_activated: true},
  {id: "II-APFM-T10H", name: "Incident Investigation - Actual / potential failure mechanism - Top 10 Hazards", is_activated: true},
  {id: "II-MRC", name: "Incident Investigation - Major Risk Categories", is_activated: true},
  {id: "II-ICAG", name: "Incident Investigation - Immediate Cause Analysis Graphs", is_activated: true},
  {id: "II-SOC", name: "Incident Investigation - System and Organization Causes", is_activated: true},
  {id: "II-SR", name: "Incident Investigation - Safety Rules", is_activated: true},
  
  //{id: "LI-PPI-MP", name: "Lead Indicators - PPI - Monthly Performance", is_activated: true},
  {id: "LI-PPI-TR", name: "Lead Indicators - PPI - Trend Report", is_activated: true},

  //{id: "LI-LSI-MP", name: "Lead Indicators - LSI - Monthly Performance", is_activated: true},
  {id: "LI-LSI-TR", name: "Lead Indicators - LSI - Trend Report", is_activated: true},

  {id: "CCM-DE-HT", name: "Combined and Comparative Metrics - Damaging Energies (Hazards and TRM)", is_activated: true},
  {id: "CCM-H-HT", name: "Combined and Comparative Metrics - Hazards (Hazards and TRM)", is_activated: true},
  {id: "CCM-MRC", name: "Combined and Comparative Metrics - Major Risk Categories (all sources)", is_activated: true},
  {id: "CCM-SRB", name: "Combined and Comparative Metrics - Safety Rule Breaches (all sources)", is_activated: true},
]
