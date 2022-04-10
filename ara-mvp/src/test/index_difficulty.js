/**
 * The first 5 accounts belongs to the adversary group.
 * 
 * Add the difficulty
 */
let blockchain = require('../blockchain');
let ara = require('../ara');

// global variables for testing
let randomAccounts;
let accountsAmount = 15;
let routeLength = 5;
let uids = [];
let v = [];
let r = [];
let s = [];

const ROUTE_DIFFICULTY = 1;

let nearestUid = (uids, uidHex) => {
    let uid = parseInt(uidHex);

    if (uid > parseInt(uids[accountsAmount - 1], 16) || uid < parseInt(uids[0], 16)) {
        return uids[accountsAmount - 1];
    }

    for (var i = accountsAmount - 1; i >= 0; i--) {
        if (uid > parseInt(uids[i], 16)) {
            return uids[i];
        } else {
            continue;
        }
    }
}

let accountByUid = (uid) => {
    let i = uids.indexOf(uid);
    return randomAccounts[i];
}

let isDifficult = (hex, difficulty) => {
    let str = "0x";
    for (var j = 0; j < difficulty; j++) {
        str += "00";
    }

    if (hex.indexOf(str) !== 0) {
        return false;
    }

    return true;
}

let randomMessage = (web3) => {
    return lastFourBytes(web3.utils.keccak256("0x" + (parseInt(Math.random() * 9000) + 1000).toString(16)));
}

let lastFourBytes = (str) => {
    return "0x" + str.substr(str.length - 8, 8);
}

let signMessage = async (nonce, random, signer, web3) => {
    // nonce, random
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint32"], [nonce, random]);
    let str = bytes32;
    let data = web3.utils.keccak256(str);
    sig = await signer.sign(data);
    
    sig.v = parseInt(sig.v, 16);

    return sig;
}

console.log(`Testing the Ara with 10 accounts`);
console.log(`This script is intendended to create a route`);

console.log(`\n\nThe list of accounts:`);
// create 10 random accounts
(async() => {

    let rinkebyWeb3 = blockchain.reInit(process.env.ETH_REMOTE_URL);
    randomAccounts = ara.random(rinkebyWeb3, accountsAmount);

    for (let i in randomAccounts) {
        let id = ((parseInt(i) + 1) * 16).toString(16).padStart(2, "0");
        let uid = "0x" + id + id + id + id;

        uids.push(uid);
    }

    for (let i in randomAccounts) {
        console.log(`account hash: ${uids[i]}: ${randomAccounts[i].address}`);
    }
    
    // random uids
    // assume that difficulty is checked by the user before he adds the account to the blockchain.
    // for now here we skip it.
    for (var i = 0; i < 10; i++) {
        let random = randomMessage(rinkebyWeb3);
        console.log(`\tNearest UID of random message ${random}: ${nearestUid(uids, random)}`);
    }
    
    /////////////////////////////////
    //
    // Picking the random data to select route 0
    //
    // We also not checking the difficulty of the first message. since user will do it on his side.
    /////////////////////////////////
    let random = randomMessage(rinkebyWeb3);
    let uid = nearestUid(uids, random);

    console.log(`---------------------------------------`)
    console.log(`ROUTE START: SELECT THE MESSAGE`);
    console.log(`---------------------------------------`)
    
    let account = accountByUid(uid);
    console.log(`0: Starting with UID ${uid} Address(${account.address}), message ${random}`); 

    //////////////////////////////////
    //
    // Picking the random data to select route 1
    //
    //////////////////////////////////
    console.log(`---------------------------------------`)
    console.log(`ROUTE 1/5: SIGN MESSAGE`);
    console.log(`---------------------------------------`)

    let sig;
    let nonce = 1;

    console.log(`Before discover of the second message to assign to the honest route node: ${new Date()}`)

    while (true) {
        sig = await signMessage(nonce++, random, account, rinkebyWeb3);
        if (isDifficult(sig.message, ROUTE_DIFFICULTY)) {
            // console.log(`${nonce}: ${sig.message}`)
            break;
        }
        random = lastFourBytes(sig.message);
        uid = nearestUid(uids, random);
    }
    console.log(`After discover of the second message to assign to the honest route node: ${new Date()}`)

    for (var i = 1; i < routeLength; i++) {
        console.log(`---------------------------------------`)
        console.log(`ROUTE ${i + 1}/5: SIGN MESSAGE`);
        console.log(`---------------------------------------`)
    
        account = accountByUid(uid);
        nonce = 1;
        console.log(`Before discover of the ${i+1}/5 message to assign to the first hacker: ${new Date()}`)

        while (true) {
            sig = await signMessage(nonce++, random, account, rinkebyWeb3);
            if (isDifficult(sig.message, ROUTE_DIFFICULTY)) {
                // console.log(`${nonce}: ${sig.message}`)
                break;
            }
            random = lastFourBytes(sig.message);
            uid = nearestUid(uids, random);
        }
        console.log(`After discover of the ${i+1}/5 message to assign to the first hacker: ${new Date()}`)
        console.log(`${i}: Signer is ${account.address} of uid ${uid} for message ${random} from ${sig.message}`); 
        sig = await signMessage(1, random, account, rinkebyWeb3);
        console.log(`Generated message: ${lastFourBytes(sig.message)}`);
    }
})();
