import S from 'string';
import { marked } from 'marked';

const valueFix = {};

valueFix.arrayFromCommas = (input) => {
	if (!input || input === '') return [];
	return S(input).parseCSV();
};

// https://chubakbidpaa.com/interesting/2021/09/28/regex-for-md.html
valueFix.hasMarkdown = (input) => {
	const tests = [
		`(\\*|\\_)+(\\S+)(\\*|\\_)+`, //boldItalicText
		`\\[([^\\[]+)\\](\\(.*\\))`, // linkText
		`(\\<{1})(\\S+@\\S+)(\\>{1})` // emailText
	];
	return tests.some((t) => input.match(t));
};

valueFix.markdown = (input) => {
	if (input.match) {
		if (valueFix.hasMarkdown(input)) {
			input = marked.parseInline(input);
		}
	} else if (Array.isArray(input)) {
		input = input.map(v => valueFix.markdown(v));
	}
	return input;
};

valueFix.htmlDecode = (input) => {
	const regexHtmlEncoding = new RegExp('&[#a-zA-Z0-9_.-]{1,8};', 'g');
	if (input.match) {
		const matches = input.match(regexHtmlEncoding);
		if (matches) {
			input = S(input).decodeHTMLEntities().s;
		}
	} else if (Array.isArray(input)) {
		input = input.map(v => S(v).decodeHTMLEntities().s);
	}
	return input;
};

export default valueFix;