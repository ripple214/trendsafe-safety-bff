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
        ddb.query(params, function(error, data) {
        
            var response = {};
    
            if (error) {
                console.log("Error", error);
                response.error = error;
            } else {
                console.log("data", data);

                data.Items.forEach(function(element, index, array) {
                    console.log(element.id.S + " (" + element.name.S + ")");
                });
                
                response.data = data;
            }

            callback(response);
        });
    }
}
