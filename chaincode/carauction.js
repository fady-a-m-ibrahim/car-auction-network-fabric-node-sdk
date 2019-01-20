/* Copyright 2018 IBM All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the 'License');
 You may not use this file except in compliance with the License.
 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, 
 software distributed under the License is distributed on an 'AS IS' BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and limitations under the License.*/

'use strict';
const shim = require('fabric-shim');
const util = require('util');

let Chaincode = class {

  /** The Init method is called when the Smart Contract 'carauction' is instantiated by the 
   * blockchain network. Best practice is to have any Ledger initialization in separate
   * function -- see initLedger()*/
  async Init(stub) {
    return shim.success();
  }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();    
    let method = this[ret.fcn];
    if (!method) {
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      return shim.error(err);
    }
  }

  /** initLedger method is called as a result of instantiating chaincode. 
   * It can be thought of as a constructor for the network. For this network 
   * we will create 3 members, a vehicle, and a vehicle listing.*/
  async initLedger(stub, args) {
    let member1 = {};
    member1.balance = 5000;
    member1.firstName = 'Amy';
    member1.lastName = 'Williams';

    let member2 = {};
    member2.balance = 5000;
    member2.firstName = 'Billy';
    member2.lastName = 'Thompson';

    let member3 = {};
    member3.balance = 5000;
    member3.firstName = 'Tom';
    member3.lastName = 'Werner';

    let vehicle = {};
    vehicle.owner = 'memberA@acme.org';

    let vehicleListing = {};
    vehicleListing.reservePrice = 3500;
    vehicleListing.description = 'Arium Nova';
    vehicleListing.listingState = 'FOR_SALE';
    vehicleListing.offers = '';
    vehicleListing.vehicle = '1234';

    await stub.putState('memberA@acme.org', Buffer.from(JSON.stringify(member1)));
    await stub.putState('memberB@acme.org', Buffer.from(JSON.stringify(member2)));
    await stub.putState('memberC@acme.org', Buffer.from(JSON.stringify(member3)));
    await stub.putState('1234',             Buffer.from(JSON.stringify(vehicle)));
    await stub.putState('ABCD',             Buffer.from(JSON.stringify(vehicleListing)));
  }

  /** Query the state of the blockchain by passing in a key  
   * @param arg[0] - key to query 
   * @return value of the key if it exists, else return an error */
  async query(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting 1');
    }
    let query = args[0];
    let queryAsBytes = await stub.getState(query); //get the car from chaincode state
    if (!queryAsBytes || queryAsBytes.toString().length <= 0) {
      throw new Error('key' + ' does not exist: ');
    }
    console.info('query response: ');
    console.info(queryAsBytes.toString());
    return queryAsBytes;
  }

  /** Create a vehicle object in the state  
   * @param arg[0] - key for the car (vehicle id number)
   * @param arg[1] - owner of the car - should reference the email of a member
   * onSuccess - create and update the state with a new vehicle object */
  async createVehicle(stub, args) {
    if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }
    var car = {
      owner: args[1]
    };
    await stub.putState(args[0], Buffer.from(JSON.stringify(car)));
  }

  /** Create a vehicle listing object in the state  
   * @param arg[0] - key for the vehicle listing (listing number)
   * @param arg[1] - reservePrice, or the minimum acceptable offer for a vehicle
   * @param arg[2] - description of the object
   * @param arg[3] - state of the listing, can be 'FOR_SALE', 'RESERVE_NOT_MET', or 'SOLD'
   * @param arg[4] - an array of offers for this particular listing
   * @param arg[5] - reference to the vehicle id (vin) which is to be put on auction
   * onSuccess - create and update the state with a new vehicle listing object */
  async createVehicleListing(stub, args) {
    if (args.length != 6) {
      throw new Error('Incorrect number of arguments. Expecting 6');
    }
    var vehicleListing = {
      reservePrice: args[1],
      description: args[2],
      listingState: args[3],
      offers: args[4],
      vehicle: args[5]
    };
    await stub.putState(args[0], Buffer.from(JSON.stringify(vehicleListing)));
  }

  /** Create a member object in the state  
   * @param arg[0] - key for the member (email)
   * @param arg[1] - first name of member
   * @param arg[2] - last name of member
   * @param arg[3] - balance: amount of money in member's account
   * onSuccess - create and update the state with a new member  object */
  async createMember(stub, args) {
    if (args.length != 4) {
      throw new Error('Incorrect number of arguments. Expecting 4');
    }
    var member = {
      firstName: args[1],
      lastName: args[2],
      balance: args[3]
    };
    await stub.putState(args[0], Buffer.from(JSON.stringify(member)));
  }

  /** Create a offer object in the state, and add it to the array of offers for that listing  
   * @param arg[0] - bid price in the offer - how much bidder is willing to pay
   * @param arg[1] - listingId: reference to a listing in the state
   * @param arg[2] - member email: reference to member which does not own vehicle
   * onSuccess - create and update the state with a new offer object */
  async makeOffer(stub, args) {
    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3');
    }
    var offer = {
      bidPrice: args[0],
      listing: args[1],
      member: args[2]
    };
    let listing = args[1];

    //get reference to listing, to add the offer to the listing later
    let listingAsBytes = await stub.getState(listing);
    if (!listingAsBytes || listingAsBytes.toString().length <= 0) {
      throw new Error('listing does not exist');
    }
    listing = JSON.parse(listingAsBytes);

    //get reference to vehicle, to update it's owner later
    let vehicleAsBytes = await stub.getState(listing.vehicle);
    if (!vehicleAsBytes || vehicleAsBytes.toString().length <= 0) {
      throw new Error('vehicle does not exist');
    }
    let vehicle = JSON.parse(vehicleAsBytes);

    //get reference to member to ensure enough balance in their account to make the bid
    let memberAsBytes = await stub.getState(offer.member); 
    if (!memberAsBytes || memberAsBytes.toString().length <= 0) {
      throw new Error('member does not exist: ');
    }
    let member = JSON.parse(memberAsBytes);

    //check to ensure bidder has enough balance to make the bid
    if (member.balance < offer.bidPrice) {
      throw new Error('The bid is higher than the balance in your account!');
    }

    //check to ensure bidder can't bid on own item
    if (vehicle.owner == offer.member) {
      throw new Error('owner cannot bid on own item!');
    }

    //check to see if array is null - if so, we have to create an empty one, otherwise we can just push straight to it
    if (!listing.offers) {
      listing.offers = [];
    }
    listing.offers.push(offer);
    
    await stub.putState(args[1], Buffer.from(JSON.stringify(listing)));
  }

  /** Close the bidding for a vehicle listing and choose the highest bid as the winner. 
   * @param arg[0] - listingId - a reference to our vehicleListing */
  async closeBidding(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting 1');
    }
    let listingKey = args[0];

    //check if listing exists
    let listingAsBytes = await stub.getState(listingKey);
    if (!listingAsBytes || listingAsBytes.toString().length <= 0) {
      throw new Error('listing does not exist: ');
    }
    var listing = JSON.parse(listingAsBytes);
    listing.listingState = 'RESERVE_NOT_MET';
    let highestOffer = null;

    //can only close bidding if there are offers
    if (listing.offers && listing.offers.length > 0) {
      
      //use built in JavaScript array sort method - returns highest value at the first index - i.e. highest bid
      listing.offers.sort(function (a, b) {
        return (b.bidPrice - a.bidPrice);
      });

      //get a reference to our highest offer - this object includes the bid price as one of its fields
      highestOffer = listing.offers[0];

      //bid must be higher than reserve price, otherwise we can not sell the car
      if (highestOffer.bidPrice >= listing.reservePrice) {
        let buyer = highestOffer.member;

        //get the buyer i.e. the highest bidder on the vehicle
        let buyerAsBytes = await stub.getState(buyer);
        if (!buyerAsBytes || buyerAsBytes.toString().length <= 0) {
          throw new Error('vehicle does not exist: ');
        }

        //save a reference of the buyer for later - need this reference to update account balance
        buyer = JSON.parse(buyerAsBytes);

        //get reference to vehicle so we can get the owner i.e. the seller 
        let vehicleAsBytes = await stub.getState(listing.vehicle); 
        if (!vehicleAsBytes || vehicleAsBytes.toString().length <= 0) {
          throw new Error('vehicle does not exist: ');
        }

        //now that we have the reference to the vehicle object, 
        //we can find the owner of the vehicle bc the vehicle object has a field for owner
        var vehicle = JSON.parse(vehicleAsBytes);
        
        //get reference to the owner of the vehicle i.e. the seller
        let sellerAsBytes = await stub.getState(vehicle.owner); 
        if (!sellerAsBytes || sellerAsBytes.toString().length <= 0) {
          throw new Error('vehicle does not exist: ');
        }

        //the seller is the current vehicle owner
        let seller = JSON.parse(sellerAsBytes);
        
        //ensure all strings get converted to ints
        let sellerBalance = parseInt(seller.balance, 10);
        let highOfferBidPrice = parseInt(highestOffer.bidPrice, 10);
        let buyerBalance = parseInt(buyer.balance, 10);

        //increase balance of seller
        sellerBalance += highOfferBidPrice;
        seller.balance = sellerBalance;
        
        //decrease balance of buyer by the amount of the bid price
        buyerBalance -= highestOffer.bidPrice;
        buyer.balance = buyerBalance;
        
        //need reference to old owner so we can update their balance later
        let oldOwner = vehicle.owner;
        
        //assign person with highest bid as new owner
        vehicle.owner = highestOffer.member;
        
        listing.offers = null;
        listing.listingState = 'SOLD';

        //update the balance of the buyer 
        await stub.putState(highestOffer.member, Buffer.from(JSON.stringify(buyer)));
        
        //update the balance of the seller i.e. old owner
        await stub.putState(oldOwner, Buffer.from(JSON.stringify(seller)));
        
        //update the listing, use listingId as key, and the listing object as the value
        await stub.putState(listingKey, Buffer.from(JSON.stringify(listing)));        
      }
    }

    if (highestOffer) {
      //update the owner of the vehicle
      await stub.putState(listing.vehicle, Buffer.from(JSON.stringify(vehicle)));
    } else { 
      throw new Error('offers do not exist: '); 
    }
  }

};

shim.start(new Chaincode()); 
