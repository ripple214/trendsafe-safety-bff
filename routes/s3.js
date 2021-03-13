const AWS = require('aws-sdk');

AWS.config.getCredentials(function(err) {
    if (err) 
        console.log(err.stack);
});
AWS.config.update({region: 'ap-southeast-2'});

const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const BUCKET_NAME = "trendsafe-images";

module.exports = {

    upload: function(file, key, callback) {
        var fs = require('fs');
        var fileStream = fs.createReadStream(file);
        fileStream.on('error', function(err) {
          console.log('File Error', err);
        });

        var uploadParams = {
            Bucket: BUCKET_NAME, 
            Key: key, 
            Body: fileStream
        };

        var response = {};

        // call S3 to retrieve upload file to specified bucket
        s3.upload (uploadParams, function (err, data) {
            if (err) {
                console.log("Error", err);
                response.error = {
                    "message": "Error in upload",
                    "code": "400",
                };
            } 
            
            if (data) {
                console.log("Upload Success", data.Location);
                response.data = {
                    key: data.key,
                };
            }
            callback(response);
        });        
    }, 

    download: function(key, callback) {
        var downloadParams = {
            Key: key,
            Bucket: BUCKET_NAME
        }

        var response = {};

        s3.getObject(downloadParams, function(err, data) {
            if (err) {
                console.log("Error", err);
                response.error = {
                    "message": "Error in download",
                    "code": "400",
                };
            }
            if (data) {
                console.log("Download Success", key);
                response.data = {
                    content_type: data.ContentType,
                    content_length: data.ContentLength,
                    body: data.Body
                };
            }
            callback(response);
        });
    },

    list: function(key, callback) {
        var bucketParams = {
            Prefix: key,
            Bucket: BUCKET_NAME
        }

        var response = {};

        s3.listObjects(bucketParams, function(err, data) {
            if (err) {
                console.log("Error", err);
                response.error = {
                    "message": "Error in list",
                    "code": "400",
                };
            } else {
                let contents = data.Contents;
                contents.sort(function (a, b) {
                    return a.LastModified - b.LastModified;
                });
                let keyArray = [];
                contents.forEach((content) => {
                    let key = content.Key;
                    let id = key.split("/")[3];
                    keyArray.push(id);
                });
                console.log("List Success", key);
                response.data = keyArray;
            }
            callback(response);
        });    
    },

    delete: function(key, callback) {
        var deleteParams = {
            Key: key,
            Bucket: BUCKET_NAME
        }

        var response = {};

        s3.deleteObject(deleteParams, function(err, data) {
            if (err) {
                console.log("Error", err);
                response.error = {
                    "message": "Error in list",
                    "code": "400",
                };
            } else {
                console.log("Delete Success", key);
                response.data = {};
            }
            callback(response);
        });    
    },

    move: function(fromKey, toKey, callback) {
        var response = {};

        s3.listObjects({
            Prefix: fromKey,
            Bucket: BUCKET_NAME
        }, (err, data) => {
            if(err) {
                console.log("Error", err);
                response.error = {
                    "message": "Error in move [list]",
                    "code": "400",
                };
            }

            let contents = data.Contents;
            contents.sort(function (a, b) {
                return a.LastModified - b.LastModified;
            });
        
            contents.forEach((content) => {
                let key = content.Key;
                let id = key.split("/")[3];

                s3.copyObject({
                    Bucket: BUCKET_NAME,
                    CopySource: `${BUCKET_NAME}/${key}`,
                    Key: `${toKey}/${id}`,
                }, (err1, data1) => {
                    if(err1) {
                        console.log("Error", err);
                        response.error = {
                            "message": "Error in move [copy]",
                            "code": "400",
                        };
                    }
                    
                    s3.deleteObject({
                        Bucket: BUCKET_NAME,
                        Key: key,
                    }, (err2, data2) => {
                        if(err2) {
                            console.log("Error", err);
                            response.error = {
                                "message": "Error in move [delete]",
                                "code": "400",
                            };
                        };
                    });
                })
            });

            callback(response);
        });
    },
}
