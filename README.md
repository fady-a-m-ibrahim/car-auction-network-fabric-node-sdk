
# Create a Car Auction Blockchain App with Hyperledger Fabric Node.js Client SDK and IBM Blockchain Platform Starter Plan

### Intro to Certificate Authority
The first step before diving into the car-auction logic is to enroll our app with our 
<b>[CA(Certificate Authority)](https://hyperledger-fabric.readthedocs.io/en/release-1.2/identity/identity.html#certificate-authorities)</b> from the IBM Blockchain Platform Starter Plan. 
To do this, we need to give our app the API endpoints of the CA on the IBM Blockchain Platform Starter plan, so that our app can interact with the network. 
The CA will provide us with certificates that will prove our authenticity to the network: it will allow us to transact (i.e. invoke chaincode) on the network.
Note - any calls to the Hyperledger Fabric network will have to be signed with a private key and a properly signed X.509 certificate for verification purposes. 

### Intro to Chaincode
After we have finished generating keys and certificates, we will need to install the chaincode on the peers. 
After the chaincode is installed, we will instantiate it, which will call the chaincode constructor and initiate some data on the ledger. 
This is shown in the `initLedger` function from the `chaincode/carauction.js` file.
It will create a vehicle, a few members, and a vehicle listing (or a listing on which members can bid on).  
After that, the members will make offers for the car, which is actually invoking chaincode under the hood. 
Note - when we <b> invoke chaincode, we are making a transaction </b> on the blockchain network. 
This is extremely important. 
Chaincode is <b> how we make transactions </b> on the network. 

When we make an offer, the chaincode will check for two types of errors:
1) If the owner of the car bids on their own car.
2) If the bidder has enough money in their account to make the bid. 

If both checks are passed, an offer is recorded on the ledger. 
Once the auction closes, we call the `closeBidding` function from `chaincode/carauction.js` file. 
This function will give the car to the highest bidder, and transfer funds from the buyer to the seller. 
The buyer will gain ownership of the car.

To ensure that our auction has worked correctly, we can query the ledger at the end to ensure that the car has the correct owner and that the seller has been credited the correct amount in their account.

# Watch the Video - Setting up the Node App
https://www.youtube.com/watch?v=3a8ElLxyQAc

# Prerequisites
1. NPM version >= 5.6.0 
2. Node version >= 8.10.0
3. If we do not have an IBM Cloud account yet, we will need to create one [here](https://ibm.biz/BdjLxy).
4. In our IBM Cloud account, we create a Blockchain Starter Plan service on your IBM Cloud account.
Then, click on `Launch`, after our network is created. 

# Steps

## Step 1. Cloning the Repo
The first thing we need is to clone the repo on our local computer by running the command:
```
git clone https://github.com/fady-a-m-ibrahim/car-auction-network-fabric-node-sdk
```
Then to go into the directory by running the command:
```
cd car-auction-network-fabric-node-sdk
```

## Step 2. Enrolling the admin 
 
First, we need to generate the necessary keys and certs from the CA to prove our authenticity to the network.
To do this, we need to download the connection profile and move it to our current working directory.
The steps are as follows:
1. From IBM Blockchain Platform Starter Plan, we click on the `Overview` tab in the top-left corner.
2. Then, we click on `Connection Profile`.
3. Then, we Click on `Download` to download a file that looks something like this: `creds_nde288ef7dd6542d3a1cc824a02be67f1_org1.json`. 
4. We Rename this file to: `creds.json`.
<b>And yes, this is important. It needs to be exactly `creds.json`, since this file is referenced at the top of </b> the file `invoke.js`, specifically at the line: `var creds = require('./creds.json');`
5. We move the `creds.json` file to the `car-auction-network-fabric-node-sdk` directory. 

We can open `enrolladmin.js` in any editor, but we prefer VSCode.

At the beginning of the file, we will see 

```const enrollSecret = "WRITE_THE_ENROLL_SECRET_HERE";``` 

We should change `WRITE_THE_ENROLL_SECRET_HERE` by the `enrollSecret` from the `creds.json` file. 
It is something similar to "1dcab332aa".

In the same way, we should change 

```const ca_url_with_port = "WRITE_THE_CA_URL_WITH_PORT_HERE";``` 

by the `url` from the `creds.json`. 
It is something similar to "nde288ef7dd7542d3a1cc824a02be67f1-org1-ca.us02.blockchain.ibm.com:31011".
Please note, we do not copy `https://`.
We save the file, and run the command:

```
npm install
```

Then, we run the command:

```
node enrollAdmin.js
```

## Step 3. Invoking the Chaincode 

We need to install and instantiate the chaincode on the peers. 
From the `Overview` tab on the left, we click on `Install Code` on the bottom left hand side of the screen. 
Then, we click on `Install Chaincode` on the right side of the screen.
We will be prompted with the following form: 

```
Chaincode ID:   
Chaincode Version: 
Chaincode Type: 
```

We fill it out by: 

```
Chaincode ID: carauction  
Chaincode Version: 1.0.0
Chaincode Type: Node
```

Note: `Chaincode Version` should match the version in the `package.json`. 
To update the chaincode, we need to increase the `Chaincode Version`. 

<b>READ CAREFULLY - UPLOAD BOTH CHAINCODE AND PACKAGE.JSON IN THIS STEP</b>

Choose your chaincode files from the `car-auction-network-fabric-node-sdk/chaincode` directory. 
Inside that directory, we should select the files `package.json` and `carauction.js`. 
Then we click `Submit`.

Once the chaincode in installed, we need to instantiate it. 
From the same screen, we click on the 3-dot symbol under `Actions`. 
Then we click `Instantiate`.

For `Chaincode Type` we select `Node`. 
Then we click `Next`. 
Next, we leave the defaults on the next screen, which show a simple endorsement policy. 
Then, we click `Submit`. 
Note - the policy specifies which peers will need to validate a new transaction. 
We are choosing the simple policy here to keep things short and simple. 

Next, let's click on the `Channels` tab on the left side. 
Then, we click on the `defaultchannel`.
We will see the `total blocks` and `time since the last transaction`.

## Step 4. Running the App 

Let's run our app and see what it can do. We start by running the command:

```
node invoke.js initLedger
```
Note that the `initLedger` creates a car owned by `memberA@acme.org` and a listing as well as other participants. 

Then, we can run the command:
```
node invoke.js makeOffer 3000 ABCD memberA@acme.org
```
Our auction does not allow the owner of car to bid on his/her own car. 
<b>Thus, this call should give us an error.</b> 

Next, let's give a successful transaction by running the command. 
```
node invoke.js makeOffer 4000 ABCD memberB@acme.org
```
This should work, and now we have an offer from MemberB coming in at $4,000. 
If we check the channel in Starter Plan, we can see the data that was written to the ledger.

Next, let's give another successful offer by running the command. 
```
node invoke.js makeOffer 5000 ABCD memberC@acme.org
```
This will create an offer from Member C coming in at $5,000, which is greater than the reserve price.
If we check the Starter Plan again, we can see this data being written to the ledger and the block count
increasing by one.

Next, let's give an offer that is too high, i.e., it is greater than the balance in the account by running the command.
```
node invoke.js makeOffer 5001 ABCD memberB@acme.org
```
Since our members are initialized with a balance of $5,000, this will not work. 

Lastly, let's close the bidding by running the command. 
```
node invoke.js closeBidding ABCD
```
We should get a successful response. 
If you check the output of the block details, we can see that the new owner of the car is MemberC. 
We also see that Member C now has $0 in their balance, since they had $5,000 to start with, and their bid of $5,000 won the auction. 
That means that the new owner is MemberC, and that Member A, the original owner of the car, will be credited $5,000. 
This is reflected in the ledger - MemberA now has a balance of $10,000. 
Lastly, if we check the vehicle listing, we can see that the status is `SOLD`.

## Step 5. Querying the Ledger

We can query the ledger for any object, using the key corresponding to that object. 
So first, let's query MemberA by running the command. 
```
node invoke.js query memberA@acme.org
```

Then, we can query MemberC by running the command. 
```
node invoke.js query memberC@acme.org
```

Also, we query the vehicle number to see the new owner by running the command. 
```
node invoke.js query 1234
```

Lastly, let's query our vehicle listing by running the command. 
```
node invoke.js query ABCD
```

# License
This code pattern is licensed under the Apache Software License, Version 2.  
Separate third party code objects invoked within this code pattern are licensed by their respective providers pursuant to their own separate licenses. 
Contributions are subject to the [Developer Certificate of Origin, Version 1.1 (DCO)](https://developercertificate.org/) and the [Apache Software License, Version 2](http://www.apache.org/licenses/LICENSE-2.0.txt).

[Apache Software License (ASL) FAQ](http://www.apache.org/foundation/license-faq.html#WhatDoesItMEAN)
