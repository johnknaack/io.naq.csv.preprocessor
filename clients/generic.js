export const config = {
	name: import.meta.url,
	files: {
		all: [
            (f) => fullMatch([
                'Entity ID'
            ], f.name) ? 'System' : undefined,
			(f) => startsWith([
                'User'
            ], f.name) ? 'User' : undefined,
            (f) => startsWith([
                'Company'
            ], f.name) ? 'Company' : undefined
    ]
	},

	headerTranslate: (v) => v,

	idHeaderName: 'Entity ID',
	
	groupOrder: {
	},

	parseFileType: (file) => {
		return file;
	},

	parseFileTypeName: (file) => {
		return file;
	}

};

function startsWith(values, value) {
	return values.some(v => value.toLowerCase().startsWith(v.toLowerCase()));
}

function endsWith(values, value) {
	return values.some(v => value.toLowerCase().endsWith(v.toLowerCase()));
}

function contains(values, value) {
	return values.some(v => value.toLowerCase().indexOf(v.toLowerCase()) !== -1);
}

function fullMatch(values, value) {
	return values.map(f => f.toLowerCase()).indexOf(value.toLowerCase()) !== -1;
}
