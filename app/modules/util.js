
const fs  = require('fs')

const got = require('got');

function pad(pad, str, padLeft) {
  if (typeof str === 'undefined') 
    return pad;
  if (padLeft) {
    return (pad + str).slice(-pad.length);
  } else {
    return (str + pad).substring(0, pad.length);
  }
}

function replaceBetween(origin, startIndex, endIndex, insertion) {
  return origin.substring(0, startIndex) + insertion + origin.substring(endIndex);
}





exports.returnBlockFilters = function(){
	var blockFilters = []
	fs.readdirSync(`${__dirname}/../html/js/plugins/blocks/`).forEach(file => {
		console.log(file)
	  if (file.search(".js")>-1){
	  	blockFilters.push(file)
	  }
	})
	return blockFilters
}


exports.enrichNERBlocks = function(blocks){

	// const idChar = '~'


	for (let b of blocks){

		
		let replacedText = b.text
		let orginalText = b.text
		let noSpaceText = b.text
		let mCount = 0
		let mSmallCount = 0
		let eId = 0
		b.mIds = {}
		let existingRanges = []

		for (let e of b.entities){

			// list of entity types to skip
			if (['NUMBER'].indexOf(e.type) > -1){
				continue
			}


			e.id = eId

			eId++

			for (let m of e.mentions){
				// console.log(m)
				if (m.text.content.length>=3){


					let mCounter
					let mChar
					if (m.text.content.length==3){
						mCounter = mSmallCount
						mChar = '¬'
					}else{
						mCounter = mCount						
						mChar = '~'
					}



					let useMId = pad(mChar.repeat(m.text.content.length),mCounter,true);
					// console.log(useMId, "<<<")
					if (m.text.content.length == useMId.length){
						// console.log(useMId)
						// console.log(m.text.content)
						// console.log(replacedText.substring(m.text.beginOffset, m.text.beginOffset+useMId.length))
						// console.log(b.text.substring(m.text.beginOffset, m.text.beginOffset+useMId.length))
						// console.log(m.text.beginOffset, useMId.length)
						for (let r of existingRanges){

							if (m.text.beginOffset >= r[0] && m.text.beginOffset+useMId.length <= r[1] && m.text.content != r[2]){
								console.log("Looks like ", m.text.content, `(${m.text.beginOffset},${m.text.beginOffset+useMId.length})` ,'oever laps with', r[2], `(${r[0]},${r[1]})`)
								console.log(m)

								console.log(r[3])
								console.log('------')
								continue
								console.log('shouldnetberehere')
							}

						}

						if (replacedText.substring(m.text.beginOffset, m.text.beginOffset+useMId.length).includes('~')){
							console.log('~~~~~~~~~~')
							console.log(m)
							console.log(replacedText.substring(m.text.beginOffset-10, m.text.beginOffset+useMId.length+10))
							continue
						}


						b.mIds[useMId] = e
						b.mIds[useMId].localType = m.type
						if (!b.mIds[useMId].localMention){
							b.mIds[useMId].localMention = {}
						}
						b.mIds[useMId].localMention[useMId] = m
						b.mIds[useMId].localMention[useMId].replacedText = replacedText.substring(m.text.beginOffset, m.text.beginOffset+useMId.length)



						replacedText = replaceBetween(replacedText,m.text.beginOffset,m.text.beginOffset+useMId.length,useMId)
						orginalText = replaceBetween(orginalText,m.text.beginOffset,m.text.beginOffset+useMId.length,orginalText.substring(m.text.beginOffset, m.text.beginOffset+useMId.length))

						let nospace = orginalText.substring(m.text.beginOffset, m.text.beginOffset+useMId.length).replace(/\s/g,'_')
						noSpaceText = replaceBetween(noSpaceText,m.text.beginOffset,m.text.beginOffset+useMId.length,nospace)

						

						existingRanges.push([m.text.beginOffset, m.text.beginOffset+useMId.length, m.text.content,m])

						// console.log(replacedText)
						// console.log(replacedText.length)

						


						// b.mIds[useMId].localMention = m


					}else{

						console.error('NER Unique ID wrong:',useMId,m.text.content)
					}
				
					if (m.text.content.length==3){
						mSmallCount++
					}else{
						mCount++
					}

				}else{

					// we arnt gonna worry about < 3 char entities right now

				}

			}	


		}


		// console.log(b)

		let wordList = replacedText.split(/\s/)
		let noSpaceWordList = noSpaceText.split(/\s/)
		let words = []
		let order = 0
		for (let word of wordList){

			let justId = word.replace(/[^~¬0-9]*/g,'')

			console.log(word,justId)

			if (b.mIds[justId]){

				// console.log(b.mIds[justId].localMention)

				words.push({

					order: order,
					ner:true,
					eId: b.mIds[justId].id,
					nerName: b.mIds[justId].name,
					eType: b.mIds[justId].type,
					mType: b.mIds[justId].localMention[justId].type,
					text:  b.mIds[justId].localMention[justId].text.content,
					wiki: (b.mIds[justId].metadata.wikipedia_url ? b.mIds[justId].metadata.wikipedia_url : null),
					mid: (b.mIds[justId].metadata.mid ? b.mIds[justId].metadata.mid : null),
					replacedText: b.mIds[justId].localMention[justId].replacedText,
					contextualText: word.replace(justId,b.mIds[justId].localMention[justId].text.content)


				})

			}else{

				words.push({
					order: order,
					ner: false,					
					text: word,
					orginalText: noSpaceWordList[order]
				})

			}

			order++

		}

		// console.log(wordList)
		console.log(words)
		b.words = words

		for (let w of b.words){
			console.log(w)
			if (!w.ner && (w.text.includes('~') || w.text.includes('¬')) ){
				w.text = w.orginalText
				w.hasTextError = true
			}
		}

		console.log(replacedText)
		console.log("-----")
		console.log(orginalText)


		delete b.entities
		delete b.mIds

		
	}

	return blocks


}


exports.gatherBaseData = async function(qid){

	let url = 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql'

	let sparql = `
		SELECT ?item ?itemLabel ?instanceOf ?instanceOfLabel
		WHERE 
		{

		  VALUES ?item {wd:${qid}}

		  optional{
		    ?item wdt:P1 ?instanceOf
		  }
		  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
		}


	`
	const searchParams = new URLSearchParams([['query', sparql]]);

	rdict = {instanceOf: null, instanceOfLabel:null}

	try {
		const response = await got(url,{
			searchParams:searchParams,
			headers: {
				'Accept' : 'application/json',
				'User-Agent': 'USER thisismattmiller - Semlab'				  
			}

		});

		let d = JSON.parse(response.body)

		if (d.results.bindings.length>0){

			if (d.results.bindings[0].instanceOf){
				rdict.instanceOf = d.results.bindings[0].instanceOf.value.split('/entity/')[1]
				rdict.instanceOfLabel = d.results.bindings[0].instanceOfLabel.value
			}else{
				rdict.instanceOf = "Q999999999"
				rdict.instanceOfLabel = 'Uknown Instance Of'
			}



		}

		return rdict

	} catch (error) {
		console.log(error)
		console.log(error.response.body);
		return rdict
		//=> 'Internal server error ...'
	}


}



exports.returnEntity = async function(qid){

	let url = 'https://base.semlab.io/wiki/Special:EntityData/'+ qid + '.json'

	try {
		const response = await got(url,{
			headers: {
				'Accept' : 'application/json',
				'User-Agent': 'USER thisismattmiller - Semlab'				  
			}

		});

		let d = JSON.parse(response.body)
	
		if (d.entities && d.entities[qid]){

			return d.entities[qid]

		}


	} catch (error) {
		console.log(error)
		console.log(error.response.body);
		return false
		//=> 'Internal server error ...'
	}


}


exports.returnProjects = async function(){

	let url = 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql'

	let sparql = `
		SELECT ?item ?itemLabel 
		WHERE 
		{
		  ?item wdt:P1 wd:Q19064. # Must be of a cat
		  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". } # Helps get the label in your language, if not, then en language
		}
	`
	const searchParams = new URLSearchParams([['query', sparql]]);

	plist = []

	try {
		const response = await got(url,{
			searchParams:searchParams,
			headers: {
				'Accept' : 'application/json',
				'User-Agent': 'USER thisismattmiller - Semlab'				  
			}

		});

		let d = JSON.parse(response.body)
		// console.log(d.results.bindings)
		if (d.results.bindings.length>0){

			for (let p of d.results.bindings){
				console.log(p)
				let pid = p.item.value.split('/entity/')[1]
				let plabel = ''
				if (p.itemLabel.value){
					plabel = p.itemLabel.value
				}


				plist.push({label:plabel,id:pid})
			}



		}


        plist.sort((a, b) => a.label.localeCompare(b.label));


		return plist

	} catch (error) {
		console.log(error)
		console.log(error.response.body);
		return plist
		//=> 'Internal server error ...'
	}


}





exports.returnPlist = async function(){

	let url = 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql'

	let sparql = `
		SELECT ?property ?propertyLabel ?wbtype ?propertyDescription (GROUP_CONCAT(DISTINCT(?altLabel); separator = ", ") AS ?altLabel_list) WHERE {
		    ?property a wikibase:Property .
            ?property wikibase:propertyType  ?wbtype.
		    OPTIONAL {?property skos:altLabel ?altLabel . FILTER (lang(?altLabel) = "en") }
		    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" .}
		 }
		GROUP BY ?property ?propertyLabel ?propertyDescription ?wbtype
		LIMIT 5000
	`
	const searchParams = new URLSearchParams([['query', sparql]]);

	plist = []

	try {
		const response = await got(url,{
			searchParams:searchParams,
			headers: {
				'Accept' : 'application/json',
				'User-Agent': 'USER thisismattmiller - Semlab'				  
			}

		});

		let d = JSON.parse(response.body)
		// console.log(d.results.bindings)
		if (d.results.bindings.length>0){

			for (let p of d.results.bindings){

				let pid = p.property.value.split('/entity/')[1]
				let plabel = ''
				if (p.propertyLabel.value){
					plabel = p.propertyLabel.value
				}
				let pdesc = ''
				let ptype = p.wbtype.value.split('#')[1]

				if (p.propertyDescription){
					pdesc = p.propertyDescription.value
				}

				plist.push({label:plabel,id:pid,desc:pdesc,type:ptype})
			}

			
			// rdict.instanceOf = d.results.bindings[0].instanceOf.value.split('/entity/')[1]
			// rdict.instanceOfLabel = d.results.bindings[0].instanceOfLabel.value



		}


        plist.sort((a, b) => a.label.localeCompare(b.label));


		return plist

	} catch (error) {
		console.log(error)
		console.log(error.response.body);
		return plist
		//=> 'Internal server error ...'
	}


}


exports.returnClasses = async function(){

	let url = 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql'

	let sparql = `
		select ?item ?itemLabel where{
		  ?item wdt:P1 wd:Q19063
		  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
		}
	`
	const searchParams = new URLSearchParams([['query', sparql]]);

	clist = []

	try {
		const response = await got(url,{
			searchParams:searchParams,
			headers: {
				'Accept' : 'application/json',
				'User-Agent': 'USER thisismattmiller - Semlab'				  
			}

		});

		let d = JSON.parse(response.body)

		if (d.results.bindings.length>0){

			for (let p of d.results.bindings){

				let cid = p.item.value.split('/entity/')[1]
				let clabel = ''
				if (p.itemLabel.value){
					clabel = p.itemLabel.value
				}


				clist.push({label:clabel,id:cid})
			}

			
			// rdict.instanceOf = d.results.bindings[0].instanceOf.value.split('/entity/')[1]
			// rdict.instanceOfLabel = d.results.bindings[0].instanceOfLabel.value



		}


        clist.sort((a, b) => a.label.localeCompare(b.label));


		return clist

	} catch (error) {
		console.log(error)
		console.log(error.response.body);
		return clist
		//=> 'Internal server error ...'
	}


}


exports.publishEntity = async function(req, res){



	if (!req.session.wbpw || !req.session.wbus){
		
		res.status(200).json({msg:'Your Wikibase login timed out, return to the home screen and log in again'})
		return false
	}

	// res.status(200).json({'qid':'Q12345', 'instanceOf':'Q20637'})



	let generalConfig = {
	  instance: 'http://base.semlab.io/',
	  credentials: {
	    username: req.session.wbus,
	    password: req.session.wbpw 
	  }
	}

	let wbEdit = require('wikibase-edit')(generalConfig)

	try{

		const { entity } = await wbEdit.entity.create({
		  type: 'item',	
		  // All the rest is optional but one of labels, descriptions, aliases, claims, or sitelinks must be set
		  labels: {
		    // Set a label
		    en: req.body.label,
		  },
		  descriptions: {
		    // // Set a description
		    // en: 'a new description',
		    // // Remove a description
		    // fr: null
		  },
		  aliases: {
		    // // Pass aliases as an array
		    // en: [ 'foo', 'bar' ],
		    // // Or a single value
		    // de: 'buzz',
		    // // /!\ for any language specified, the values you pass will overwrite the existing values,
		    // // which means that the following empty array will remove all existing aliases in French.
		    // fr: [],
		    // // To add aliases without removing existing values, you must set 'add=true'
		    // nl: [
		    //   { value: 'bul', add: true },
		    //   { value: 'groz', add: true },
		    // ],
		    // // The same effect of clearing all aliases in a given language can be optained by passing null
		    // es: null
		  },
		  claims: {
		    // Pass values as an array
		    P1: req.body.instanceOf,
		    // // Or a single value
		    // P2002: 'bulgroz',
		    // // Or a rich value object, like a monolingual text
		    // P2093: { text: 'Author Authorson', language: 'en' },
		    // // Or even an array of mixed simple values and rich object values
		    // P1106: [ 42, { amount: 9001, unit: 'Q7727' } ],
		    // // Add statements with special snaktypes ('novalue' or 'somevalue')
		    // P626: { snaktype: 'somevalue' },
		    // // or special rank (Default: 'normal'. Possible values: 'preferred' or 'deprecated')
		    // P6089: { rank: 'preferred', value: 123 },
		    // // Add qualifiers and references to value objects
		    // P369: [
		    //   // Qualifier values can also be passed in those different forms
		    //   {
		    //     value: 'Q5111731',
		    //     qualifiers: {
		    //       P580: '1789-08-04'
		    //       P1416: [ 'Q13406268', 'Q32844021' ],
		    //       P1106: { amount: 9001, unit: 'Q7727', lowerBound: 9000, upperBound: 9315 }
		    //     }
		    //   },
		    //   // References can be passed as a single record group
		    //   { value: 'Q2622004', references: { P143: 'Q8447' } },
		    //   // or as multiple records
		    //   {
		    //     value: 'Q2622009',
		    //     references: [
		    //       { P855: 'https://example.org', P143: 'Q8447' },
		    //       { P855: 'https://example2.org', P143: 'Q8447' }
		    //     ]
		    //   }
		    // ],
		    // P1114: [
		    //   // Edit an existing claim
		    //   // /!\ Beware that while editing an existing claim,
		    //   //     anything omitted (rank, qualifiers, or references) will be omitted!!
		    //   { id: 'Q4115189$BC5F4F72-5B49-4991-AB0F-5CC8D4AAB99A', value: 123 },
		    //   // Remove an existing claim
		    //   { id: 'Q4115189$afc56f6c-4e91-c89d-e287-d5691aeb063a', remove: true }
		    // ]
		  },
		  sitelinks: {
		    // // Set a sitelink
		    // frwiki: 'eviv bulgroz',
		    // // Remove a sitelink
		    // eswikisource: null
		  },

		  // For convenience, the summary and baserevid can also be passed from this edit object
		  summary: 'Selavy'
		})


		res.status(200).json({ qid: entity.id, instanceOf: req.body.instanceOf })


	}catch (error) {
		res.status(200).json({ msg:error })

	}



	// 	wbEdit.alias.add({
	// 		id: 'Q21191',
	// 		language: 'fr',
	// 		value: 'test'
	// 	}).then(()=>{

	// 		req.session.wbpw = req.body.password
	// 		req.session.wbus = req.body.username
	// 		req.session.wbVerified = true

	// 		res.render('index',{error:false, wbVerified:req.session.wbVerified, wbDontUse:req.session.wbDontUse})

	// 	}).catch((error)=>{

	// 		res.render('index',{error:error.message, wbVerified:req.session.wbVerified, wbDontUse:req.session.wbDontUse})

	// 	})


}





exports.unpublishTriple = async function(blockId,tripleId, doc, req){


	let triple = doc.triples[blockId][tripleId]
	let subjectItem, objectItem

	try{
		subjectItem = doc.entities[triple.s.eId.toString()].wiki.semlab
		objectItem = doc.entities[triple.o.eId.toString()].wiki.semlab

	}catch (error) {
		console.log(error)
		d.triples[blockId][tripleId].status={status:'Error parsing entities'}

	}

	let generalConfig = {
	  instance: 'http://base.semlab.io/',
	  credentials: {
	    username: req.session.wbus,
	    password: req.session.wbpw 
	  }
	}

	let wbEdit = require('wikibase-edit')(generalConfig)

	if (doc.triples[blockId][tripleId].undostatus){
		doc.triples[blockId][tripleId].undostatus=''
	}

	if (triple.undo){

		for (let undo of triple.undo.reverse()){


			console.log(undo)

			if (undo.type=='DELETE_CTX'){

				try{

					let guid = undo.claim
					// qualifierHash can be either a single hash string or an array of reference hash strings
					const qualifierHash = undo.value
					let rqualifyer = await wbEdit.qualifier.remove({
					  guid,
					  hash: qualifierHash
					})			


				}catch (error) {
					console.log(error)
					if (!doc.triples[blockId][tripleId].undostatus){
						doc.triples[blockId][tripleId].undostatus = ''
					}
					doc.triples[blockId][tripleId].undostatus = doc.triples[blockId][tripleId].undostatus + 'error removing context - ' + error.toString()
				}

			}else if (undo.type=='DELETE_REF'){

				try{

					let guid = undo.claim
					// qualifierHash can be either a single hash string or an array of reference hash strings
					const refHash = undo.value
					let rref = await wbEdit.reference.remove({
					  guid,
					  hash: refHash
					})			


				}catch (error) {
					console.log(error)
					if (!doc.triples[blockId][tripleId].undostatus){
						doc.triples[blockId][tripleId].undostatus = ''
					}
					doc.triples[blockId][tripleId].undostatus = doc.triples[blockId][tripleId].undostatus + 'error removing reference - ' + error.toString()
				}

			}else if (undo.type=='DELETE_CLAIM'){

				try{

					let guid = undo.value
					let rclaim = await wbEdit.claim.remove({ guid })


				}catch (error) {
					console.log(error)
					if (!doc.triples[blockId][tripleId].undostatus){
						doc.triples[blockId][tripleId].undostatus = ''
					}
					doc.triples[blockId][tripleId].undostatus = doc.triples[blockId][tripleId].undostatus + 'error removing claim - ' + error.toString()
				}

			}

		}


		if (!doc.triples[blockId][tripleId].undostatus){
			delete doc.triples[blockId][tripleId].undo
			delete doc.triples[blockId][tripleId].undostatus
			delete doc.triples[blockId][tripleId].status			
		}else if(doc.triples[blockId][tripleId].undostatus==''){
			delete doc.triples[blockId][tripleId].undo
			delete doc.triples[blockId][tripleId].undostatus
			delete doc.triples[blockId][tripleId].status
		}


	}


	return doc
}



exports.publishTriple = async function(blockId,tripleId, doc, req){


	let triple = doc.triples[blockId][tripleId]
	let subjectItem, objectItem

	try{
		subjectItem = doc.entities[triple.s.eId.toString()].wiki.semlab
		objectItem = doc.entities[triple.o.eId.toString()].wiki.semlab

	}catch (error) {
		console.log(error)
		d.triples[blockId][tripleId].status={status:'Error parsing entities'}

	}


	let generalConfig = {
	  instance: 'http://base.semlab.io/',
	  credentials: {
	    username: req.session.wbus,
	    password: req.session.wbpw 
	  }
	}

	let wbEdit = require('wikibase-edit')(generalConfig)


	let subjectData = await this.returnEntity(subjectItem)



	let hasClaim = false

	if (subjectData.claims[triple.p.id]){

		// it might have the claim ,but does it have the claim for this value?
		for (let claim of subjectData.claims[triple.p.id]){
			if (claim.mainsnak.datavalue.value.id == objectItem){
				hasClaim = true
			}
		}


	}





	if (hasClaim){


		console.log("Already has claim:",subjectData.claims[triple.p.id])

		let hasRightRef = false
		let claimID = null


		// it already has the claim, but does it have the reference for our new claim

		for (let claim of subjectData.claims[triple.p.id]){

			

			// is the right claim for our value?
			console.log(claim.mainsnak.datavalue)

			if (claim.mainsnak.datavalue.value.id == objectItem){


				claimID = claim.id
				console.log(claim.references)


				for (let ref of claim.references){
					if (ref.snaks.P26){
						for (let val of ref.snaks.P26){
							console.log(val.datavalue)	
							if (val.datavalue && val.datavalue.value){
								if (val.datavalue.value.id == doc.blocks[blockId].qid){
									hasRightRef = true
								}
							}
						}						
					}					
				}


				// loop through the qualifiers thatare supposed to be ther and see if they are


				for (let ctx of doc.triples[blockId][tripleId].context){

					let ctxP = ctx.p.id
					let ctxO = doc.entities[ctx.o.eId.toString()].wiki.semlab

					console.log("Looking for qualfier:",ctxP,ctxO)
					let addQualifer = true

					if (claim.qualifiers){

						if (claim.qualifiers[ctxP]){			
							for (let qval of claim.qualifiers[ctxP]){
								console.log(qval)
								if (qval.datavalue.value.id == ctxO){
									addQualifer = false
								}
							}
						}
					}else{
						addQualifer = true
					}

					if (addQualifer){

						try{

							let guid = claimID
							// entity qualifier
							const rrr = await  wbEdit.qualifier.set({
								guid,
								property: ctxP,
								value: ctxO
							})

							console.log('rrr',rrr)
							if (rrr.success && rrr.success == 1){

								// it was created, store the id
								if (!doc.triples[blockId][tripleId].undo){
									doc.triples[blockId][tripleId].undo = []
								}

								let qalHash

								for (let qval of rrr.claim.qualifiers[ctxP]){
									if (qval.datavalue.value.id == ctxO){
										qalHash=qval.hash
									}
								}



								doc.triples[blockId][tripleId].undo.push({
									'type':'DELETE_CTX',
									'value': qalHash,
									'claim': claimID
								})

								doc.triples[blockId][tripleId].status = "published"

							}else{

								doc.triples[blockId][tripleId].status = 'Could not create ctx, r.success != 1'

							}

						}catch (error) {
							console.log(error)
							doc.triples[blockId][tripleId].status = 'error creating ctx - ' + error.toString()

						}


					}


				}






			}

		}
		
		console.log('hasRightRef:',hasRightRef)

		// no it doesn, make it
		if (!hasRightRef){

			console.log("making new ref on claimID:",claimID)


			let blockQId = doc.blocks[blockId].qid

			try{
				const guid = claimID
				const rr = await wbEdit.reference.set({
				  guid,
				  snaks: {
				    P26: blockQId,
				  }
				})

				if (rr.success && rr.success == 1){

					// it was created, store the id
					if (!doc.triples[blockId][tripleId].undo){
						doc.triples[blockId][tripleId].undo = []
					}

					doc.triples[blockId][tripleId].undo.push({
						'type':'DELETE_REF',
						'value': rr.reference.hash,
						'claim': claimID
					})

					doc.triples[blockId][tripleId].status = "published"

				}else{

					doc.triples[blockId][tripleId].status = 'Could not create reference, r.success != 1'

				}


			}catch (error) {
				console.log(error)
				doc.triples[blockId][tripleId].status = 'error creating reference - ' + error.toString()

			}






		}


	}else{

		console.log(triple.p.id,'does not exist')
		let claimID = null

		try{
			const r = await wbEdit.claim.create({
			  id: subjectItem,
			  property: triple.p.id,
			  value: objectItem
			})			

			if (r.success && r.success == 1){

				// it was created, store the id
				if (!doc.triples[blockId][tripleId].undo){
					doc.triples[blockId][tripleId].undo = []
				}

				doc.triples[blockId][tripleId].undo.push({
					'type':'DELETE_CLAIM',
					'value': r.claim.id,
					'claim': claimID
				})

				doc.triples[blockId][tripleId].status = "published"
				claimID = r.claim.id

			}else{

				doc.triples[blockId][tripleId].status = 'Could not create claim, r.success != 1'

			}
			

		}catch (error) {
			console.log(error)
			doc.triples[blockId][tripleId].status = 'error - ' + error.toString()

		}


		// since we jsut created the claim we need to add the block reference for sure
		if (doc.triples[blockId][tripleId].status == "published"){


			// getthe block id

			let blockQId = doc.blocks[blockId].qid

			try{
				const guid = claimID
				const rr = await wbEdit.reference.set({
				  guid,
				  snaks: {
				    P26: blockQId,
				  }
				})

				if (rr.success && rr.success == 1){

					// it was created, store the id
					if (!doc.triples[blockId][tripleId].undo){
						doc.triples[blockId][tripleId].undo = []
					}

					doc.triples[blockId][tripleId].undo.push({
						'type':'DELETE_REF',
						'value': rr.reference.hash,
						'claim': claimID
					})

					doc.triples[blockId][tripleId].status = "published"

				}else{

					doc.triples[blockId][tripleId].status = 'Could not create reference, r.success != 1'

				}


			}catch (error) {
				console.log(error)
				doc.triples[blockId][tripleId].status = 'error creating reference - ' + error.toString()

			}



			// Also create the qualifiers, its a new claim so it doesnt exist

			for (let ctx of doc.triples[blockId][tripleId].context){

				let ctxP = ctx.p.id
				let ctxO = doc.entities[ctx.o.eId.toString()].wiki.semlab

				const guid = claimID

				try{

					// entity qualifier
					const rrr = await  wbEdit.qualifier.set({
						guid,
						property: ctxP,
						value: ctxO
					})

					console.log('rrr',rrr)
					console.log('--------')
					console.log(JSON.stringify(rrr,null,2))
					if (rrr.success && rrr.success == 1){

						// it was created, store the id
						if (!doc.triples[blockId][tripleId].undo){
							doc.triples[blockId][tripleId].undo = []
						}

						let qalHash

						for (let qval of rrr.claim.qualifiers[ctxP]){
							if (qval.datavalue.value.id == ctxO){
								qalHash=qval.hash
							}
						}


						doc.triples[blockId][tripleId].undo.push({
							'type':'DELETE_CTX',
							'value': qalHash,
							'claim': claimID
						})

						doc.triples[blockId][tripleId].status = "published"

					}else{

						doc.triples[blockId][tripleId].status = 'Could not create ctx, r.success != 1'

					}

				}catch (error) {
					console.log(error)
					doc.triples[blockId][tripleId].status = 'error creating ctx - ' + error.toString()

				}





			}








		}




	}






	console.log(doc.triples[blockId][tripleId])

	console.log(subjectData)

	return doc

}


exports.publishBlock = async function(doc,blockId, req){



	let blockType = ['Q2013']
	let textUrl = `https://semlab.s3.amazonaws.com/texts/${doc.publish.qid}/${blockId}.txt`

	let blockText = doc.blocks[blockId].text


	if (doc.publish && doc.publish.replaceWith){
		for (let patterns of doc.publish.replaceWith){

			let lookFor = patterns[0]
			let replaceWith = patterns[1]

			let replace = lookFor;
			let re = new RegExp(replace,"g");

			blockText = blockText.replace(re, replaceWith);

		}
	}

	blockText=blockText.replace(/\n/g,' ')
	blockText=blockText.trim()
	if (blockText.length>=400){
		blockText = blockText.substring(0,396) + '...'
	}

	// console.log('-----BLOCK TEXT------')
	// console.log(blockText)
	// return doc

	let associatedEntites = []


 



	for (let b of doc.blocks[blockId].words){

		if ('eId' in b && b.eId !== null){

			let i = b.eId.toString()
			if (doc.entities[i]){



				if (doc.entities[i].wiki && doc.entities[i].wiki.semlab){
					// console.log(b)
					// console.log(doc.entities[i].wiki)
					// console.log('-------')
					associatedEntites.push(doc.entities[i].wiki.semlab)
				}

			}else{

				console.log('counnt find ',b)
			}


		}
	}

	console.log("associatedEntites before")
	console.log(associatedEntites)
	associatedEntites = associatedEntites.filter(function(elem, pos) {
	    return associatedEntites.indexOf(elem) == pos;
	})

	console.log("associatedEntites after")
	console.log(associatedEntites)




	let payload = {
		  type: 'item',	
		  // All the rest is optional but one of labels, descriptions, aliases, claims, or sitelinks must be set
		  labels: {
		    // Set a label
		    en: 'Block ' + blockId + ' of ' + doc.publish.docLabel,
		  },
		  descriptions: {
		    // // Set a description
		    en: 'Block ' + blockId + ' of ' + doc.publish.docLabel,
		    // // Remove a description
		    // fr: null
		  },
		  aliases: {
		    // // Pass aliases as an array
		    // en: [ 'foo', 'bar' ],
		    // // Or a single value
		    // de: 'buzz',
		    // // /!\ for any language specified, the values you pass will overwrite the existing values,
		    // // which means that the following empty array will remove all existing aliases in French.
		    // fr: [],
		    // // To add aliases without removing existing values, you must set 'add=true'
		    // nl: [
		    //   { value: 'bul', add: true },
		    //   { value: 'groz', add: true },
		    // ],
		    // // The same effect of clearing all aliases in a given language can be optained by passing null
		    // es: null
		  },
		  claims: {
		    // Pass values as an array
		    P1: blockType,
		    P11: doc.publish.project, // part of project
		    P24: [doc.publish.qid], // parent document
		    P17: blockId.toString(), // local id
		    P19: blockText, // text
		    P20: textUrl, // url
		    P21: associatedEntites,



		    // // Or a single value
		    // P2002: 'bulgroz',
		    // // Or a rich value object, like a monolingual text
		    // P2093: { text: 'Author Authorson', language: 'en' },
		    // // Or even an array of mixed simple values and rich object values
		    // P1106: [ 42, { amount: 9001, unit: 'Q7727' } ],
		    // // Add statements with special snaktypes ('novalue' or 'somevalue')
		    // P626: { snaktype: 'somevalue' },
		    // // or special rank (Default: 'normal'. Possible values: 'preferred' or 'deprecated')
		    // P6089: { rank: 'preferred', value: 123 },
		    // // Add qualifiers and references to value objects
		    // P369: [
		    //   // Qualifier values can also be passed in those different forms
		    //   {
		    //     value: 'Q5111731',
		    //     qualifiers: {
		    //       P580: '1789-08-04'
		    //       P1416: [ 'Q13406268', 'Q32844021' ],
		    //       P1106: { amount: 9001, unit: 'Q7727', lowerBound: 9000, upperBound: 9315 }
		    //     }
		    //   },
		    //   // References can be passed as a single record group
		    //   { value: 'Q2622004', references: { P143: 'Q8447' } },
		    //   // or as multiple records
		    //   {
		    //     value: 'Q2622009',
		    //     references: [
		    //       { P855: 'https://example.org', P143: 'Q8447' },
		    //       { P855: 'https://example2.org', P143: 'Q8447' }
		    //     ]
		    //   }
		    // ],
		    // P1114: [
		    //   // Edit an existing claim
		    //   // /!\ Beware that while editing an existing claim,
		    //   //     anything omitted (rank, qualifiers, or references) will be omitted!!
		    //   { id: 'Q4115189$BC5F4F72-5B49-4991-AB0F-5CC8D4AAB99A', value: 123 },
		    //   // Remove an existing claim
		    //   { id: 'Q4115189$afc56f6c-4e91-c89d-e287-d5691aeb063a', remove: true }
		    // ]
		  },
		  sitelinks: {
		    // // Set a sitelink
		    // frwiki: 'eviv bulgroz',
		    // // Remove a sitelink
		    // eswikisource: null
		  },

		  // For convenience, the summary and baserevid can also be passed from this edit object
		  summary: 'Selavy'
		}



	if (!req.session.wbpw || !req.session.wbus){
		
		doc.blocks[blockId].publishStatus = 'error - NOT LOGGED IN'

	}


	console.log(payload)


	let generalConfig = {
	  instance: 'http://base.semlab.io/',
	  credentials: {
	    username: req.session.wbus,
	    password: req.session.wbpw 
	  }
	}

	let wbEdit = require('wikibase-edit')(generalConfig)

	try{

		const { entity } = await wbEdit.entity.create(payload)


		
		doc.blocks[blockId].qid = entity.id
		doc.blocks[blockId].publishStatus = 'published'



	}catch (error) {
		console.log(error)
		doc.blocks[blockId].publishStatus = 'error - ' + error.toString()

	}







	console.log(doc.blocks[blockId])


	return doc

}



exports.deleteBlock = async function(doc,blockId, req){



	if (doc.blocks[blockId].qid){


		if (!req.session.wbpw || !req.session.wbus){
			
			doc.blocks[blockId].publishStatus = 'error - NOT LOGGED IN'

		}




		let generalConfig = {
		  instance: 'http://base.semlab.io/',
		  credentials: {
		    username: req.session.wbus,
		    password: req.session.wbpw 
		  }
		}

		let wbEdit = require('wikibase-edit')(generalConfig)

		try{


			const { entity } = await wbEdit.entity.delete({ id: doc.blocks[blockId].qid })


			if (doc.blocks[blockId].qid){
				delete doc.blocks[blockId].qid
			}
			
			if (delete doc.blocks[blockId].publishStatus){
				delete doc.blocks[blockId].publishStatus
			}




		}catch (error) {
			console.log(error)
			doc.blocks[blockId].publishStatus = 'error - ' + error.toString()

		}


	}else{

		doc.blocks[blockId].publishStatus = 'error - QID Not Set'

	}




	return doc

}






exports.condenseEntities = async function(blocks,docId){

	let globalEntityCount = 0
	let allEntities = {}

	var doc_index = JSON.parse(fs.readFileSync('/tmp_data/'+docId + '.index.json', 'utf8'));

	doc_index.entityStatus = "Starting Process"
		fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));

	for (let b of blocks){

		let blockEntities = {}


		for (let w of b.words){

			// gather upp all the occrances
			if (w.ner){
				if (!blockEntities[w.eId]){
					blockEntities[w.eId] = w
					blockEntities[w.eId].blockOccuranceCount = 1
				}else{
					// see if it is the same, idk if this matters right now
					if (w.nerName != blockEntities[w.eId].nerName){
						console.log(w.nerName, "~=", blockEntities[w.eId].nerName)
					}
					blockEntities[w.eId].blockOccuranceCount++

				}

			}

		}
		// console.log(blockEntities)

		// now diff against the main list of entities and collapse any possible dupes

		// console.log("~~~~~~~~~~",b.id,"~~~~~~~~~~~~~~~ - wikipedia filter")
		// first check if there are any wikipedia uris that match
		// let foundMatch = false
		// console.log("Before:",Object.keys(blockEntities).length)
		for (let be of Object.keys(blockEntities)){
			let bee = Object.assign({},blockEntities[be])
			for (let ae of Object.keys(allEntities)){
				let aee = allEntities[ae]
				if (aee.wiki){
					if (aee.wiki == bee.wiki){
						if (aee.blocksFoundIn.indexOf(b.id)==-1){
							aee.blocksFoundIn.push(b.id)
						}

						if (!aee.blockOccurances[b.id]){
							aee.blockOccurances[b.id] = []
						}
						aee.blockOccurances[b.id].push(bee.order)

						aee.totalFoundCount = aee.totalFoundCount + bee.blockOccuranceCount
						delete blockEntities[be]				
					}
				}
			}

		}	
		// console.log("After:",Object.keys(blockEntities).length)


		// console.log("~~~~~~~~~~",b.id,"~~~~~~~~~~~~~~~ - mid filter")
		// first check if there are any mid uris that match
		// let foundMatch = false
		// console.log("Before:",Object.keys(blockEntities).length)
		for (let be of Object.keys(blockEntities)){
			let bee = Object.assign({},blockEntities[be])
			for (let ae of Object.keys(allEntities)){
				let aee = allEntities[ae]
				if (aee.mid){
					if (aee.mid == bee.mid){
						// console.log(aee.mid,bee.mid)
						if (aee.blocksFoundIn.indexOf(b.id)==-1){
							aee.blocksFoundIn.push(b.id)
						}
						if (!aee.blockOccurances[b.id]){
							aee.blockOccurances[b.id] = []
						}
						aee.blockOccurances[b.id].push(bee.order)


						aee.totalFoundCount = aee.totalFoundCount + bee.blockOccuranceCount
						delete blockEntities[be]				
					}
				}
			}

		}	
		// console.log("After:",Object.keys(blockEntities).length)

		// console.log("~~~~~~~~~~",b.id,"~~~~~~~~~~~~~~~ - nerName filter")
		// first check if there are any mid uris that match
		// let foundMatch = false
		// console.log("Before:",Object.keys(blockEntities).length)
		for (let be of Object.keys(blockEntities)){
			let bee = Object.assign({},blockEntities[be])
			for (let ae of Object.keys(allEntities)){
				let aee = allEntities[ae]
				if (!aee.mid && !aee.wiki){
					if (aee.nerName == bee.nerName){
						// console.log(aee.nerName,bee.nerName)
						if (aee.blocksFoundIn.indexOf(b.id)==-1){
							aee.blocksFoundIn.push(b.id)
						}
						if (!aee.blockOccurances[b.id]){
							aee.blockOccurances[b.id] = []
						}
						aee.blockOccurances[b.id].push(bee.order)


						aee.totalFoundCount = aee.totalFoundCount + bee.blockOccuranceCount
						delete blockEntities[be]				
					}
				}
			}

		}	
		// console.log("After:",Object.keys(blockEntities).length)



		// anything left we need to make in the all entities
		for (let be of Object.keys(blockEntities)){	

			
			let bee = Object.assign({},blockEntities[be])

			bee.blockOccurances = {}
			bee.blocksFoundIn = []
			bee.totalFoundCount = bee.blockOccuranceCount

			if (!bee.blockOccurances[b.id]){
				bee.blockOccurances[b.id] = []
			}
			bee.blockOccurances[b.id].push(bee.order)

			allEntities[globalEntityCount++] = bee

			delete blockEntities[be]		


		}


	}

	// console.log(allEntities)
	doc_index.entityStatus = `Found ${Object.keys(allEntities).length} entities `
	fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));
		
		// do some wiki stuff

	let wiki = {}
	for (let ae of Object.keys(allEntities)){	

		if (allEntities[ae].wiki){
			if (!wiki[allEntities[ae].wiki]){
				wiki[allEntities[ae].wiki] = {wikidata: null,desc:null,image:null,semlab:null}
			}
		}

	}
	// console.log(wiki);



	let counterWiki = 0
	for (let w of Object.keys(wiki)){

		let url = w.replace('/wiki/','/w/api.php?action=query&titles=') + '&prop=pageprops|pageimages&format=json&pithumbsize=500'
		doc_index.entityStatus = `Found ${Object.keys(allEntities).length} entities | Finding Wikidata Q numbers ${counterWiki++}/${Object.keys(wiki).length} `
		fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));

		try {
			const response = await got(url);

			let d = JSON.parse(response.body)

			if (d.query && d.query.pages){
				if (Object.keys(d.query.pages).length > 0){

					let k = Object.keys(d.query.pages)[0]
					if (d.query.pages[k].pageprops && d.query.pages[k].pageprops.wikibase_item){
						wiki[w].wikidata = d.query.pages[k].pageprops.wikibase_item
					}

					if (d.query.pages[k].thumbnail && d.query.pages[k].thumbnail.source){
						wiki[w].image = d.query.pages[k].thumbnail.source
					}


				}
			}
			//=> '<!doctype html> ...'
		} catch (error) {
			console.log(error.response);
			//=> 'Internal server error ...'
		}


	}

	let counterSemWiki = 0

	for (let w of Object.keys(wiki)){

		let qid = wiki[w].wikidata

		doc_index.entityStatus = `Found ${Object.keys(allEntities).length} entities | Resolving to Semlab Base ${counterSemWiki++}/${Object.keys(wiki).length} `
		fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));


		let url = 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql'
		console.log(url)
		let sparql = `
			select DISTINCT * where {
			  { ?s wdt:P8 "${qid}" } UNION { ?s wdt:P9 <https://www.wikidata.org/wiki/${qid}> }
			}
		`
		const searchParams = new URLSearchParams([['query', sparql]]);


		try {
			const response = await got(url,{
				searchParams:searchParams,
				headers: {
					'Accept' : 'application/json',
					'User-Agent': 'USER thisismattmiller - Semlab'				  
				}

			});

			let d = JSON.parse(response.body)
			// console.log(response)
			if (d.results.bindings.length>0){

				wiki[w].semlab ='Q' + d.results.bindings[0].s.value.split('Q')[1]

			}
			//=> '<!doctype html> ...'
		} catch (error) {
			console.log(error)
			console.log(error.response.body);
			//=> 'Internal server error ...'
		}


	}


	let counterTextSearch = 0
	let counterTextSearchTotal = 0
	for (let ae of Object.keys(allEntities)){
		let aee = allEntities[ae]
		if (aee.nerName.split(' ').length>1){
			if (aee.wiki === null || (aee.wiki !== null && wiki[aee.wiki] && wiki[aee.wiki].semlab === null)){
				counterTextSearchTotal++
			}
		}
	}


	let newECount = 0
	for (let ae of Object.keys(allEntities)){	


		let aee = allEntities[ae]
		aee.eId = newECount++

		aee.semlabBaseSearch = []

		if (aee.nerName.split(' ').length>1){
			if (aee.wiki === null || (aee.wiki !== null && wiki[aee.wiki] && wiki[aee.wiki].semlab === null)){
			
				// ?action=wbsearchentities&search=Marshall%20McLuhan&format=json&language=en&uselang=en&type=item

				doc_index.entityStatus = `Found ${Object.keys(allEntities).length} entities | Searching Semlab Base by string ${counterTextSearch++}/${counterTextSearchTotal} `
				fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));



				let searchParams = new URLSearchParams([['action', 'wbsearchentities'],['search', aee.nerName],['format', 'json'],['language', 'en'],['uselang', 'en'],['type', 'item']]);

				// console.log(searchParams.toString())
				try {
					let response = await got('http://base.semlab.io/w/api.php',{
						searchParams:searchParams,
						headers: {
							'Accept' : 'application/json',
							'User-Agent': 'USER thisismattmiller - Semlab'				  
						}

					});

					let d = JSON.parse(response.body)


					for (let sr of d.search){
						aee.semlabBaseSearch.push({
							'label':sr.label,
							'qid' : sr.id
						})
					}


					//=> '<!doctype html> ...'
				} catch (error) {
					console.log(error)
					console.log(error.response.body);
					//=> 'Internal server error ...'
				}





			}
		}


	}


	// for (let w of Object.keys(wiki)){

	// 	if (!wiki[w].semlab){

	// 		// if ()
	// 		console.log()


	// 	}



	// }



	// console.log(wiki)
	for (let ae of Object.keys(allEntities)){	


		let aee = allEntities[ae]
		if (wiki[aee.wiki]){
			aee.wiki = wiki[aee.wiki]
		}

	}

	console.log("HERER VUUIIII")
	// doc_index.entityStatus = `Done`
	// fs.writeFileSync('/tmp_data/'+docId+'.index.json', JSON.stringify(doc_index,null,2));



	return allEntities

}

