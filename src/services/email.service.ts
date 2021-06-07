import { BffResponse } from "../common/bff.response";

import { default as AWS } from 'aws-sdk';
import { default as mimemessage } from 'mimemessage';
import { default as fs } from 'fs';

AWS.config.getCredentials(function(err) {
    if (err) 
        console.log(err.stack);
});
AWS.config.update({region: 'ap-southeast-2'});

const ses = new AWS.SES({apiVersion: '2010-12-01'});
const FROM_ADDRESS = "acebedoro@gmail.com";
const REPLY_TO_ADDRESS = "acebedoro@gmail.com"; //"noreply@trendsafe.com";

export const email_service = {

    send_registration: function(
        data: {
            toAddress: string;
            username: string;
            password: string;
        }, 
        callback : (response: BffResponse) => void 
    ) {
        let params = {
            Destination: {
                ToAddresses: [data.toAddress]
            },
            Source: FROM_ADDRESS,
            Template: "USER_CREATED",
            TemplateData: "{ \"username\":\"" + data.username + "\", \"password\":\"" + data.password + "\" }", 
            ReplyToAddresses: [REPLY_TO_ADDRESS]
        };
        
        send(params, callback);
    }, 

    send_password_changed: function(
        data: {
            toAddress: string;
        }, 
        callback : (response: BffResponse) => void 
    ) {
        let params = {
            Destination: {
                ToAddresses: [data.toAddress]
            },
            Source: FROM_ADDRESS,
            Template: "PASSWORD_CHANGED",
            TemplateData: "{}", 
            ReplyToAddresses: [REPLY_TO_ADDRESS]
        };
        
        send(params, callback);
    }, 

    send_report: function(
        data: {
            toAddress: string;
            ccAddress: string;
            name: string;
            reportName: string;
            filePath: string;
        }, 
        callback ?: (response: BffResponse) => void 
    ) {
        let toAddress = data.toAddress;
        let ccAddress = data.ccAddress;
      
        let filePath = data.filePath.replace(/\\/g, "/");
        let filePathArray = filePath.split("/");
        let fileName = filePathArray[filePathArray.length-1];

        var mailContent = mimemessage.factory({contentType: 'multipart/mixed',body: []});
        mailContent.header('From', FROM_ADDRESS);
        mailContent.header('To', toAddress);
        if(ccAddress) {
            mailContent.header('Cc', ccAddress);
        }
        mailContent.header('Subject', 'TrendSafe Report - ' + data.reportName);

        var alternateEntity = mimemessage.factory({
            contentType: 'multipart/alternate',
            body: []
        });

        var plainEntity = mimemessage.factory({
            body: `Dear ${ data.name }, \r\n\r\nPlease see attached ${ data.reportName }.\r\n\r\nThank you.`,
        });
        alternateEntity.body.push(plainEntity);

        mailContent.body.push(alternateEntity);

        var attachment = fs.readFileSync(filePath);
        var attachmentEntity = mimemessage.factory({
            contentType: 'text/plain',
            contentTransferEncoding: 'base64',
            body: attachment.toString('base64').replace(/([^\0]{76})/g, "$1\n")
        });
        attachmentEntity.header('Content-Disposition', 'attachment ;filename="' + fileName + '"');

        mailContent.body.push(attachmentEntity);

        var response:BffResponse = {};
        var sendPromise = ses.sendRawEmail({
            RawMessage: { Data: mailContent.toString() }
        }).promise();

        sendPromise
        .then(
            (data) => {
                console.log("Raw email sending success", data.MessageId);
                response.data = {
                    MessageId: data.MessageId
                }
    
                callback(response);
            }
        ).catch(
            (err) => {
                console.log("Error", err);
                response.error = {
                    "message": "Error in raw email sending: " + err,
                    "code": "400",
                };
                callback(response);
            }
        );        
    }, 

    send_retrieve_password: function(
        data: {
            toAddress: string;
            name: string;
            password: string;
        }, 
        callback ?: (response: BffResponse) => void 
    ) {
        let params = {
            Destination: {
                ToAddresses: [data.toAddress]
            },
            Source: FROM_ADDRESS,
            Template: "_RETRIEVE_PASSWORD",
            TemplateData: "{ \"name\":\"" + data.name + "\", \"password\":\"" + data.password + "\" }", 
            ReplyToAddresses: [REPLY_TO_ADDRESS]
        };
        
        send(params, callback);
    }, 

}

const send = (params, callback : (response: BffResponse) => void) => {
    var response:BffResponse = {};

    var sendPromise = ses.sendTemplatedEmail(params).promise();

    sendPromise
    .then(
        (data) => {
            console.log("Email sending success", data.MessageId);
            response.data = {
                MessageId: data.MessageId
            }

            if(callback) {
                callback(response);
            }
        }
    ).catch(
        (err) => {
            console.log("Error", err);
            response.error = {
                "message": "Error in email sending: " + err,
                "code": "400",
            };
            if(callback) {
                callback(response);
            }
        }
    );

}