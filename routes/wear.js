var express = require('express');
var uuid = require('uuid');
var router = express.Router();

router.get("/inspections", (req, res, next) => {
  var response = {
    inspections: [
      {
        inspectionId: 19252,
        inspectionReference: "WEAR-0000018252",
        dateConducted: "10-05-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "Fuel Farm - Kilwex - Installation of slab expansion joints"
      },
      {
        inspectionId: 19251,
        inspectionReference: "WEAR-0000018251",
        dateConducted: "10-05-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "The Bridge - Flynns - Framing up floor."
      },
      {
        inspectionId: 19250,
        inspectionReference: "WEAR-0000018250",
        dateConducted: "08-05-2019",
        completedBy: "GILLICK, Marie",
        summary: "Police Station Bathroom - Conneely - Site Inspection"
      },
      {
        inspectionId: 19249,
        inspectionReference: "WEAR-0000018249",
        dateConducted: "29-04-2019",
        completedBy: "WILLIAMS, Nathan",
        summary: "T2 Retail - Glenbeigh - Installation of ducting"
      },
    ]
  };

  res.json(response);
});

router.get("/inspections/:inspectionId", (req, res, next) => {
  var response = {};
  if (req.params.inspectionId == 19252) {
    response = { inspection: [{ "inspection_id": 19252, "owner": "star", "activity_id": 4481, "inspection_actionstaken": "Notified work team", "inspection_completed": "2019-05-10T00:00:00", "inspection_created": "2019-05-13T05:58:07.500", "inspection_created_by": 10138, "inspection_created_byadmin": 0, "inspection_fullcompliance": 0, "inspection_furtheractionsrequired": "", "inspection_last_updated_byadmin": 1, "inspection_majornonconformances": "", "inspection_notes": "", "inspection_number": "WEAR-0000018252", "inspection_summary": "Fuel Farm - Kilwex - Installation of slab expansion joints ", "assessor_id": 1568, "department_id": 10462, "location_id": 4666, "riskrating_id": 1002 }]};
  } else if (req.params.inspectionId == 19251) {
    response = { inspection:[{"inspection_id":19251,"owner":"star","activity_id":4502,"inspection_actionstaken":"Notified worker and supervisor of requirements","inspection_completed":"2019-05-10T00:00:00","inspection_created":"2019-05-13T05:20:39.640","inspection_created_by":10138,"inspection_created_byadmin":0,"inspection_fullcompliance":0,"inspection_furtheractionsrequired":"","inspection_last_updated_byadmin":1,"inspection_majornonconformances":"","inspection_notes":"","inspection_number":"WEAR-0000018251","inspection_summary":"The Bridge - Flynns - Framing up floor.","assessor_id":1568,"department_id":10431,"location_id":4656,"riskrating_id":1002}]};
  } else if (req.params.inspectionId == 19250) {
    response = { inspection:[{"inspection_id":19250,"owner":"star","activity_id":4481,"inspection_actionstaken":"","inspection_completed":"2019-05-08T00:00:00","inspection_created":"2019-05-08T09:53:18.357","inspection_created_by":10141,"inspection_created_byadmin":0,"inspection_fullcompliance":0,"inspection_furtheractionsrequired":"","inspection_last_updated_byadmin":1,"inspection_majornonconformances":"","inspection_notes":"Personal was advised to wear PPE at all times.  Conneely were advised to stop working until Cable was shut down.  No working around live cable.  \r\nLone worker present.\r\nVacuum present to capture dust","inspection_number":"WEAR-0000018250","inspection_summary":"Police Station Bathroom - Conneely - Site Inspection ","assessor_id":1565,"department_id":10433,"location_id":4655,"riskrating_id":1002}]};
  } else if (req.params.inspectionId == 19249) {
    response = { inspection:[{"inspection_id":19249,"owner":"star","activity_id":4501,"inspection_actionstaken":"Discussed with site supervisor and work team.  Issues rectified.","inspection_completed":"2019-04-29T00:00:00","inspection_created":"2019-04-29T08:13:13.330","inspection_created_by":10138,"inspection_created_byadmin":0,"inspection_fullcompliance":0,"inspection_furtheractionsrequired":"","inspection_last_updated_byadmin":1,"inspection_majornonconformances":"","inspection_notes":"","inspection_number":"WEAR-0000018249","inspection_summary":"T2 Retail - Glenbeigh - Installation of ducting","assessor_id":1568,"department_id":10435,"location_id":4656,"riskrating_id":1003}]};
  } else {
    res.status(404);
    res.json({ error: "Inspection not found" });
  };

  res.json(response);
});

router.get("/inspections/:inspectionId/inspectionElements", (req, res, next) => {
  var response = {};
  if (req.params.inspectionId == 19252) {
    response = {"inspectionelements": [
      {"inspection_id-inspectionelement_id":"19249-1001","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19249-1002","owner":"wear","inspection_inspectionelement_noncompliance":"SPA did not detail the require","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19249-1003","owner":"wear","inspection_inspectionelement_noncompliance":"One workers not wearing safety","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19249-1004","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19249-1005","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19249-1006","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19249-1007","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19249-1008","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19249-1009","owner":"wear","inspection_inspectionelement_noncompliance":"No barricading around the work","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19249-1010","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"}
    ]};
  } else if (req.params.inspectionId == 19251) {
    response = {"inspectionelements": [
      {"inspection_id-inspectionelement_id":"19251-1001","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19251-1002","owner":"wear","inspection_inspectionelement_noncompliance":"Had not signed onto the SPA","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19251-1003","owner":"wear","inspection_inspectionelement_noncompliance":"Not wearing eye protection, ha","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19251-1004","owner":"wear","inspection_inspectionelement_noncompliance":"Not wearing hearing protection","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19251-1005","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19251-1006","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19251-1007","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19251-1008","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19251-1009","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19251-1010","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
    ]};
  } else if (req.params.inspectionId == 19250) {
    response = {"inspectionelements": [
      {"inspection_id-inspectionelement_id":"19250-1001","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19250-1002","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19250-1003","owner":"wear","inspection_inspectionelement_noncompliance":"Personal wearing no Glasses, n","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19250-1004","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19250-1005","owner":"wear","inspection_inspectionelement_noncompliance":"Live cable present.  Equipment","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19250-1006","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19250-1007","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19250-1008","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19250-1009","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19250-1010","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
    ]};
  } else if (req.params.inspectionId == 19249) {
    response = {"inspectionelements": [
      {"inspection_id-inspectionelement_id":"19249-1001","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19249-1002","owner":"wear","inspection_inspectionelement_noncompliance":"SPA did not detail the require","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19249-1003","owner":"wear","inspection_inspectionelement_noncompliance":"One workers not wearing safety","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19249-1004","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19249-1005","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
      {"inspection_id-inspectionelement_id":"19249-1006","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19249-1007","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19249-1008","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"Y"},
      {"inspection_id-inspectionelement_id":"19249-1009","owner":"wear","inspection_inspectionelement_noncompliance":"No barricading around the work","inspection_inspectionelement_rating":"N"},
      {"inspection_id-inspectionelement_id":"19249-1010","owner":"wear","inspection_inspectionelement_noncompliance":"","inspection_inspectionelement_rating":"N/A"},
    ]};
  } else {
    res.status(404);
    res.json({ error: "Inspection not found" });
  };

  res.json(response);
});

module.exports = router;
