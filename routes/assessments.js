var express = require('express');
var uuid = require('uuid');
var router = express.Router();

router.get("/", (req, res, next) => {
  var response = {
    assessments: [
      {
        id: 19252,
        name: "DEMO-0000018252",
        completed_ts: "02-19-2019",
        assessor: {
          id: "1",
          name: "WILLIAMS, Nathan"
        },
        risk_rating: {
          id: "1",
          name: "MODERATE"
        },
        summary: "Fuel Farm - Kilwex - Installation of slab expansion joints"
      },
    ]
  };

  res.json(response);
});

router.get("/:assessmentId", (req, res, next) => {
  var response = {};
  if (req.params.assessmentId == 19252) {
    response = { 
      "id": 19252, 
      "owner": "star", 
      "activity_id": 4481, 
      "actions_taken": "Notified work team", 
      "key_findings": "Found out that a lot of the safety precautions are not implemented", 
      "completed_ts": "2019-05-10T00:00:00", 
      "created_ts": "2019-05-13T05:58:07.500", 
      "assessor": {
        id: 10138, 
        name: "WILLIAMS, Nathan"
      }, 
      "created_byadmin": 0, 
      "full_compliance": 0, 
      "further_actions_required": "Please contact site manager immediately", 
      "last_updated_by_admin": 1, 
      "major_non_conformances": "", 
      "notes": "", 
      "name": "DEMO-0000018252", 
      "summary": "Fuel Farm - Kilwex - Installation of slab expansion joints ", 
      "department_id": 10462, 
      "location_id": 4666, 
      "risk_rating": {
        "MAJOR": "false",
        "MODERATE": "true",
        "MINOR": "false",
        "ACCEPTABLE": "false",
      },
      "element_compliance" : {
        "1002": {
          "Y": "true",
          "N": "false",
          "NA": "false",
          "name": "PERMIT AND AUTHORIZATION",
          "summary": ""
        },
        "1003": {
          "Y": "true",
          "N": "false",
          "NA": "false",
          "name": "HAZARD ID AND CONTROL",
          "summary": ""
        },
        "1005": {
          "Y": "true",
          "N": "false",
          "NA": "false",
          "name": "SAFETY COMPLIANCE",
          "summary": ""
        },
        "1006": {
          "Y": "false",
          "N": "true",
          "NA": "false",
          "name": "HEALTH HAZARD COMPLIANCE",
          "summary": "Sample text for Health Hazard Compliance"
        },
        "1008": {
          "Y": "false",
          "N": "true",
          "NA": "false",
          "name": "TOOLS, EQUIPMENT, AND MACHINERY",
          "summary": "Sample text for Tools, Equipment, and Machinery"
        },
        "1009": {
          "Y": "false",
          "N": "true",
          "NA": "false",
          "name": "PPE CONDITION AND SUITABILITY",
          "summary": "Sample text for PPE Condition and Suitability"
        },
        "1010": {
          "Y": "false",
          "N": "true",
          "NA": "false",
          "name": "HOUSEKEEPING",
          "summary": "Sample text for Housekeeping"
        },
        "1011": {
          "Y": "true",
          "N": "false",
          "NA": "false",
          "name": "BARRICADING AND SIGNAGE",
          "summary": ""
        },
        "1013": {
          "Y": "false",
          "N": "false",
          "NA": "true",
          "name": "TRAINING AND SKILLS",
          "summary": ""
        },
      },
      "risk_compliance" : {
        "1001": "false",
        "1002": "true",
        "1003": "false",
      },
      "rule_compliance" : {
        "1": "false",
        "2": "false",
        "3": "true",
      },
    };
  } else if (req.params.assessmentId == 19251) {
    response = { "id":19251,"owner":"star","activity_id":4502,"actions_taken":"Notified worker and supervisor of requirements","completed_ts":"2019-05-10T00:00:00","created_ts":"2019-05-13T05:20:39.640","assessor":{id: 10138, name: "WILLIAMS, Nathan"},"created_byadmin":0,"full_compliance":0,"further_actions_required":"","last_updated_by_admin":1,"major_non_conformances":"","notes":"","name":"STAR-0000018251","summary":"The Bridge - Flynns - Framing up floor.", "department_id":10431,"location_id":4656,"risk_rating":{id: "2", name: "MODERATE"} };
  } else if (req.params.assessmentId == 19250) {
    response = { "id":19250,"owner":"star","activity_id":4481,"actions_taken":"","completed_ts":"2019-05-08T00:00:00","created_ts":"2019-05-08T09:53:18.357","assessor":{id: 10138, name: "WILLIAMS, Nathan"},"created_byadmin":0,"full_compliance":0,"further_actions_required":"","last_updated_by_admin":1,"major_non_conformances":"","notes":"Personal was advised to wear PPE at all times.  Conneely were advised to stop working until Cable was shut down.  No working around live cable.  \r\nLone worker present.\r\nVacuum present to capture dust","name":"STAR-0000018250","summary":"Police Station Bathroom - Conneely - Site Inspection ","assessor_id":1565,"department_id":10433,"location_id":4655,"risk_rating":{id: "3", name: "MODERATE"} };
  } else if (req.params.assessmentId == 19249) {
    response = { "id":19249,"owner":"star","activity_id":4501,"actions_taken":"Discussed with site supervisor and work team.  Issues rectified.","completed_ts":"2019-04-29T00:00:00","created_ts":"2019-04-29T08:13:13.330","assessor":{id: 10138, name: "WILLIAMS, Nathan"},"created_byadmin":0,"full_compliance":0,"further_actions_required":"","last_updated_by_admin":1,"major_non_conformances":"","notes":"","name":"STAR-0000018249","summary":"T2 Retail - Glenbeigh - Installation of ducting","assessor_id":1568,"department_id":10435,"location_id":4656,"risk_rating":{id: "4", name: "ACCEPTABLE"} };
  } else {
    res.status(404);
    res.json({ error: "Assessment not found" });
  };

  res.json(response);
});

router.get("/:assessmentId/assessmentElements", (req, res, next) => {
  var response = {};
  if (req.params.assessmentId == 19252) {
    response = {"assessmentelements": [
      {"assessment_id-assessmentelement_id":"19249-1001","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19249-1002","owner":"wear","assessment_assessmentelement_noncompliance":"SPA did not detail the require","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19249-1003","owner":"wear","assessment_assessmentelement_noncompliance":"One workers not wearing safety","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19249-1004","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19249-1005","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19249-1006","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19249-1007","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19249-1008","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19249-1009","owner":"wear","assessment_assessmentelement_noncompliance":"No barricading around the work","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19249-1010","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"}
    ]};
  } else if (req.params.assessmentId == 19251) {
    response = {"assessmentelements": [
      {"assessment_id-assessmentelement_id":"19251-1001","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19251-1002","owner":"wear","assessment_assessmentelement_noncompliance":"Had not signed onto the SPA","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19251-1003","owner":"wear","assessment_assessmentelement_noncompliance":"Not wearing eye protection, ha","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19251-1004","owner":"wear","assessment_assessmentelement_noncompliance":"Not wearing hearing protection","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19251-1005","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19251-1006","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19251-1007","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19251-1008","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19251-1009","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19251-1010","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
    ]};
  } else if (req.params.assessmentId == 19250) {
    response = {"assessmentelements": [
      {"assessment_id-assessmentelement_id":"19250-1001","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19250-1002","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19250-1003","owner":"wear","assessment_assessmentelement_noncompliance":"Personal wearing no Glasses, n","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19250-1004","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19250-1005","owner":"wear","assessment_assessmentelement_noncompliance":"Live cable present.  Equipment","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19250-1006","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19250-1007","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19250-1008","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19250-1009","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19250-1010","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
    ]};
  } else if (req.params.assessmentId == 19249) {
    response = {"assessmentelements": [
      {"assessment_id-assessmentelement_id":"19249-1001","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19249-1002","owner":"wear","assessment_assessmentelement_noncompliance":"SPA did not detail the require","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19249-1003","owner":"wear","assessment_assessmentelement_noncompliance":"One workers not wearing safety","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19249-1004","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19249-1005","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
      {"assessment_id-assessmentelement_id":"19249-1006","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19249-1007","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19249-1008","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"Y"},
      {"assessment_id-assessmentelement_id":"19249-1009","owner":"wear","assessment_assessmentelement_noncompliance":"No barricading around the work","assessment_assessmentelement_rating":"N"},
      {"assessment_id-assessmentelement_id":"19249-1010","owner":"wear","assessment_assessmentelement_noncompliance":"","assessment_assessmentelement_rating":"N/A"},
    ]};
  } else {
    res.status(404);
    res.json({ error: "Assessment not found" });
  };

  res.json(response);
});

module.exports = router;
