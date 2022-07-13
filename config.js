exports.config = {


	// wikibase API config
	// this is the base url to your wikibase installation, the API module builds the API urls from this base
	wikibaseUrl : 'http://base.semlab.io/',


	// this is a item in your wikibase that can be edited for test reasons, 
	// the app sees if it can make a change to this item to tell if it has edit access
	wikibaseTestItem :'Q21191',


	// This item type property is your "Instance of" or RDF Type property P number, similar to wikidata's P31
	wikibaseInstanceOfPID: 'P1',

	// this item type property property is used to point to a reference block item used on reference statements
	wikibaseReferenceBlockPID: 'P26',

	// the item type property that denotes something is part of a specific project
	wikibasePartOfProjectPID: 'P11',

	// the item type property that denotes a block belongs to a parent document
	wikibaseParentDocumentPID: 'P24',

	// the string type property that is a local id for each block
	wikibaseLocalIdPID: 'P17',

	// the string type property that holds the first 400 chars of the block text
	wikibaseBlockTextPID: 'P19',

	// the URL type property that holds url to where the full text doc was uplaoded to (on s3 in our case)
	wikibaseBlockTextURLPID: 'P20',

	// the item type property that is used to point to entities mentioned in a specifc block
	wikibaseAssociatedEntitiesPID: 'P21',

	
	// the External identifier type property that is used to point to the wikidata item, just the Qnumber
	wikibaseWikidataIDPID: 'P8',






	// the full path to the wikibase sparql endpoint where it can get and post, not the web interface the REST endpoint
	wikibaseSPARQLEndpoint: 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql',

	// the base url that when you add "Q####.json" to the end will return the entity json
	wikibaseEntityDataBase: 'https://base.semlab.io/wiki/Special:EntityData/',


	// A "part of project" property is used to as the value for instace of to get a list of all the projects
	// for example this is definition of a project https://base.semlab.io/wiki/Item:Q19064
	// and then projects have this value for its instance of (eg https://base.semlab.io/wiki/Item:Q19104)
	wikibaseProjectQID: 'Q19064',


	// same as above, but this is the item that represents the idea of a "class" in our work that is a person or artwork, etc.
	// its used to get a list of all the possible classes a thing can be
	wikibaseClassQID: 'Q19063',

	// this is the item that blocks set its isntance of to
	wikibaseBlockClassQID: 'Q2013',





	// the AWS s3 bucket path where text files will be uploaded
	awsS3Path: 'https://semlab.s3.amazonaws.com/texts/',




	
}