const express = require('express')
const session = require('express-session');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const tika    = require('./app/modules/tika')
const util    = require('./app/modules/util')
const glob = require("glob")
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sizeOf = require('image-size');


const utilsys = require("util");
const readFile = utilsys.promisify(fs.readFile);


const language = require('@google-cloud/language');
const client = new language.LanguageServiceClient();


const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const {fromIni} = require("@aws-sdk/credential-provider-ini");

const s3 = new S3Client({ 
	credentials: fromIni({profile: 'semlab'}),
	region: 'us-east-1'
});








const app = express()

const port = 3000
const path = require('path');
const htmlFolder = path.join(__dirname, 'app/html');


app.use(express.static('app'))
app.use(fileUpload({ safeFileNames: true, preserveExtension: true }));

app.use(session({
  secret: 'My suureqqet',
  resave: true,
  saveUninitialized: true
}));


// app.use(passport.initialize());
// app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', './app/html/');
app.use(bodyParser.urlencoded({limit: '200mb', extended: true}));
// app.use( bodyParser.json() );
app.use(express.json({limit: '200mb', extended: true}));




app.post('/', function(req, res) {

	req.session.hasSession = true

	if (req.body.dontuse){
		req.session.wbDontUse = true
		res.render('index',{error:false,wbVerified:req.session.wbVerified, wbDontUse:req.session.wbDontUse})
		return true
	}


	// try loging into wb
	let generalConfig = {
	  instance: 'http://base.semlab.io/',
	  credentials: {
	    username: req.body.username,
	    password: req.body.password
	  }
	}

	let wbEdit = require('wikibase-edit')(generalConfig)

		wbEdit.alias.add({
			id: 'Q21191',
			language: 'fr',
			value: 'test'
		}).then(()=>{

			req.session.wbpw = req.body.password
			req.session.wbus = req.body.username
			req.session.wbVerified = true

			res.render('index',{error:false, wbVerified:req.session.wbVerified, wbDontUse:req.session.wbDontUse})

		}).catch((error)=>{

			res.render('index',{error:error.message, wbVerified:req.session.wbVerified, wbDontUse:req.session.wbDontUse})

		})




	// console.log(req.user)
	// console.log(req.isAuthenticated())
    // res.sendFile(path.join(htmlFolder, 'index.html'));
    // res.render('index',{isAuthenticated: req.isAuthenticated(), user:req.user})
    
});



app.get('/', function(req, res) {

	req.session.hasSession = true
	if (!req.session.wbVerified){
		req.session.wbVerified = false		
	}

	if (!req.session.wbDontUse){
		req.session.wbDontUse = false
	}

	// console.log(req.user)
	// console.log(req.isAuthenticated())
    // res.sendFile(path.join(htmlFolder, 'index.html'));
    // res.render('index',{isAuthenticated: req.isAuthenticated(), user:req.user})
    res.render('index',{error:false,wbVerified:req.session.wbVerified, wbDontUse:req.session.wbDontUse})
});



app.get('/image/:id', function(req, res) {

	let id = req.params.id
	if (id.length!=36){
		res.status(500).send('Bad ID?');
		return
	}
	if (id.split('-').length != 5){
		res.status(500).send('Bad ID?');
		return
	}


	res.sendFile('/tmp_data/' +id );
});

app.get('/entity/:qid', async function(req, res) {

	let data = await util.returnEntity(req.params.qid)
	
	res.json(data);

});



app.get('/work/:id', function(req, res) {
	// console.log(req.user)
	// console.log(req.isAuthenticated())
    // res.sendFile(path.join(htmlFolder, 'index.html'));
    // res.render('index',{isAuthenticated: req.isAuthenticated(), user:req.user})
    
    
    res.render('work',{id:req.params.id})
});





app.get('/meta/:id', function(req, res) {


	

	let id = req.params.id
	if (id.length!=36){
		res.status(500).send('Bad ID?');
		return
	}
	if (id.split('-').length != 5){
		res.status(500).send('Bad ID?');
		return
	}

	fs.exists('/tmp_data/' + id + '.json', function(exists) {

		if (exists) {
			fs.readFile('/tmp_data/' + id + '.json', function readFileCallback(err, data) {
		    	res.setHeader('Content-Type', 'application/json')
		    	res.status(200).send(data)
			})
		}else{
			res.status(404).send('Not found')
		}

	})


    
});


app.post('/upload', function(req, res) {


  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.file;
  let id = uuidv4()
  let filename = '/tmp_data/'+id

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(filename, function(err) {
    if (err)
      return res.status(500).send(err);

	// console.log('Text:');
	// detections.forEach(text => console.log(text));

    if (!req.session.hasSession){
    	id = "That didnt work"
    }


    // the file was moved, try to get the text out of it
    tika.extractText(filename, req.files.file.mimetype,(error, response, body)=>{

    	if (response.statusCode === 200 && body !== ''){

    		//create the data
    		let d = {
    			id : id,
    			orginalText: body,
    			createdBy: req.session.wbus,
    			orginalFileName: req.files.file.name,
    			orginalFileType: req.files.file.mimetype,
    			currentStage: 'cleaning',
    			timestampStart: + new Date()
    		}

    		let d_index = {
    			id : id,
    			createdBy: req.session.wbus,
    			orginalFileName: req.files.file.name,
    			currentStage: 'cleaning',
    			timestampStart: + new Date()
    		}

    		fs.writeFileSync('/tmp_data/'+id+'.meta.json', JSON.stringify(d,null,2));

    		fs.writeFileSync('/tmp_data/'+id+'.index.json', JSON.stringify(d_index,null,2));

			res.redirect(`/document/${id}/clean`);

    	}else{


    		if (body == ''){
    			error = error + ' No text could be found in this document.'
    		}

    		res.render('uploaded_error',{error:error})

    	}
    	

    	

    })



    
  });
});


app.post('/uploadtext', function(req, res) {


	let id = uuidv4()

	//create the data
	let d = {
		id : id,
		orginalText: req.body.doctext,
		createdBy: req.session.wbus,
		orginalFileName: 'pasted text',
		orginalFileType: null,
		currentStage: 'cleaning',
		timestampStart: + new Date()
	}

	let d_index = {
		id : id,
		createdBy: req.session.wbus,
		orginalFileName: 'pasted text',
		currentStage: 'cleaning',
		timestampStart: + new Date()
	}

	fs.writeFileSync('/tmp_data/'+id+'.meta.json', JSON.stringify(d,null,2));

	fs.writeFileSync('/tmp_data/'+id+'.index.json', JSON.stringify(d_index,null,2));


	res.redirect(`/document/${id}/clean`);

	
    
});



app.get('/document/:id/clean', function(req, res) {

	var d = JSON.parse(fs.readFileSync('/tmp_data/'+req.params.id + '.meta.json', 'utf8'));

    res.render('clean',{doc:d})
});



app.get('/document/:id/publishblock/:block', async function(req, res) {

	var d = JSON.parse(fs.readFileSync('/tmp_data/'+req.params.id + '.meta.json', 'utf8'));

	let block = parseInt(req.params.block)

	d = await util.publishBlock(d,block,req)


	fs.writeFileSync('/tmp_data/'+req.params.id +'.meta.json', JSON.stringify(d,null,2));


	res.json(d.blocks[block]);



});


app.get('/document/:id/publishtriple/:blockId/:tripleId', async function(req, res) {

	var d = JSON.parse(fs.readFileSync('/tmp_data/'+req.params.id + '.meta.json', 'utf8'));

	let blockId = parseInt(req.params.blockId)
	let tripleId = parseInt(req.params.tripleId)


	

	d = await util.publishTriple(blockId,tripleId,d,req)

	fs.writeFileSync('/tmp_data/'+req.params.id +'.meta.json', JSON.stringify(d,null,2));


	res.json(d.triples[blockId][tripleId]);


});

app.get('/document/:id/unpublishtriple/:blockId/:tripleId', async function(req, res) {

	var d = JSON.parse(fs.readFileSync('/tmp_data/'+req.params.id + '.meta.json', 'utf8'));

	let blockId = parseInt(req.params.blockId)
	let tripleId = parseInt(req.params.tripleId)

	d = await util.unpublishTriple(blockId,tripleId,d,req)

	fs.writeFileSync('/tmp_data/'+req.params.id +'.meta.json', JSON.stringify(d,null,2));

	res.json(d.triples[blockId][tripleId]);


});



app.get('/document/:id/deleteblock/:block', async function(req, res) {

	var d = JSON.parse(fs.readFileSync('/tmp_data/'+req.params.id + '.meta.json', 'utf8'));

	let block = parseInt(req.params.block)

	d = await util.deleteBlock(d,block,req)


	fs.writeFileSync('/tmp_data/'+req.params.id +'.meta.json', JSON.stringify(d,null,2));


	res.json(d.blocks[block]);





});





app.post('/block',  function (req, res) {
	docId = req.body.id
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));

	// res.render('clean',{doc: doc})
	doc.textClean = req.body.text
	fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));
	res.redirect(`/document/${docId}/block`);	
			
});


app.post('/checkentities', async function (req, res) {



	// res.render('clean',{doc: doc})

	let results = []

	for (let e of req.body.entities){



		let data = await util.returnEntity(e)

		if (!data){
			// results = results + '***NOT FOUND*** -- ' + e + '\n'
			results.push({l:"**NOT FOUND**",qid:e, okay:false})
		}else{

			let l = 'unknown'

			if (data.labels.en && data.labels.en.value){
				l = data.labels.en.value
			}
			
			results.push({l:l,qid:e, okay:true})

		}





	}



	res.json(results);

			
});








app.post('/document/:id/setproject',  function (req, res) {
	docId = req.body.id
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));

	doc.publish.project = req.body.project
	fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));

	return res.status(200).send("OKAY");

});

app.post('/document/:id/setreplacewith',  function (req, res) {
	docId = req.body.id
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));

	doc.publish.replaceWith = req.body.replaceWith
	fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));

	return res.status(200).send("OKAY");

});


app.post('/document/:id/fixbadqnum',  function (req, res) {
	docId = req.body.id
	from = req.body.from
	to = req.body.to
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	let msg = ''
	for (let key in doc.entities){

		if (doc.entities[key].wiki && doc.entities[key].wiki.semlab && doc.entities[key].wiki.semlab == from){
			doc.entities[key].wiki.semlab = to
			msg = msg + 'changed entity ' + key + ' to qid ' + to + ' from qid ' + from
		}

	}




	fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));
	if (msg==''){
		msg='Did not change anything, found no match.'
	}
	return res.json(doc.entities);;
	
	

});










app.get('/document/:docId/block',  function (req, res) {

	docId = req.params.docId

	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));

	var passData = {doc: doc, plugins:util.returnBlockFilters(), pluginsJson: JSON.stringify(util.returnBlockFilters())  };

	res.render('block',passData)
	

})


app.post('/ner',  function (req, res) {
	docId = req.body.id

	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));

	doc.blocksRaw = req.body.blocks
	doc.blockRegexes = req.body.blockRegexes
	doc.blockFilters = req.body.blockFilters

	doc.currentStage = 'ner'
	fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));

	res.status(200).send('OK')


})

app.get('/document/:docId/ner/start', function (req, res) {
	docId = req.params.docId	
	

	// okay, send them the working on it page
	res.render('ner_start',{docId:docId})

	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	var doc_index = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.index.json', 'utf8'));

	//set the intial update
	doc_index.nerStatus = {}
	doc_index.nerStatus.todo = doc.blocksRaw.length
	doc_index.nerStatus.done = 0
	doc_index.currentStage = "ner"
	fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));

	doc.blocks = []

	// loop through all the block 
	let counter = 0;

	(async () => {
		
		for (var b of doc.blocksRaw){
			// some clean up here
			b = b.replace(/\r\n/g,'\n')
			b = b.replace(/\r/g,'\n')
			b = b.replace(/\f/g,'')
			b = b.replace(/&amp;/g,'&')
			


			let document = {
			  document:{
			    type:"PLAIN_TEXT",
			    content:b
			  },
			  "encodingType":"UTF16"
			}

			// Detects entities in the document
			let [result] = await client.analyzeEntities(document);

			// let meta = util.enrichNERBlock(block, result.entities)


			doc.blocks.push({
				id: counter,
				text: b,
				entities: result.entities,
				language: result.language
			})
			counter++

			doc_index.nerStatus.done = counter
			fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));

		}	



	})().then(()=>{


		doc_index.nerStatus.enriching = true
		fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));


		docId.blocks = util.enrichNERBlocks(doc.blocks)

		fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));


		doc_index.nerStatus.complete = true
		fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));





	});






})


app.get('/document/:docId/entity/start', async function (req, res) {
	docId = req.params.docId	
	

	// okay, send them the working on it page
	res.render('entity_start',{docId:docId})

	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	var doc_index = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.index.json', 'utf8'));


	let entities
	(async () => {
		
		entities = await util.condenseEntities(doc.blocks,docId)


	})().then(()=>{

		doc.entities = entities
		fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));



		doc_index.entityStatus = 'Done'
		fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));
		




	});






	// fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));


	// doc_index.nerStatus.done = true
	// fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));



})



app.get('/document/:docId/instanceof/start', async function (req, res) {
	docId = req.params.docId	
	

	// okay, send them the working on it page
	res.render('instance_of_start',{docId:docId})

	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	var doc_index = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.index.json', 'utf8'));


	doc_index.instanceOfStatus = ""
	fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));


	// re number the words in the blocks with the correct eID based on the condensed entities
	// create a look up for all the entities by mid and then by label
	let midLookup = {}
	let labelLookup = {}
	let discaredLookup = {}
	for (let e of Object.keys(doc.entities)){
		e = doc.entities[e]

		if (e.isDiscarded){
			if (e.mid){
				discaredLookup[e.mid] =true
			}
			discaredLookup[e.nerName] =true
			continue
		}

		// if the key does not exist at all, they we are ignoring it
		if ( !("isDiscarded" in e) ){
			discaredLookup[e.nerName] =true
			continue			
		}


		// does it have a mid
		if (e.mid){
			// does it exist arlready?
			if (!midLookup[e.mid]){
				midLookup[e.mid] = e
			}else{

				if (midLookup[e.mid].wiki && midLookup[e.mid].wiki.wikidata && e.wiki && e.wiki.wikidata){

					if (e.wiki.wikidata.length < midLookup[e.mid].wiki.wikidata.length ){
						midLookup[e.mid] = e
					}

				}else{
					// if so take the bigger of the two options at the offical entitiy for that ID
					if (JSON.stringify(midLookup[e.mid]).length< JSON.stringify(e).length){
						midLookup[e.mid] = e
					}

				}
				
			}
		}else if (e.nerName){
			// does it exist arlready?
			if (!labelLookup[e.nerName]){
				labelLookup[e.nerName] = e
			}else{

				if (labelLookup[e.nerName].wiki && labelLookup[e.nerName].wiki.wikidata && e.wiki && e.wiki.wikidata){

					if (e.wiki.wikidata.length < labelLookup[e.nerName].wiki.wikidata.length ){
						labelLookup[e.nerName] = e					
					}

				}else{
					// if so take the bigger of the two options at the offical entitiy for that ID
					if (JSON.stringify(labelLookup[e.nerName]).length< JSON.stringify(e).length){
						midLookup[e.nerName] = e
					}
				}
			}
		}




	}	

	let idsUsed = {}
	for (let k of Object.keys(midLookup)){
		idsUsed[midLookup[k].eId] = true
	}
	for (let k of Object.keys(labelLookup)){
		idsUsed[labelLookup[k].eId] = true
	}

	// for (let e of Object.keys(doc.entities)){
	// 	e = doc.entities[e]
	// 	if (e.isDiscarded){
	// 		continue
	// 	}		

	// 	if (midLookup[e.mid]){
	// 		console.log(midLookup[e.mid].nerName, ' = ', e.nerName)
	// 	}else{
	// 		console.log(labelLookup[e.nerName].nerName, ' = ', e.nerName)


	// 	}

	// }


	// loop through all the blocks and re ID eveythang
	for (let [bIndex, b] of doc.blocks.entries()){

		for (let [wIndex, w] of b.words.entries()){

			//if (w.eId){


				if (discaredLookup[w.mid] || discaredLookup[w.nerName]){

					// remake this word block to not reference an entity
					doc.blocks[bIndex].words[wIndex] =  {
			          "order": w.order,
			          "ner": false,
			          "text": w.contextualText,
			          "orginalText": w.contextualText
			        }

			       //console.log("resetting this w", w)

					continue
				}

				if (w.mid && midLookup[w.mid]){

					// w.eId = midLookup[w.mid].eId
					doc.blocks[bIndex].words[wIndex].eId= midLookup[w.mid].eId

				}else{

					if (w.nerName && labelLookup[w.nerName]){
						// w.eId = labelLookup[w.nerName].eId
						doc.blocks[bIndex].words[wIndex].eId= labelLookup[w.nerName].eId

						// console.log(w.nerName, w.eId, ' now equals ', midLookup[w.mid].eId )
					}else{

						console.log(w.nerName, ' not found in label lookup')
						console.log("errror shit")
					}
				}
			//}


			// if (w.eId == 0){

			// 	console.log('Set to eId 0 ---------')
			// 	console.log(w)
			// 	console.log(midLookup[w.mid])
			// 	console.log(labelLookup[w.mid])

			// }

		}


	}

	// for (let b of doc.blocks){

	// 	for (let w of b.words){

	// 		if (w.eId){

	// 			console.log(doc.entities[w.eId])

	// 		}

	// 	}

	// }


	// console.log(labelLookup)






	let total = 0
	for (let e of Object.keys(doc.entities)){
		e = doc.entities[e]
		if (e.wiki && e.wiki.semlab){
			total++
		}
	}	


	let count = 0;
	(async () => {
		

		for (let e of Object.keys(doc.entities)){

			e = doc.entities[e]


			if (e.wiki && e.wiki.semlab){
				count++
				let r = await util.gatherBaseData(e.wiki.semlab)
				e.pId = count
				e.published = true


				e.wiki.semlabInstanceOf = r
				doc_index.instanceOfStatus = `Looking up ${count} of ${total}`
				fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));


			}


		}

		// 

	})().then(()=>{

		// doc.entities = entities
		fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));

		doc_index.instanceOfStatus = `Done`
		fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));







	});




})



app.get('/document/:docId/entities/data', async function (req, res) {
	docId = req.params.docId	
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	res.json(doc.entities);
})

app.get('/document/:docId/work/data', async function (req, res) {
	docId = req.params.docId	
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));

	let entities = {}
	for (let e of Object.keys(doc.entities)){
		let eee = doc.entities[e]
		if (eee.isDiscarded === false){
			entities[e] = eee
		}
	}

	doc.entities = entities

	res.json(doc);
})




app.get('/docstatus',  function (req, res) {

	if (req.session.wbus){



		glob("tmp/*.index.json", {}, function (er, files) {
		  // files is an array of filenames.
		  // If the `nonull` option is set, and nothing
		  // was found, then files is ["**/*.js"]
		  // er is an error object or null.
		  let data = []


		  for (let f of files){

		  	var doc = JSON.parse(fs.readFileSync(f, 'utf8'));

		  	if (doc.currentStage == 'entities' || doc.currentStage == 'work'){
			  	data.push({
			  		user: doc.createdBy,
			  		currentStage: doc.currentStage,
			  		timestampStart: doc.timestampStart,
			  		orginalFileName: doc.orginalFileName,
			  		id: doc.id
			  	})		  		
		  	}

		  }

			data = data.sort((a,b) => (a.timestampStart > b.timestampStart) ? 1 : ((b.timestampStart > a.timestampStart) ? -1 : 0))

			res.json(data)


		})


	}else{


		res.json({msg:"Please log in to see doc status."})
	}




})


app.get('/document/:docId/entities',  function (req, res) {
	docId = req.params.docId
	res.render('entities',{docId:docId})
})

app.get('/document/:docId/work',  function (req, res) {
	docId = req.params.docId
	console.log(req.session.wbus)
	res.render('work',{docId:docId})
})

app.get('/document/:docId/buildblocks',  function (req, res) {
	docId = req.params.docId
	console.log(req.session.wbus)
	res.render('buildblocks',{docId:docId})
})

app.get('/document/:docId/buildtriples',  function (req, res) {
	docId = req.params.docId
	console.log(req.session.wbus)
	res.render('buildtriples',{docId:docId})
})

app.post('/document/:docId/entities/data',  function (req, res) {
	
	let docId = req.params.docId
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	doc.entities = req.body.entities	
	doc.currentStage = 'doc'
	fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));
	res.status(200).send('OK')
})

app.post('/document/:docId/save',  function (req, res) {
	
	let docId = req.params.docId
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	doc.blocks = req.body.blocks	
	doc.triples = req.body.triples	
	doc.entities = req.body.entities	
	doc.publish = req.body.publish	



	fs.writeFileSync('/tmp_data/'+docId+'.meta.json', JSON.stringify(doc,null,2));
	res.status(200).send('OK')

})

app.post('/publish',  function (req, res) {
	

	
	// req.body.entities	

	util.publishEntity(req, res)


})




app.get('/projects',  function (req, res) {

	let plist = {};
	(async () => {		
		plist = await util.returnProjects()
	})().then(()=>{

		res.json(plist);
	});
	
})


app.get('/plist',  function (req, res) {

	let plist = {};
	(async () => {		
		plist = await util.returnPlist()
	})().then(()=>{

		res.json(plist);
	});
	
})



app.get('/clist',  function (req, res) {


	let clist = {};
	(async () => {		
		clist = await util.returnClasses()
	})().then(()=>{

		res.json(clist);
	});




	
})




app.get('/document/:docId/uploadtext',  async function (req, res) {

	let docId = req.params.docId
	var doc = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.meta.json', 'utf8'));
	let errors = []
	for (let block of doc.blocks){

		let blockText = block.text


		if (doc.publish && doc.publish.replaceWith){
			for (let patterns of doc.publish.replaceWith){

				let lookFor = patterns[0]
				let replaceWith = patterns[1]

				let replace = lookFor;
				let re = new RegExp(replace,"g");

				blockText = blockText.replace(re, replaceWith);

			}
		}

		try{

			fs.writeFileSync('/tmp_data/'+docId+'_block_text.txt', blockText, 'utf8');

			let input = {
			   Bucket: 'semlab',
			   Key: `texts/${doc.publish.qid}/${block.id}.txt`,
			   Body: await readFile('/tmp_data/'+docId+'_block_text.txt', 'utf8'),
			   ContentType: 'text/plain;charset=utf-8'
			}
			const command = new PutObjectCommand(input);
			const response = await s3.send(command);


		}catch (error) {
			console.log(error)
			errors.push('error - ' + error.toString())

		}


		console.log(blockText)


	}


	if (errors.length==0){
		errors.push('Sucessful')
	}
	


	// console.log(response)

	res.json(errors);
})


// async function test() {
// 	console.log("yeet")
// 	let ffff = await readFile("LICENSE")
// 	console.log(ffff)
// 	s3.send(new PutObjectCommand({

// 	   Bucket: 'semlab',
// 	   Key: 'LICENSE',
// 	   Body: ffff
// 	}));


// }


// test()



app.get('/document/:docId/status',  function (req, res) {
	docId = req.params.docId
	var d = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.index.json', 'utf8'));
	delete d.createdBy
	res.json(d);
})



app.listen(port, () => console.log(`Example app listening on port ${port}!`))
