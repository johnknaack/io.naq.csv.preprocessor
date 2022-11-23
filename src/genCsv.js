import fs from 'fs';
import fastCsv from 'fast-csv';
import { faker } from '@faker-js/faker';


export default class GenCsv {
	constructor (amount) {
        this.amount = amount || 3000;
	}

    run () {
        const csvStream = fastCsv.format({ headers: true });
		var writeStream = fs.createWriteStream('./data/sample.csv');
		csvStream.pipe(writeStream); //.on('end', () => process.exit());
        
        Array.from({ length: this.amount }).forEach(() => {
            csvStream.write({
                "Entity ID": faker.datatype.number({ min: 10000 }) ,

                "User > ID": faker.datatype.uuid(),
                "User > Name": faker.internet.userName(),
                "User > Email": faker.internet.email(),
                "User > Avatar": faker.image.avatar(),
                "User > Birthdate": faker.date.birthdate(),
                "User > Registered At": faker.date.past(),

                "Company > Name": faker.company.name(),
                "Company > Address > Full": faker.address.streetAddress({useFullAddress: true}),
                "Company > Address > Street": faker.address.streetAddress(),
                "Company > Address > City": faker.address.city(),
                "Company > Address > State": faker.address.state(),
                "Company > Address > Zipcode": faker.address.zipCode(),

                "Company > Keywords": Array.from({ length: 15 }).map(() => faker.company.bsBuzz()).join(','),
                "Company > URLs": Array.from({ length: 5 }).map(() => faker.internet.url()).join(','),   
                
                "Company > Products > Name": Array.from({ length: 5 }).map(() => faker.commerce.productName()).join(','),  
                "Company > Products > Material": Array.from({ length: 5 }).map(() => faker.commerce.productMaterial()).join(','),  
                "Company > Products > Price": Array.from({ length: 5 }).map(() => faker.commerce.price()).join(','),  
            });
        });
			
		csvStream.end();
    }
}

(new GenCsv()).run();