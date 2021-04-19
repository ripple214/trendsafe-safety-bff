import { BffResponse } from "../common/bff.response";

import { default as AWS } from 'aws-sdk';

AWS.config.getCredentials(function(err) {
    if (err) 
        console.log(err.stack);
});
AWS.config.update({region: 'ap-southeast-2'});

const ses = new AWS.SES({apiVersion: '2010-12-01'});
const FROM_ADDRESS = "acebedoro@yahoo.com";
const REPLY_TO_ADDRESS = "noreply@trendsafe.com";

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
            toAddresses: string[];
            ccAddresses: string[];
            name: string;
            reportName: string;
            filePath: string;
        }, 
        callback : (response: BffResponse) => void 
    ) {
        let params = {
            Destination: {
                ToAddresses: data.toAddresses,
                CcAddresses: data.ccAddresses
            },
            Source: FROM_ADDRESS,
            Template: "REPORT_SENT",
            TemplateData: "{ \"name\":\"" + data.name + "\", \"reportName\":\"" + data.reportName + "\" }", 
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

            callback(response);
        }
    ).catch(
        (err) => {
            console.log("Error", err);
            response.error = {
                "message": "Error in email sending: " + err,
                "code": "400",
            };
            callback(response);
        }
    );

}