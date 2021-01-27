var express = require('express');
var uuid = require('uuid');
var router = express.Router();

router.get("/hazards", (req, res, next) => {
  var response = {
    hazards: [
      {
        hazardId: 19252,
        hazardReference: "HRC-0000018252",
        dateConducted: "10-05-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "Fuel Farm - Kilwex - Installation of slab expansion joints"
      },
      {
        hazardId: 19251,
        hazardReference: "HRC-0000018251",
        dateConducted: "10-05-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "The Bridge - Flynns - Framing up floor."
      },
      {
        hazardId: 19250,
        hazardReference: "HRC-0000018250",
        dateConducted: "08-05-2019",
        completedBy: "GILLICK, Marie",
        summary: "Police Station Bathroom - Conneely - Site Inspection"
      },
      {
        hazardId: 19249,
        hazardReference: "HRC-0000018249",
        dateConducted: "29-04-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "T2 Retail - Glenbeigh - Installation of ducting"
      },
    ]
  };

  res.json(response);
});

router.get("/hazards/:hazardId", (req, res, next) => {
  var response = {};
  if (req.params.hazardId == 19252) {
    response = { hazard: [{ "hazard_id": 19252, "owner": "hrc", "activity_id": 4481, "hazard_actionstaken": "Notified work team", "hazard_completed": "2019-05-10T00:00:00", "hazard_created": "2019-05-13T05:58:07.500", "hazard_created_by": 10138, "hazard_created_byadmin": 0, "hazard_fullcompliance": 0, "hazard_furtheractionsrequired": "", "hazard_last_updated_byadmin": 1, "hazard_majornonconformances": "", "hazard_notes": "", "hazard_number": "HRC-0000018252", "hazard_summary": "Fuel Farm - Kilwex - Installation of slab expansion joints ", "assessor_id": 1568, "department_id": 10462, "location_id": 4666, "riskrating_id": 1002 }]};
  } else if (req.params.hazardId == 19251) {
    response = { hazard:[{"hazard_id":19251,"owner":"hrc","activity_id":4502,"hazard_actionstaken":"Notified worker and supervisor of requirements","hazard_completed":"2019-05-10T00:00:00","hazard_created":"2019-05-13T05:20:39.640","hazard_created_by":10138,"hazard_created_byadmin":0,"hazard_fullcompliance":0,"hazard_furtheractionsrequired":"","hazard_last_updated_byadmin":1,"hazard_majornonconformances":"","hazard_notes":"","hazard_number":"HRC-0000018251","hazard_summary":"The Bridge - Flynns - Framing up floor.","assessor_id":1568,"department_id":10431,"location_id":4656,"riskrating_id":1002}]};
  } else if (req.params.hazardId == 19250) {
    response = { hazard:[{"hazard_id":19250,"owner":"hrc","activity_id":4481,"hazard_actionstaken":"","hazard_completed":"2019-05-08T00:00:00","hazard_created":"2019-05-08T09:53:18.357","hazard_created_by":10141,"hazard_created_byadmin":0,"hazard_fullcompliance":0,"hazard_furtheractionsrequired":"","hazard_last_updated_byadmin":1,"hazard_majornonconformances":"","hazard_notes":"Personal was advised to wear PPE at all times.  Conneely were advised to stop working until Cable was shut down.  No working around live cable.  \r\nLone worker present.\r\nVacuum present to capture dust","hazard_number":"HRC-0000018250","hazard_summary":"Police Station Bathroom - Conneely - Site Inspection ","assessor_id":1565,"department_id":10433,"location_id":4655,"riskrating_id":1002}]};
  } else if (req.params.hazardId == 19249) {
    response = { hazard:[{"hazard_id":19249,"owner":"hrc","activity_id":4501,"hazard_actionstaken":"Discussed with site supervisor and work team.  Issues rectified.","hazard_completed":"2019-04-29T00:00:00","hazard_created":"2019-04-29T08:13:13.330","hazard_created_by":10138,"hazard_created_byadmin":0,"hazard_fullcompliance":0,"hazard_furtheractionsrequired":"","hazard_last_updated_byadmin":1,"hazard_majornonconformances":"","hazard_notes":"","hazard_number":"HRC-0000018249","hazard_summary":"T2 Retail - Glenbeigh - Installation of ducting","assessor_id":1568,"department_id":10435,"location_id":4656,"riskrating_id":1003}]};
  } else {
    res.status(404);
    res.json({ error: "Inspection not found" });
  };

  res.json(response);
});

router.get("/hazards/:hazardId/hazardElements", (req, res, next) => {
  var response = {};
  if (req.params.hazardId == 19252) {
    response = {"hazardelements": [
      {"hazard_id-hazardelement_id":"19249-1001","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19249-1002","owner":"hrc","hazard_hazardelement_noncompliance":"SPA did not detail the require","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19249-1003","owner":"hrc","hazard_hazardelement_noncompliance":"One workers not hrcing safety","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19249-1004","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19249-1005","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19249-1006","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19249-1007","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19249-1008","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19249-1009","owner":"hrc","hazard_hazardelement_noncompliance":"No barricading around the work","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19249-1010","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"}
    ]};
  } else if (req.params.hazardId == 19251) {
    response = {"hazardelements": [
      {"hazard_id-hazardelement_id":"19251-1001","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19251-1002","owner":"hrc","hazard_hazardelement_noncompliance":"Had not signed onto the SPA","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19251-1003","owner":"hrc","hazard_hazardelement_noncompliance":"Not hrcing eye protection, ha","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19251-1004","owner":"hrc","hazard_hazardelement_noncompliance":"Not hrcing hearing protection","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19251-1005","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19251-1006","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19251-1007","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19251-1008","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19251-1009","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19251-1010","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
    ]};
  } else if (req.params.hazardId == 19250) {
    response = {"hazardelements": [
      {"hazard_id-hazardelement_id":"19250-1001","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19250-1002","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19250-1003","owner":"hrc","hazard_hazardelement_noncompliance":"Personal hrcing no Glasses, n","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19250-1004","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19250-1005","owner":"hrc","hazard_hazardelement_noncompliance":"Live cable present.  Equipment","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19250-1006","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19250-1007","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19250-1008","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19250-1009","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19250-1010","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
    ]};
  } else if (req.params.hazardId == 19249) {
    response = {"hazardelements": [
      {"hazard_id-hazardelement_id":"19249-1001","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19249-1002","owner":"hrc","hazard_hazardelement_noncompliance":"SPA did not detail the require","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19249-1003","owner":"hrc","hazard_hazardelement_noncompliance":"One workers not hrcing safety","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19249-1004","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19249-1005","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
      {"hazard_id-hazardelement_id":"19249-1006","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19249-1007","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19249-1008","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"Y"},
      {"hazard_id-hazardelement_id":"19249-1009","owner":"hrc","hazard_hazardelement_noncompliance":"No barricading around the work","hazard_hazardelement_rating":"N"},
      {"hazard_id-hazardelement_id":"19249-1010","owner":"hrc","hazard_hazardelement_noncompliance":"","hazard_hazardelement_rating":"N/A"},
    ]};
  } else {
    res.status(404);
    res.json({ error: "Inspection not found" });
  };

  res.json(response);
});

module.exports = router;
