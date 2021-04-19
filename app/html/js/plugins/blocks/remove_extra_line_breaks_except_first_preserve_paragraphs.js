


function remove_extra_line_breaks_except_first_preserve_paragraphs(text){

	var text = text.split('\n')

	var first = text[0]
	// remove first line
	text.shift()	
	var rest = text.join('\n')


	rest = rest.replace(/\n{2,}/g,'<PHARAGRAPH>')
	rest = rest.replace(/\n/g,' ')
	rest = rest.replace(/<PHARAGRAPH>/g,'\n\n')



	
	text = first + '\n' + rest





	return text

}