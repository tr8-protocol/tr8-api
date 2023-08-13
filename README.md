# tr8-api

An example API for TR8 Protocol.

Endpoints:

- `GET` `/api/latest/drops`: returns an array of "new drop" attestations, including the deployed nftAddress.
- `GET` `/api/latest/mints`: returns an array of "mint/claim" attestations, including nft contrct address and tokenId
- `GET` `/api/drop/:uid`: returns the attestation for a drop with attestation id `:uid`
- `GET` `/api/tr8/:tokenId`: returns the attestation for a mint/claim for `:tokenId`
- `GET` `/api/claim/:uid`: gaslessly claims a TR8 in the `:uid` drop for address `recipient` in URL params as long as the `secret` URL param matches a server-defined secret. Example that issuers might use to offer gasless claiming.
- `POST` `/api/drop/new`: creates a new drop for an "event". See [code](https://github.com/tr8-protocol/tr8-api/blob/main/functions/tr8/index.js#L263) for expected POST params. 

 
