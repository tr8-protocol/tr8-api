var firebase = require('firebase-admin');
if (!firebase.apps.length) {
    firebase.initializeApp();
}

const express = require("express");
const api = express();

const { ethers } = require("ethers");

const tr8JSON = require(__base + 'tr8/abis/TR8.json');
const transporterJSON = require(__base + 'tr8/abis/TR8Transporter.json');
const nftJSON = require(__base + 'tr8/abis/TR8Nft.json');
const easJSON = require(__base + 'tr8/abis/EAS.json');

const fetch = require('node-fetch');

const dropSchemaUid = "0xbc6da0b0e818da22c205bca49549ecd10cd57015b43230cb5a6d8082f4a0cbd7";
const mintSchemaUid = "0xb83960e8eb89cebe08ffd35e9a405ead3ae353608f6c673da898f9ed8cfc739a";
const graphQLAPI = "https://optimism-goerli-bedrock.easscan.org/graphql";

var provider, eas, tr8, transporter;

function getContracts() {
    provider = new ethers.providers.JsonRpcProvider({"url": process.env.API_URL_OPTIGOERLI});
    eas = new ethers.Contract(process.env.EAS_ADDRESS, easJSON.abi, provider);
    tr8 = new ethers.Contract(process.env.TR8_ADDRESS, tr8JSON.abi, provider);
    transporter = new ethers.Contract(process.env.TR8TRANSPORTER_ADDRESS, transporterJSON.abi, provider);
}

function attestionsQuery(schemaUid) {
    return `
    query AttestationsForSchema {
        attestations(
          where: {
            schemaId: {
              equals: "${schemaUid}"
            }
          }
        ) {
          attester
          decodedDataJson
          expirationTime
          id
          recipient
          refUID
          schemaId
          time
          timeCreated
          txid
        }
      }
    `;
}

function attestionQuery(uid) {
    return `
    query Attestation {
        attestation(where: { id: "${uid}" }) {
            attester
            decodedDataJson
            expirationTime
            id
            recipient
            refUID
            schemaId
            time
            timeCreated
            txid
        }
      }
    `;
}

async function getAttestations(schemaUid) {
    return new Promise(async (resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json'
        };
        var res = await fetch(graphQLAPI, { 
            method: 'POST', 
            headers: headers,
            body: JSON.stringify({
                "query": attestionsQuery(schemaUid),
            })
        });
        var result = await res.json();  
        console.log(JSON.stringify(result));      
        resolve(result.data.attestations);
    });
}

async function getAttestation(uid) {
    return new Promise(async (resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json'
        };
        var res = await fetch(graphQLAPI, { 
            method: 'POST', 
            headers: headers,
            body: JSON.stringify({
                "query": attestionQuery(uid),
            })
        });
        var result = await res.json();    
        console.log(JSON.stringify(result));    
        resolve(result.data.attestation);
    });
}

function cleanUp(data) {
    var d = {};
    d.nameSpace = data[0].value.value[0].value;
    d.name = data[0].value.value[1].value;
    d.symbol = data[0].value.value[2].value;
    d.description = data[0].value.value[3].value;
    d.image = data[0].value.value[4].value;
    d.hook = data[1].value.value;
    d.claimers = data[2].value.value;
    d.issuers = data[3].value.value;
    var attributes = [];
    for (let i = 0; i < data[5].value.value.length; i++) {
        const attribute = data[5].value.value[i];
        attributes.push({
            "trait_type": attribute[0].value,
            "value": attribute[1].value
        });
    }
    d.attributes = attributes;
    d.tags = data[6].value.value;
    d.allowTransfers = data[7].value.value;
    return d;
}

function getParams(req, res, next) {
    var params;
    if (req.method === 'POST') {
      params = req.body;
    } else {
      params = req.query;
    }
    req.q = params;
    next();
}

function cors(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      // Send response to OPTIONS requests
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      return res.status(204).send('');
    } else {
      // Set CORS headers for the main request
      res.set('Access-Control-Allow-Origin', '*');
    }
    next();
}

api.use(cors);
api.use(getParams);

api.get("/api", async function (req, res) {
    return res.json({"what": "tr8 events api", "why": "tba"});
});

api.get("/api/latest/drops", async function (req, res) {
    getContracts();
    const signer = new ethers.Wallet(process.env.TR8_PRIVATE, provider);
    const attestations = await getAttestations(dropSchemaUid);
    for (let i = 0; i < attestations.length; i++) {
        const attestation = attestations[i];
        const data = JSON.parse(attestation.decodedDataJson);
        attestations[i].data = cleanUp(data);
        delete attestations[i].decodedDataJson;
        const nft = await tr8.nftForDrop(attestation.id);
        attestations[i].nftAddresss = nft;
    }
    return res.json(attestations);
});

api.get("/api/latest/mints", async function (req, res) {
    getContracts();
    const attestations = await getAttestations(mintSchemaUid);
    for (let i = 0; i < attestations.length; i++) {
        const attestation = attestations[i];
        //const data = JSON.parse(attestation.decodedDataJson);
        //attestations[i].parsedData = data;
        delete attestations[i].decodedDataJson;
        const nft = await tr8.nftForDrop(attestation.refUID);
        attestations[i].nftAddresss = nft;
        attestations[i].tokenId = ethers.BigNumber.from(attestation.id).toString();
    }
    return res.json(attestations);
});

api.get("/api/drop/:uid", async function (req, res) {
    getContracts();
    const attestation = await getAttestation(req.params.uid);
    const data = JSON.parse(attestation.decodedDataJson);
    attestation.data = cleanUp(data);
    delete attestation.decodedDataJson;
    const nft = await tr8.nftForDrop(attestation.id);
    attestation.nftAddresss = nft;
    return res.json(attestation);
});

api.get("/api/tr8/:tokenId", async function (req, res) {
    getContracts();
    const uid = ethers.BigNumber.from(req.params.tokenId).toHexString();
    const mintAttestation = await getAttestation(uid);
    const attestation = await getAttestation(mintAttestation.refUID);
    const data = JSON.parse(attestation.decodedDataJson);
    attestation.data = cleanUp(data);
    delete attestation.decodedDataJson;
    const nft = await tr8.nftForDrop(attestation.id);
    attestation.nftAddresss = nft;
    attestation.tokenId = req.params.tokenId;
    return res.json(attestation);
});

// TODO: change to POST
api.get("/api/claim/:uid", async function (req, res) {
    getContracts();
    const nft = await tr8.nftForDrop(req.params.uid);
    const attestation = await getAttestation(req.params.uid);
    attestation.nftAddresss = nft;
    const recipient = req.q.recipient;
    const secret = req.q.secret;
    if (secret != process.env.SECRET) {
        return res.status(401).json({"error": "unauthorized"});
    }
    const signer = new ethers.Wallet(process.env.TR8_PRIVATE, provider);
    const mint = true;
    const extras = [
        {"key": "foo", "value": "bar"}
    ];
    const data = ethers.utils.defaultAbiCoder.encode(["bool", "tuple(string key, string value)[]"], [mint, extras]);
    const attestationRequestData = {
        "recipient": recipient, // gets the TR8
        "expirationTime": 0,
        "revocable": true,
        "refUID": req.params.uid, // IMPORTANT: the attestation UID of the drop
        "data": data,
        "value": 0
    };
    const attestationRequest = {
        "schema": mintSchemaUid,
        "data": attestationRequestData
    };
    const txn = await eas.connect(signer).attest(attestationRequest);
    const { events } = await txn.wait();
    const attestedEvent = events.find(x => x.event === "Attested");
    const mintAttestationUid = attestedEvent.args[2];
    attestation.tokenId = ethers.BigNumber.from(mintAttestationUid).toString();
    console.log(mintAttestationUid);
    return res.json(attestation);
});

module.exports.api = api;
