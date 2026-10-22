// TODO: replace with your deployed contract address
const CHAIN={id:968,hex:"0x3c8",name:"BOT Chain Testnet",symbol:"BOT",rpc:"https://rpc.botchain.ai",explorer:"https://scan.botchain.ai",website:"https://botchain.ai"};
const CONFIG={
 "address":"0x0000000000000000000000000000000000000000",
 "name": "SkyBook",
 "fns": [
  "function addAirline(address airline)",
  "function addFlight(string route,uint256 departure,uint256 priceWei,uint256 seats) returns (uint256)",
  "function book(uint256 flightId) payable returns (uint256)",
  "function cancel(uint256 ticketId)",
  "function claim()",
  "function flights(uint256 id) view returns (address,string,uint256,uint256,uint256,uint256)",
  "function tickets(uint256 id) view returns (uint256,address,bool)"
 ]
};