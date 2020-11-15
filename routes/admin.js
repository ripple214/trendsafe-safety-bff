var express = require('express');
var uuid = require('uuid');
var router = express.Router();

/* GET dashboard data. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get("/clients", (req, res, next) => {
  var response = {
    clients: [
      {
        clientId: "1",
        clientName: "Anglo Coal",
        licenseCount: 10,
        licenseMax: 20
      },
      {
        clientId: "2",
        clientName: "BHPB",
        licenseCount: 20,
        licenseMax: 30
      },
      {
        clientId: "3",
        clientName: "Centennial Coal",
        licenseCount: 12,
        licenseMax: 15
      },
      {
        clientId: "4",
        clientName: "Contract Resources",
        licenseCount: 30,
        licenseMax: 50
      },
      {
        clientId: "5",
        clientName: "DAA",
        licenseCount: 33,
        licenseMax: 50
      },
      {
        clientId: "6",
        clientName: "Dana Petrolium",
        licenseCount: 3,
        licenseMax: 10
      },
      {
        clientId: "7",
        clientName: "Goldfields",
        licenseCount: 21,
        licenseMax: 30
      },
      {
        clientId: "8",
        clientName: "Iluka Resources",
        licenseCount: 45,
        licenseMax: 60
      },
      {
        clientId: "9",
        clientName: "John Holland",
        licenseCount: 12,
        licenseMax: 30
      },
      {
        clientId: "10",
        clientName: "Leighton Construction",
        licenseCount: 34,
        licenseMax: 50
      },
      {
        clientId: "11",
        clientName: "Leighton Contractors",
        licenseCount: 10,
        licenseMax: 30
      },
      {
        clientId: "12",
        clientName: "Minara Resources",
        licenseCount: 89,
        licenseMax: 100
      },
      {
        clientId: "13",
        clientName: "Railway Builders",
        licenseCount: 55,
        licenseMax: 60
      },
      {
        clientId: "14",
        clientName: "RECEO",
        licenseCount: 23,
        licenseMax: 30
      },
    ]
  };

  res.json(response);
});

module.exports = router;
