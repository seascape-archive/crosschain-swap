"use strict";

//
// Wallet connection interface
//

 // Unpkg imports
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;


// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;

// Address of the selected account
let selectedAccount;

let accountContainer;

/**
 * Setup the orchestra
 */
function init() {
  // Popup to show if CSV is invalid
  window.errorModalEl = document.getElementById('error-modal');
  window.errorModal = new bootstrap.Modal(window.errorModalEl, {
    keyboard: false,
    backdrop: 'static'
  });

  // Check that the web page is run in a secure context,
  // as otherwise MetaMask won't be available
  if(location.protocol !== 'https:') {
    // https://ethereum.stackexchange.com/a/62217/620
    const alert = document.querySelector("#alert-error-https");
    alert.style.display = "block";
    return;
  }

  // Tell Web3modal what providers we have available.
  // Built-in web browser provider (only one can exist as a time)
  // like MetaMask, Brave or Opera is added automatically by Web3modal
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        // Mikko's test key - don't copy as your mileage may vary
        infuraId: "a07ddfebd33a4161b915c09002291536",
      }
    },

    fortmatic: {
      package: Fortmatic,
      options: {
        // Mikko's TESTNET api key
        key: "pk_test_391E26A3B43A3350"
      }
    }
  };

  web3Modal = new Web3Modal({
    providerOptions, // required
    disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
  });
}


/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
 //***this function is for web3modal only, however parts of it should be used by other providers
async function fetchAccountData() {

  // Get a Web3 instance for the wallet
  window.web3 = new Web3(provider);

  // Get connected chain id from Ethereum node
  const chainId = await web3.eth.getChainId();
  window.chainId = chainId;
  // Load chain information over an HTTP API
  let chainData = blockchainConfig[chainId];

  if (!chainData) {
    return printErrorMessage(`Unsupported network. Please connect to valid blockchain network`);
  }
  document.querySelector("#network-name").textContent = chainData.name;

  // Get list of accounts of the connected wallet
  const accounts = await web3.eth.getAccounts();
  // MetaMask does not give you all accounts, only the selected account
  window.selectedAccount = accounts[0];

  // Display the account
  document.querySelector("#selected-account").textContent = window.selectedAccount.substring(0, 10) + "..." + window.selectedAccount.substring(36);

  // Display fully loaded UI for wallet data
  document.querySelector("#connected").style.display = "flex";

  document.querySelector("#btn-disconnect").style.display = "block";

  // Showing pool also loads the tokens
  await window.init();
  updateBalance();
}

function updateBalance() {
  if (window.balanceTimeout == undefined) {
      clearInterval(window.balanceTimeout);
  }

  window.balanceTimeout = setInterval(async () => {
    if (window.showNativeToken) {
      await window.showNativeToken();
    }
          
    // if (window.showToken) {
      // await window.showToken();
    // }
  }, 1000);
}

window.printErrorMessage = function(message) {
  document.querySelector("#error-message").textContent = message;
  window.errorModal.show();

}

window.showNativeToken = async function() {
  const balance               = await web3.eth.getBalance(window.selectedAccount);
  const ethBalance            = web3.utils.fromWei(balance, "ether");
  const humanFriendlyBalance  = parseFloat(ethBalance).toFixed(FIXED_DIGITS);

  document.querySelector("#eth-balance").textContent = humanFriendlyBalance;
}

window.showToken = async function() {
  // if (!window.xdex) {
  //   try {
  //     window.xdex = await getContract("factory");
  //   } catch (e) {
  //     printErrorMessage(e);
  //     return;
  //   }
  // }

  // const balance = await window.xdex.methods.balanceOf(window.selectedAccount).call({from: window.selectedAccount});
  // const ethBalance = web3.utils.fromWei(balance, "ether");
  // const humanFriendlyBalance = parseFloat(ethBalance).toFixed(FIXED_DIGITS);

  // document.querySelector("#xp-balance").textContent = humanFriendlyBalance;
}


/**
 * Fetch account data for UI when
 * - User switches accounts in wallet
 * - User switches networks in wallet
 * - User connects wallet initially
 */
 //***this function may be needed by other providers
async function refreshAccountData() {

  // If any current data is displayed when
  // the user is switching acounts in the wallet
  // immediate hide this data
  document.querySelector("#connected").style.display = "none";

  // Disable button while UI is loading.
  // fetchAccountData() will take a while as it communicates
  // with Ethereum node via JSON-RPC and loads chain data
  // over an API call.
  await fetchAccountData(provider);
}


//***METAMASK EIP1193
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      console.log('Please connect to MetaMask.');
    } else if (accounts[0] !== currentAccount) {
      currentAccount = accounts[0];
      //***only for web3Modal??
      //fetchAccountData();

      //Handle user accounts and accountsChanged (per EIP-1193)
      currentAccount = null;
      ethereum
        .request({ method: 'eth_accounts' })
        .then(handleAccountsChanged)
        .catch((err) => {
          // Some unexpected error.
          // For backwards compatibility reasons, if no accounts are available,
          // eth_accounts will return an empty array.
          console.error(err);
        });
    }
}

/**
 * Connect wallet button pressed.
 */
async function onConnect() {
  // detects if connected through mobile browser
  let mobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  //reliably detect both the mobile and extension Metamask provider
  if (mobileBrowser && window.ethereum) {

    //Detect the MetaMask Ethereum provider
    provider = await detectEthereumProvider();
    //handleEthereum();
    if (provider !== window.ethereum) {
      console.error('Do you have multiple wallets installed?');
    }

    //Handle chain (network) and chainChanged (per EIP-1193)
    ethereum
      .request({ method: 'eth_chainId' })
      .then((respone) => {
        if (respone.result) {
          window.chainId = parseInt(respone.result, 16);
        }
      })

    //Handle user accounts and accountsChanged (per EIP-1193)
    ethereum
      .request({ method: 'eth_accounts' })
      .then(handleAccountsChanged)
      .catch((err) => {
        // Some unexpected error.
        // For backwards compatibility reasons, if no accounts are available,
        // eth_accounts will return an empty array.
        console.error(err);
      });

    ethereum
      .request({ method: 'eth_requestAccounts' })
      .then(handleAccountsChanged)
      .catch((err) => {
        if (err.code === 4001) {
          // EIP-1193 userRejectedRequest error
          // If this happens, the user rejected the connection request.
          console.log('Please connect to MetaMask.');
        } else {
          console.error('Request was rejected');
        }
      });
  }

  //***WEB3MODAL
  //if metamask is not connected and agent is not mobile
  else if(!mobileBrowser){
    //open web3Modal popup
    try {
      provider = await web3Modal.connect();
      window.web3 = new Web3(provider);
    } catch(e) {
        console.log("Could not get a wallet connection", e);
        return;
    }
  }

  //*** web3Modal

  provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
  });

  provider.on("chainChanged", (chainId) => {
    window.chainId = chainId;
    fetchAccountData();
  });

  // *** metamask

  // ethereum.on('accountsChanged', handleAccountsChanged);
  //
  // ethereum.on('chainChanged', handleChainChanged);

  await refreshAccountData();
}


/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {
  // TODO: Which providers have close method?
  if(provider.close) {
    await provider.close();

    // If the cached provider is not cleared,
    // WalletConnect will default to the existing session
    // and does not allow to re-scan the QR code with a new wallet.
    // Depending on your use case you may want or want not his behavir.
    await web3Modal.clearCachedProvider();
    provider = null;
  }

  selectedAccount = null;

  // Set the UI back to the initial state
  document.querySelector("#connected").style.display = "none";

  document.querySelector("#btn-disconnect").style.display = "none";

  onConnect();
}

/**
 * Main entry point.
 */
window.addEventListener('load', async () => {
  init();
  await onConnect();
  document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
});
