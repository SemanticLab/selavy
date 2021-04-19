


function remove_extra_line_breaks_preserve_paragraphs(text){
	
	text = text.replace(/\n{2,}/g,'<PHARAGRAPH>')
	text = text.replace(/\n/g,' ')
	text = text.replace(/<PHARAGRAPH>/g,'\n\n')
	text = text.replace(/  +/g, ' ')

	return text

}