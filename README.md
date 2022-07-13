Selavy is a dockerized node application that interacts with a Wikibase instance to ingest documents and populate your Wikibase with items and statements created. It uses Apache Tika to extract text from documents and requires a Google Natural Language API key to function.


----

#### Getting Started

1. Make sure you have docker and docker compose installed on your system.
2. Git clone this repo to your system.
3. Edit the [config file](https://github.com/SemanticLab/selavy/blob/main/config.js) to map to the required properties and items created in your Wikibase
4. Active a google service account with [Google natural language APIs](https://cloud.google.com/natural-language) enabled and place the `GOOGLE_APPLICATION_CREDENTIALS.json` in the main directory (same location as the config file)
5. Startup the App using `docker-compose up`
6. Login to the tool using your Wikibase user credentails.

A video tutorial is being created walking through all of these steps and will be posted here when ready.
