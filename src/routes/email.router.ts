import { BffResponse } from 'common/bff.response';
import { default as express } from 'express';
import fs from 'fs';
import { default as multer } from 'multer';
import { exec } from "child_process";

import { email_service } from '../services/email.service';

export const router = express.Router();
const upload = multer();

router.post("/registration", function(req, res, next) {
  let toAddress: string = req.body.toAddress;
  let username: string = req.body.username;
  let password: string = req.body.password;

  email_service.send_registration( 
    {
      toAddress: toAddress,
      username: username, 
      password: password
    }, (response: BffResponse) => {
    if (response.data) {
      var resp = response.data;
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

router.post("/password_changed", function(req, res, next) {
  let toAddress: string = req.body.toAddress;

  email_service.send_password_changed( 
    {
      toAddress: toAddress,
    }, (response: BffResponse) => {
    if (response.data) {
      var resp = response.data;
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

router.post("/send_report", upload.array(), function(req, res, next) {
  let toAddress = req.body.toAddress;
  let ccAddress = req.body.ccAddress;
  let name: string = req.body.name;
  let reportName: string = req.body.reportName;
  let base64: string = req.body.base64;
  let filePath: string = "./uploads/" + req.body.filePath + '.png';
  let outputFilePath: string = "./uploads/" + req.body.filePath + '.pdf';
  
  // Remove header
  let base64Image = base64.split(';base64,').pop();

  //console.log('writing file...', base64Image);
  fs.writeFile(filePath, base64Image, 'base64', function(error) {
    if (error) {
      console.log("Error while converting base64 to file", error);
    } else {
      exec(`magick convert ${filePath} ${outputFilePath}`, (err, stderr, stdout) => {
        if (err) {
          throw err;
        } else {
          email_service.send_report({
            toAddress: toAddress,
            ccAddress: ccAddress,
            name: name,
            reportName: reportName,
            filePath: outputFilePath,
          }, (response: BffResponse) => {
            if (response.data) {
              var resp = response.data;
              res.status(200);
              res.json(resp);

              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error(err)
                }
              });
              fs.unlink(outputFilePath, (err) => {
                if (err) {
                  console.error(err)
                }
              });
            } else {
              res.status(400);
              res.json(response);
            }
          });
        }
      });
    }
  });
});
