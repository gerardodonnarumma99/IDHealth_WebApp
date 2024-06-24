import { addDatetime, addLiteral, addStringNoLocale, addTerm, addUrl, createSolidDataset, createThing, getDecimal, getLiteral, getPropertyAll, getSolidDataset, getStringNoLocale, getThing, getThingAll, getUrl, overwriteFile, saveSolidDatasetAt, setStringNoLocale, setStringWithLocale, setThing } from "@inrupt/solid-client";
import { RDF, FOAF } from "@inrupt/vocab-common-rdf";
import * as rdf from 'rdflib';
import { QueryEngine } from '@comunica/query-sparql-solid';

// Funzione per convertire l'oggetto Patient in Turtle RDF
const convertPatientObjectToTurtle = (patientObject) => {
    const turtleString = `
    @prefix fhir: <http://hl7.org/fhir/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    fhir:Patient(
    fhir:id "WebIDPOD",
    fhir:name fhir:HumanName(
        fhir:use "official",
        fhir:prefix "Mrs.",
        fhir:family "Lisa",
        fhir:given ("Lisa", "Rossi")
    ),
    fhir:telecom (
        fhir:telecom(
        fhir:system fhir:ContactSystem-phone,
        fhir:value "800-258-4431",
        fhir:use "home"
        ),
        fhir:telecom(
        fhir:system fhir:ContactSystem-email,
        fhir:value "lisa.coleman@example.com"
        )
    ),
    fhir:gender "female",
    fhir:birthDate xsd:date"1948-04-14",
    fhir:address fhir:Address(
        fhir:use "home",
        fhir:line ("1 Main St", "Apt 16"),
        fhir:city "Bixby",
        fhir:state "OK",
        fhir:postalCode "74008",
        fhir:country "USA"
    )
    )
    `;

    return turtleString;
}

async function getOrCreatePatient(containerUri, fetch) {
    const indexUrl = `${containerUri}Patient.ttl`;
    let dataset;
    try {
        ('inizio')
        dataset = await getSolidDataset(indexUrl, { fetch });
        ('dataset', dataset);

        const sqlWebId = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?resourceIdValue
WHERE {
  <http://hl7.org/fhir/Patient/WebIDPOD> fhir:Resource.id [
    fhir:v ?resourceIdValue
  ].
}
`
        const myEngine = new QueryEngine();

        const bindingsStream = await myEngine.queryBindings(`
        SELECT *
  WHERE {
    <http://hl7.org/fhir/Patient/WebIDPOD> ?property ?value.
  }
`, {
  // Set your profile as query source
  sources: [indexUrl],
  // Pass the authenticated fetch function
  fetch: fetch,
});

    const bindings = await bindingsStream.toArray();
    bindings.forEach(binding => {
        ('binding', binding)
      });

        //return dataset;
    } catch (error) {
        ('error', error)
      if (error.statusCode === 404) {
        const todoList = await saveSolidDatasetAt(
          indexUrl,
          createSolidDataset(),
          {
            fetch
          }
        );
        return todoList;
      }
    }

    // Your Turtle data here
    const turtleData = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX fhir: <http://hl7.org/fhir/>
    PREFIX shex: <http://www.w3.org/ns/shex#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX fhirshex: <http://hl7.org/fhir/shape/>
    PREFIX fhirvs: <http://hl7.org/fhir/ValueSet/>

    <http://hl7.org/fhir/Patient/WebIDPOD> a fhir:Patient;
    fhir:nodeRole fhir:treeRoot;
    fhir:Resource.id [
        fhir:v "WebIDPOD"
    ];
    fhir:Patient.name [
        fhir:HumanName.use [
        fhir:v "official"
        ];
        fhir:HumanName.family [
        fhir:v "Lisa";
        fhir:index 0
        ];
        fhir:HumanName.given [
        fhir:v "Lisa";
        fhir:index 0
        ], [
        fhir:v "Rossi";
        fhir:index 1
        ];
        fhir:HumanName.prefix [
        fhir:v "Mrs.";
        fhir:index 0
        ];
        fhir:index 0
    ];
    fhir:Patient.telecom [
        fhir:ContactPoint.system [
        fhir:v "phone"
        ];
        fhir:ContactPoint.value [
        fhir:v "800-258-4431"
        ];
        fhir:ContactPoint.use [
        fhir:v "home"
        ];
        fhir:index 0
    ], [
        fhir:ContactPoint.system [
        fhir:v "email"
        ];
        fhir:ContactPoint.value [
        fhir:v "lisa.coleman@example.com"
        ];
        fhir:index 1
    ];
    fhir:Patient.gender [
        fhir:v "female"
    ];
    fhir:Patient.birthDate [
        fhir:v "1948-04-14"^^xsd:date
    ];
    fhir:Patient.address [
        fhir:Address.use [
        fhir:v "home"
        ];
        fhir:Address.line [
        fhir:v "1 Main St";
        fhir:index 0
        ], [
        fhir:v "Apt 16";
        fhir:index 1
        ];
        fhir:Address.city [
        fhir:v "Bixby"
        ];
        fhir:Address.state [
        fhir:v "OK"
        ];
        fhir:Address.postalCode [
        fhir:v "74008"
        ];
        fhir:Address.country [
        fhir:v "USA"
        ];
        fhir:index 0
    ].

    # Triples not in FHIR Resource:
    <http://hl7.org/fhir/Patient/WebIDPOD.ttl> a owl:Ontology;
    owl:imports fhir:fhir.ttl;
    owl:versionIRI <http://hl7.org/fhir/Patient/WebIDPOD.ttl>.
  `;


    // Overwrite the existing Turtle file with the new Turtle data
    const turtleBlob = new Blob([turtleData], { type: 'text/turtle' });
    const response = await overwriteFile(indexUrl, turtleBlob, { fetch: fetch });

    ('aggiornamento', response)
  }

export {
    getOrCreatePatient
}