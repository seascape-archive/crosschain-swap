let Web3 = require('web3');
let fs   = require('fs');

const reInit = function(remoteHttp) {
  var options = {
    timeout: 60000, // ms
  
    // Enable auto reconnection
    reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 20,
        onTimeout: false
    }
  };
  
  return new Web3(remoteHttp || process.env.ETH_REMOTE_URL, options);
}

const initWeb3 = (chainId) => {
  if (chainId === parseInt(process.env.ETH_CHAIN_ID)) {
    return reInit(process.env.ETH_REMOTE_URL);
  } else if (chainId === parseInt(process.env.BSC_CHAIN_ID)) {
    return reInit(process.env.BSC_REMOTE_URL);
  }

  throw `Unsupported chain id ${chainId}`;
}

const loadContract = function(web3, address, abi) {
  const contract = new web3.eth.Contract(abi, address);
  return contract;
};

const factoryAbi = function() {
  let path = './src/abi/factory.json';

  let rawdata = fs.readFileSync(path);
  let abi = JSON.parse(rawdata);

  return abi;
}

const pairAbi = function() {
  let path = './src/abi/pair.json';

  let rawdata = fs.readFileSync(path);
  let abi = JSON.parse(rawdata);

  return abi;
}

const targetChainAbi = function() {
  let path = './src/abi/targetChain.json';

  let rawdata = fs.readFileSync(path);
  let abi = JSON.parse(rawdata);

  return abi;
}

const factoryAddr = function(networkId) {
  if (networkId === 4) {
    return process.env.ETH_FACTORY;
  }

  throw `Factory address doesn't exist for chain ID ${networkId}`;
}

const targetChainAddr = function(networkId) {
  if (networkId === 97) {
    return process.env.BSC_TARGET_CHAIN_ADDRESS;
  }

  throw `Target Chain address doesn't exist for chain ID ${networkId}`;
}

const factoryInstance = function(web3, networkId) {
  let abi = factoryAbi();
  let addr = factoryAddr(networkId);

  return loadContract(web3, addr, abi);
}

const targetChainInstance = function(web3, networkId) {
  let abi = targetChainAbi();
  let addr = targetChainAddr(networkId);

  return loadContract(web3, addr, abi);
}

const pairInstance = function(web3, addr) {
  let abi = pairAbi();
  return loadContract(web3, addr, abi);
};

/**
 * Returns the Supported network ID and Name based on the event prefix name.
 * @requires a prefixed name of Seascape supported network on eventeum.
 * @param {string} eventName
 * @returns {networkName, networkId} or undefined 
 */
const nameAndId = function(eventName) {
  if (eventName.indexOf('Rinkeby') === 0) {
    networkId = 4;
    networkName = 'Rinkeby';
  } else if (eventName.indexOf('Mainnet') === 0) {
    networkId = 1;
    networkName = 'Mainnet';
  } else if (eventName.indexOf('BscTestnet') === 0) {
    networkId = 97;
    networkName = 'BscTestnet';
  } else if (eventName.indexOf('Bsc') === 0) {
    networkId = 56;
    networkName = 'Bsc';
  } else if (eventName.indexOf('MoonbaseAlpha') === 0) {
    networkId = 1287;
    networkName = 'MoonbaseAlpha';
  } else if (eventName.indexOf('Moonriver') === 0) {
    networkId = 1285;
    networkName = 'Moonriver';
  } else {
    // Unsupported network
    return {networkId: 0, networkName: ''};
  }

  return {networkId, networkName}
}

const oppositeNetwork = function(eventName) {
  if (eventName.indexOf('Rinkeby') === 0) {
    return nameAndId('BscTestnet');
  } else if (eventName.indexOf('BscTestnet') === 0) {
    return nameAndId('Rinkeby');
  }

  return nameAndId();
}

module.exports = {
  loadContract,
  reInit,
  initWeb3,
  nameAndId,
  oppositeNetwork,
  factoryInstance,
  pairInstance,
  targetChainInstance
}