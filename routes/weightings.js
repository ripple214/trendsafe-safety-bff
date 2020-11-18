var express = require('express');
var uuid = require('uuid');
var router = express.Router();

/* GET dashboard data. */
router.get('/', function(req, res, next) {
  var response = {
    weightings: [
      {
        weightingId: 1,
        weightingName: "Task Assessment - PPI/LSI",
        weightingValue: 6
      },
      {
        weightingId: 2,
        weightingName: "Plant/ Area Inspection - PPI/LSI",
        weightingValue: 6
      },
      {
        weightingId: 3,
        weightingName: "Hazard Report - PPI/LSI",
        weightingValue: 2
      },
      {
        weightingId: 4,
        weightingName: "Task Planning - PPI/LSI",
        weightingValue: 2
      },
      {
        weightingId: 5,
        weightingName: "Near Miss - PPI/LSI",
        weightingValue: 4
      }
    ]
  };

  res.json(response);
});

module.exports = router;
