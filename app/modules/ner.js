
const async  = require('async')
const Document = require('../models/document');
const request = require('request-promise-native');

// cons


exports.processNer = function(docId){

	allResults = []
	blocksCount = 1000

	var save = (cb) =>{

		Document.findOne({ id: docId }, function (err, docSave) {


    		docSave.blocksNer = allResults
    		docSave.nerStatus = Math.ceil(allResults.length/blocksCount*100)
    		if (docSave.nerStatus == 99){
    			docSave.nerStatus = 100
    		}
    		console.log(docSave.nerStatus, allResults.length)
			docSave.save(function (err) {
			  if (err){
			  	console.log('Error saving doc:',err)
			  }	

			  if (cb){
			  	cb(docSave)

			  }		  
			});    		

		})



	}


	var timeout = setInterval(()=>{
		console.log("doing save")
		save()

	},5000)




	Document.findOne({ id: docId }, function (err, doc) {
		blocksCount = doc.blocksRaw.length
		var allBlocks = []

		doc.blocksRaw.forEach((b, idx)=>{

			if (b.join(' ').trim().length>0){
				allBlocks.push({'text':b.join(' '),'order':idx})	
			}
			
		})
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log(allBlocks)
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")
		console.log("-------------")


		async.mapLimit(allBlocks, 5, async function(block) {
			const options = {
			method: 'POST'
			,rejectUnauthorized: false
			,json: true
			,uri: 'https://nerserver.semlab.io/compiled'
			,body: { "tool":["spotlight","stanford","nltk","spacy"], "text": block.text }
			};


			try {
    			const response = await request(options);
				
	    		results = []
	    		if (response.results){
	    			Object.keys(response.results).forEach((key)=>{
	    				var r = response.results[key]
	    				// rename because mongoose reserved word 'type'
	    				r.entityType = r.type
	    				delete r.type

	    				results.push(r)

	    			})
	    		}
		    	allResults.push({text: block.text, results: results, order: block.order})
			    return response

			} catch (error) {
				console.log("Error----------")
				console.log(error);
				console.log(options)
				console.log("Error----------")
				return null
			}   

		}, (err, results) => {
		    if (err) throw err
		    clearInterval(timeout)
			save((d)=>{
				console.log("Okay done - ",allResults.length)
			}) 		
			



		})


	})
	
}