/**
 * Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This file is licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
*/
var AWS = require("aws-sdk");
var fs = require('fs');

AWS.config.getCredentials(function(err) {
    if (err) 
        console.log(err.stack);
});
AWS.config.update({region: 'ap-southeast-2'});

var docClient = new AWS.DynamoDB();

console.log("Importing records into DynamoDB. Please wait.");

var recordsJson = JSON.parse(fs.readFileSync('uploads.json', 'utf8'));

var tableName = null;
for(var key in recordsJson) {
    if(recordsJson.hasOwnProperty(key)) {
        tableName = key;
        break;
    }
}

var allRecords = recordsJson[tableName];
console.log("Total records for ", tableName, " : ", allRecords.length);

var itemsArray = [];
var maxItemsSize = 25;
var batchWriteCounter = 0;
var batchWriteSuccessCounter = 0;
var batchWriteFailedCounter = 0;
allRecords.every(function(putRequestItem, index) {
	
	////Add parent column
	//let item = putRequestItem.PutRequest.Item;
	//let id = item.id.S;
	//let parents = item.parents.S.split('$');
	//let parent = '';
	//if(parents.length == 4) {
	//	parent = parents[parents.length-2];
	//} else {
	//	parent = parents[parents.length-1]
	//}
	//if(parent == '') {
	//	parent = '0';
	//}
	//item.parent = {'S': parent};

	/* this is the last uncommented block for hierarchies
	let item = putRequestItem.PutRequest.Item;
	let partition_key = item.partition_key.S;
	let parents = item.parents.S.split('$');
	let id = item.id.S;

	let divisionId = "0";
	let projectId = "0";
	let siteId = "0";
	let subsiteId = "0";
	let departmentId = "0";

	if(partition_key.indexOf('$DIVISION') > -1) {
		divisionId = id;
	} else if(partition_key.indexOf('$PROJECT') > -1) {
		divisionId = parents[0];
		projectId = id;
	} else if(partition_key.indexOf('$SITE') > -1) {
		divisionId = parents[0];
		projectId = parents[1];
		siteId = id;
	} else if(partition_key.indexOf('$SUBSITE') > -1) {
		divisionId = parents[0];
		projectId = parents[1];
		siteId = parents[2];
		subsiteId = id;
	} else if(partition_key.indexOf('$DEPARTMENT') > -1) {
		divisionId = parents[0];
		projectId = parents[1];
		siteId = parents[2];
		subsiteId = parents[3];
		departmentId = id;
	}

	item.division_id = {'S': divisionId};
	item.project_id = {'S': projectId};
	item.site_id = {'S': siteId};
	item.subsite_id = {'S': subsiteId};
	item.department_id = {'S': departmentId};
	*/

	//console.log("parents", parents);
	//console.log("item", item);

	itemsArray.push(putRequestItem);
	if(itemsArray.length == maxItemsSize || index == allRecords.length-1) {
		if(itemsArray.length != maxItemsSize) {
			console.log("");
		}
		var params = {
			RequestItems: {}
		};
		params.RequestItems[tableName] = itemsArray;
		
		batchWriteCounter++;
		docClient.batchWriteItem(params, function(err, data) {
			if (err) {
				batchWriteFailedCounter++;
				console.error("Unable to add record", "\nParams:", JSON.stringify(params, null, 2), "\nError JSON:", JSON.stringify(err, null, 2));
			} else {
				//console.log("PutItem succeeded:", JSON.stringify(params, null, 2));
				batchWriteSuccessCounter++;
				process.stdout.write("batchWrite succeeded " + batchWriteSuccessCounter + '/' + batchWriteCounter + ', ' + batchWriteFailedCounter + ' failed.\r');
			}
			
			if(batchWriteSuccessCounter + batchWriteFailedCounter == batchWriteCounter) {
				console.log("\n\nDone!");
			}
		});
		itemsArray = [];
	}
	return true;
});
