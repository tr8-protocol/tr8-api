const zeroAddress = "0x0000000000000000000000000000000000000000";

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};

const dropSchemaUid = "0xbc6da0b0e818da22c205bca49549ecd10cd57015b43230cb5a6d8082f4a0cbd7";
const mintSchemaUid = "0xb83960e8eb89cebe08ffd35e9a405ead3ae353608f6c673da898f9ed8cfc739a";

const chains = {};
chains["420"] = {
    "chainId":  ethers.utils.hexValue(420),
    "chainName": "Optimism Goerli",
    "nativeCurrency": {
        "name": "ETH",
        "symbol": "ETH",
        "decimals": 18
    },
    "rpcUrls": ["https://goerli.optimism.io"],
    "blockExplorerUrls": ["https://blockscout.com/optimism/goerli"],
}

var addr = {};
addr.optimisticGoerli = {
    "eas": "0x4200000000000000000000000000000000000021",
    "tr8": "0xC3b0c31C16D341eb09aa3698964369D2b6744108",
    "transporter": "0x54C9935e58141cc5b1B4417bb478C7D25228Bfc0",
    "evmChainId": 420,
    "testnet": true,
    "name": "Optimism Goerli",
    "rpc": "opt-goerli.g.alchemy.com/v2/jb4AhFhyR0X_ChVX5J1f0oWQ6GvJqLK0",
    "wss": "opt-goerli.g.alchemy.com/v2/jb4AhFhyR0X_ChVX5J1f0oWQ6GvJqLK0",
    "slug": "optimism-goerli",
    "folder": "testnet/",
    "native": "ETH"
};

var chain = "optimisticGoerli";

var accounts = [];
var provider, ethersSigner;
var eas, tr8, transporter;
var profileAddress, profileUser;

function setupChain() {
    var rpcURL = addr[chain].rpc;
    const prov = {"url": "https://"+rpcURL};
    provider = new ethers.providers.JsonRpcProvider(prov);
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    }
    var wssProvider = new ethers.providers.WebSocketProvider(
        "wss://" + addr[chain].wss
    );
    eas = new ethers.Contract(
        addr[chain].eas,
        easABI,
        wssProvider
    );
    tr8 = new ethers.Contract(
        addr[chain].tr8,
        tr8ABI,
        wssProvider
    );
    transporter = new ethers.Contract(
        addr[chain].transporter,
        transporterABI,
        wssProvider
    );
    web3 = AlchemyWeb3.createAlchemyWeb3("wss://" + addr[chain].wss);
}
setupChain();

async function switchChain(chainId) {
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: web3.utils.toHex(chainId) }]
        });
    } catch (switchError) {
        console.log(switchError);
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            try {
                var switchParams = chains[chainId];
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        switchParams
                    ],
                });
                switchChain(chainId);
            } catch (addError) {
                // handle "add" error
            }
        }
        // handle other "switch" errors
    }
    setupChain();
}

provider.on("network", async (newNetwork, oldNetwork) => {
    if (newNetwork.chainId != 420) {
        await switchChain(420);
    } else {
        setupChain();
    }
});

function abbrAddress(address){
    if (!address) {
        address = accounts[0];
    }
    return address.slice(0,4) + "..." + address.slice(address.length - 4);
}

async function connect(){
    if (window.ethereum) {
        //console.log("window.ethereum true");
        await provider.send("eth_requestAccounts", []);
        ethersSigner = provider.getSigner();
        accounts[0] = await ethersSigner.getAddress();
        //console.log(accounts);
        $(".connected-address").text(abbrAddress());
        $(".connected-avatar").attr("src", `https://web3-images-api.kibalabs.com/v1/accounts/${accounts[0]}/image`);
        $("#drop-button").text("Submit");
    } else {
        // The user doesn't have Metamask installed.
        console.log("window.ethereum false");
    } 
}

async function renderLatestDrops(attestations) {
    // TODO: do stuff
    $("body").removeClass("offcanvas");
    for (let i = 0; i < attestations.length; i++) {
        $("#profile-nfts").append( getNftHTML(attestations[i]) );
    }
}

async function renderLatestTr8s(attestations) {
    // TODO: do stuff
    $("body").removeClass("offcanvas");
    for (let i = 0; i < attestations.length; i++) {
        $("#profile-poaps").append( getNftHTML(attestations[i]) );
    }
}

async function getDrop(uid) {
    const res = await fetch(`https://api.tr8.me/api/drop/${uid}`, { 
        method: 'GET', 
        headers: {
            "Content-Type": "application/json"
        }
    });
    var result = await res.json();
    //console.log(user);
    await renderDrop(result);
}
async function getTr8(tokenId) {
    const res = await fetch(`https://api.tr8.me/api/tr8/${tokenId}`, { 
        method: 'GET', 
        headers: {
            "Content-Type": "application/json"
        }
    });
    var result = await res.json();
    console.log(result);
    await renderTr8(result.attestation);
}
async function getLatestDrops() {
    const res = await fetch(`https://api.tr8.me/api/latest/drops/`, { 
        method: 'GET', 
        headers: {
            "Content-Type": "application/json"
        }
    });
    var resp = await res.json();
    console.log(resp);
    await renderLatestDrops(resp);
}
async function getLatestTr8s() {
    const res = await fetch(`https://api.tr8.me/api/latest/mints/`, { 
        method: 'GET', 
        headers: {
            "Content-Type": "application/json"
        }
    });
    var resp = await res.json();
    console.log(resp);
    await renderLatestTr8s(resp);
}

async function main(){
    if ("ethereum" in window) {
        accounts = await window.ethereum.request({method: 'eth_accounts'});
        if (accounts.length > 0) {
            connect();
        }
    }
}

const path = window.location.pathname.split('/');
//console.log("path", path);

if ( path[1] == "drop" ) {
    getDrop(path[2]);
} else if ( path[1] == "tr8") {
    getTr8(path[2]);
} else {
    $( document ).ready(function() {
        getLatestDrops();
        getLatestTr8s();
    });
}

main();

function reset() {
    
}

async function creatDrop(d) {
    console.log(d);
    const data = ethers.utils.defaultAbiCoder.encode(["tuple(string nameSpace, string name, string symbol, string description, string image)", "address", "address[]", "address[]", "string", "tuple(string key, string value)[]", "string[]", "bool"], [d.metadata, d.hook, d.claimers, d.admins, d.secret, d.attributes, d.tags, d.allowTransfers]);
    const attestationRequestData = {
        "recipient": addr[chain].tr8,
        "expirationTime": 0,  // 0 means no expiration, a unix timestamp can be used as and END date for minting
        "revocable": false, // should be false for drop attestations
        "refUID": ethers.constants.HashZero, // should be byte32 zero for drop attestations
        "data": data,
        "value": 0
    };
    const attestationRequest = {
        "schema": dropSchemaUid,
        "data": attestationRequestData
    };
    const txn = await eas.connect(ethersSigner).attest(attestationRequest);
    $("#drop-button").text("Submitted!");
    const { events } = await txn.wait();
    const attestedEvent = events.find(x => x.event === "Attested");
    const attestationUid = attestedEvent.args[2];
    console.log(attestationUid);
    window.location = `/drop/${attestationUid}`;
}

function ipfsToHttp(ipfs) {
    var http = "";
    var cid = ipfs.replace("ipfs://", "");
    //http = "https://" + cid + ".ipfs.dweb.link";
    //http = "https://ipfs.io/ipfs/" + cid;
    //http = "https://nftstorage.link/ipfs/" + cid;
    http = "https://cloudflare-ipfs.com/ipfs/" + cid;
    return http;
  }

function getNftHTML(data) {
    const nft = data;
    var html = '';
    var tba = "tbd";
    var explorerUrl = `https://testnets.opensea.io/assets/optimism-goerli/${nft.nftAddresss}/`;
    var explorerImage = 'opensea.svg';
    if ( nft.data.image.startsWith('ipfs://') ) {
        nft.data.image = ipfsToHttp(nft.data.image);
    }
    html = `
        <!-- nft block -->
        <figure class="col-xl-3 col-sm-6" itemprop="associatedMedia" itemscope=""><a href="${nft.data.image}" itemprop="contentUrl" data-size="950x950"><img src="${nft.data.image}" itemprop="thumbnail" alt="Image description">
            <div class="caption">
            <h4>${nft.data.name}</h4>
            <p>${nft.data.description}</p>
            </div></a>
            <figcaption itemprop="caption description">
                <h4>${nft.data.name}</h4>
                <p>${nft.data.description}</p>
                <a title="CLAIM THIS TR8!" href="#"><img  src="https://api.tr8.me/images/tr8.png" data-uid="${nft.id}" class="nft-icons claim" /></a>
                <a href="${explorerUrl}" target="_blank"><img src="https://api.tr8.me/images/${explorerImage}" class="nft-icons" /></a>
            </figcaption>
        </figure>
    `;
    return html;
}


$( document ).ready(function() {

    //$("body").addClass("offcanvas");

    $(".connect").click(function(){
        connect();
        return false;
    });

    $("#drop-button").click(function(e){
        e.preventDefault();
        if ( !accounts[0] ) {
            connect();
            return false;
        }
        $(this).text("Submitting...");
        const metadata = {
            "nameSpace": $("#nameSpace").val(),
            "name": $("#name").val(),
            "symbol": $("#symbol").val(),
            "description": $("#description").val(),
            "image":  $("#image").val(),
        };
    
        // hook can be the zero address for no hook, or a contract address:
        const hook = "0x0000000000000000000000000000000000000000";  // no hook
        //const hook = "0x6072fB0F43Bea837125a3B37B3CF04e76ddd3f19"; // TR8HookFaucet
        //const hook = "0xFc3d67C7A95c1c051Db54608313Bd62E9Cd38A76"; // TR8HookStreamer
        // claimers is an array of addresses that can claim a TR8 from the contract
        const claimers = $("#claimers").val().split(",");
        // the admins or issuers is an array of addresses that can issue TR8s to any address
        // the attester (drop creator) does not need to be added here, as it will become an issuer
        const admins = $("#admins").val().split(",");
        const secret = "";  // unused, leave blank
        // attributes is an array of key/value pairs, can be an empty array, but both key and value must be strings
        const attributes = [
            {
                "key": "city",
                "value": $("#city").val()
            },
            {
                "key": "country",
                "value": $("#country").val()
            },
            {
                "key": "eventURL",
                "value": $("#eventURL").val()
            }
        ];
        // tags is an array of strings, can be an empty array
        const tags = ["event"];
        // allowTransfers is a boolean, true if the TR8 can be transferred, false if not
        const allowTransfers = $("#allowTransfers").val();
        const data = {
            "metadata": metadata,
            "hook": hook,
            "claimers": claimers,
            "admins": admins,
            "secret": secret,
            "attributes": attributes,
            "tags": tags,
            "allowTransfers": false
        };
        creatDrop(data);
        return false;
    });

    $('#search').keypress(function(event){
        console.log("search enter with " + $(this).val());
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
            var address = $(this).val();
            // TODO: validate input
            var valid = true;
            if (valid) {
                window.location = `/drop/${address}`;
            }
        }
        return false;
    });

    $("#add-network").click(async function(){
        await switchChain(420);
        return false;
    });

    $("#menu-search").click(function(){
        $("body").addClass("offcanvas");
        $(".header-search").click();
        return false;
    });

}); // docready





