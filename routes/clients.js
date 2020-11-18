var express = require('express');
var uuid = require('uuid');
var router = express.Router();

// temp values
var clients = [
  {
    clientId: "1",
    clientName: "Anglo Coal",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 10,
    licenseMax: 20
  },
  {
    clientId: "2",
    clientName: "BHPB",
    clientLastName: "Tony",
    clientFirstName: "Stark",
    clientEmail: "tstark@got.com",
    clientPassword: "Password1234",
    clientPasswordRepeat: "Password1234",
    licenseCount: 20,
    licenseMax: 30
  },
  {
    clientId: "3",
    clientName: "Centennial Coal",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 12,
    licenseMax: 15
  },
  {
    clientId: "4",
    clientName: "Contract Resources",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 30,
    licenseMax: 50
  },
  {
    clientId: "5",
    clientName: "DAA",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 33,
    licenseMax: 50
  },
  {
    clientId: "6",
    clientName: "Dana Petrolium",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 3,
    licenseMax: 10
  },
  {
    clientId: "7",
    clientName: "Goldfields",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 21,
    licenseMax: 30
  },
  {
    clientId: "8",
    clientName: "Iluka Resources",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 45,
    licenseMax: 60
  },
  {
    clientId: "9",
    clientName: "John Holland",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 12,
    licenseMax: 30
  },
  {
    clientId: "10",
    clientName: "Leighton Construction",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 34,
    licenseMax: 50
  },
  {
    clientId: "11",
    clientName: "Leighton Contractors",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 10,
    licenseMax: 30
  },
  {
    clientId: "12",
    clientName: "Minara Resources",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 89,
    licenseMax: 100
  },
  {
    clientId: "13",
    clientName: "Railway Builders",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 55,
    licenseMax: 60
  },
  {
    clientId: "14",
    clientName: "RECEO",
    clientLastName: "",
    clientFirstName: "",
    clientEmail: "",
    clientPassword: "",
    clientPasswordRepeat: "",
    licenseCount: 23,
    licenseMax: 30
  }
];

/* GET dashboard data. */
router.get('/', function(req, res, next) {
  var response = {
    clients: clients
  };

  res.json(response);
});

router.get("/:clientId", function(req, res, next) {
  var response = {
    client: clients.filter(function(x){return x.clientId==req.params.clientId})[0]
  };

  res.json(response);
});

module.exports = router;
