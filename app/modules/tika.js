const request  = require('request')
const fs  = require('fs')




exports.extractText = function(file, mimetype, cb){ 

	request({
        url: 'http://tika:9998/tika',
        method: 'PUT',
        headers: {
          'cache-control': 'no-cache',
          'content-disposition': 'attachment; filename=' + file,
          'content-type' : mimetype
        },
        encoding: null,
        body: fs.createReadStream(file)
       }, (error, response, body) => {   
            cb(error, response, body.toString('utf8').replace('`',"'"));
       });


}