var express = require('express');
var uuid = require('uuid');
var router = express.Router();

router.get("/assessments", (req, res, next) => {
  var response = {
    assessments: [
      {
        assessmentId: 19252,
        assessmentReference: "STAR-0000018252",
        dateConducted: "10-05-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "Fuel Farm - Kilwex - Installation of slab expansion joints"
      },
      {
        assessmentId: 19251,
        assessmentReference: "STAR-0000018251",
        dateConducted: "10-05-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "The Bridge - Flynns - Framing up floor."
      },
      {
        assessmentId: 19250,
        assessmentReference: "STAR-0000018250",
        dateConducted: "08-05-2019",
        completedBy: "GILLICK, Marie",
        summary: "Police Station Bathroom - Conneely - Site Inspection"
      },
      {
        assessmentId: 19249,
        assessmentReference: "STAR-0000018249",
        dateConducted: "29-04-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "T2 Retail - Glenbeigh - Installation of ducting"
      },
    ]
  };

  res.json(response);
});

router.get("/assessments/:assessmentId", (req, res, next) => {
  var response = {};
  if (req.params.assessmentId == 19252) {
    response = { assessment: [{ "assessment_id": 19252, "owner": "star", "activity_id": 4481, "assessment_actionstaken": "Notified work team", "assessment_completed": "2019-05-10T00:00:00", "assessment_created": "2019-05-13T05:58:07.500", "assessment_created_by": 10138, "assessment_created_byadmin": 0, "assessment_fullcompliance": 0, "assessment_furtheractionsrequired": "", "assessment_last_updated_byadmin": 1, "assessment_majornonconformances": "", "assessment_notes": "", "assessment_number": "STAR-0000018252", "assessment_summary": "Fuel Farm - Kilwex - Installation of slab expansion joints ", "assessor_id": 1568, "department_id": 10462, "location_id": 4666, "riskrating_id": 1002 }]};
  } else if (req.params.assessmentId == 19251) {
    response = { assessment:[{"assessment_id":19251,"owner":"star","activity_id":4502,"assessment_actionstaken":"Notified worker and supervisor of requirements","assessment_completed":"2019-05-10T00:00:00","assessment_created":"2019-05-13T05:20:39.640","assessment_created_by":10138,"assessment_created_byadmin":0,"assessment_fullcompliance":0,"assessment_furtheractionsrequired":"","assessment_last_updated_byadmin":1,"assessment_majornonconformances":"","assessment_notes":"","assessment_number":"STAR-0000018251","assessment_summary":"The Bridge - Flynns - Framing up floor.","assessor_id":1568,"department_id":10431,"location_id":4656,"riskrating_id":1002}]};
  } else if (req.params.assessmentId == 19250) {
    response = { assessment:[{"assessment_id":19250,"owner":"star","activity_id":4481,"assessment_actionstaken":"","assessment_completed":"2019-05-08T00:00:00","assessment_created":"2019-05-08T09:53:18.357","assessment_created_by":10141,"assessment_created_byadmin":0,"assessment_fullcompliance":0,"assessment_furtheractionsrequired":"","assessment_last_updated_byadmin":1,"assessment_majornonconformances":"","assessment_notes":"Personal was advised to wear PPE at all times.  Conneely were advised to stop working until Cable was shut down.  No working around live cable.  \r\nLone worker present.\r\nVacuum present to capture dust","assessment_number":"STAR-0000018250","assessment_summary":"Police Station Bathroom - Conneely - Site Inspection ","assessor_id":1565,"department_id":10433,"location_id":4655,"riskrating_id":1002}]};
  } else if (req.params.assessmentId == 19249) {
    response = { assessment:[{"assessment_id":19249,"owner":"star","activity_id":4501,"assessment_actionstaken":"Discussed with site supervisor and work team.  Issues rectified.","assessment_completed":"2019-04-29T00:00:00","assessment_created":"2019-04-29T08:13:13.330","assessment_created_by":10138,"assessment_created_byadmin":0,"assessment_fullcompliance":0,"assessment_furtheractionsrequired":"","assessment_last_updated_byadmin":1,"assessment_majornonconformances":"","assessment_notes":"","assessment_number":"STAR-0000018249","assessment_summary":"T2 Retail - Glenbeigh - Installation of ducting","assessor_id":1568,"department_id":10435,"location_id":4656,"riskrating_id":1003}]};
  } else {
    res.status(404);
    res.json({ error: "Assessment not found" });
  };

  res.json(response);
});

router.get("/assessments/:assessmentId/assessmentElements", (req, res, next) => {
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
