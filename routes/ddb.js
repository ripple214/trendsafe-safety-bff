const AWS = require('aws-sdk');

AWS.config.getCredentials(function(err) {
    if (err) 
        console.log(err.stack);
});
AWS.config.update({region: 'ap-southeast-2'});

const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const docClient = new AWS.DynamoDB.DocumentClient({
    apiVersion: '2012-08-10',
    sslEnabled: false,
    paramValidation: false,
    convertResponseTypes: false
});

module.exports = {

    queryAll: async function(tableName, callback) {
        let params = { TableName: tableName };

        let data = [];
        let items;
    
        do {
            items = await docClient.scan(params).promise();
            items.Items.forEach((item) => data.push(item));
            params.ExclusiveStartKey = items.LastEvaluatedKey;
        } while (typeof items.LastEvaluatedKey != "undefined");
    
        callback(data);
    },

    query: function(params, callback) {
        docClient.query(params, function(error, data) {
        
            var response = {};
    
            if (error) {
                console.log("Error", error);
                console.log("params", params);
                response.error = {
                    "message": "Error in query",
                    "code": "400",
                };
            } else {
                response.data = data.Items;
            }

            callback(response);
        });
    }, 

    update: function(params, callback) {
        docClient.update(params, function(error, data) {
        
            var response = {};
    
            if (error) {
                console.log("Error", error);
                console.log("params", params);
                response.error = {
                    "message": "Error in update",
                    "code": "400",
                };
            } else {
                response.data = data.Attributes;
            }

            callback(response);
        });
    }, 

    insert: function(params, callback) {
        docClient.put(params, function(error, data) {
        
            var response = {};
    
            if (error) {
                console.log("Error", error);
                console.log("params", params);
                response.error = {
                    "message": "Error in insert",
                    "code": "400",
                };
            } else {
                response.data = params.Item;
            }

            callback(response);
        });
    }, 

    delete: function(params, callback) {
        docClient.delete(params, function(error, data) {
        
            var response = {};
    
            if (error) {
                console.log("Error", error);
                console.log("params", params);
                response.error = {
                    "message": "Error in delete",
                    "code": "400",
                };
            } else {
                response.data = params.Item;
            }

            callback(response);
        });
    }, 
}
