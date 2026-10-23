// TODO: replace with your deployed contract address
const CHAIN = {
  id: 968, hex: "0x3c8", name: "BOT Chain Testnet",
  symbol: "BOT", rpc: "https://rpc.bohr.life",
  explorer: "https://scan.bohr.life", website: "https://botchain.ai"
};

const CONFIG = {
  address: "0x28911168b6D40c874b501989F2526D598023bC39",
  name: "SkyBook",
  fns: [
    "function addAirline(address airline)",
    "function removeAirline(address airline)",
    "function transferAdmin(address newAdmin)",
    "function addFlight(string route, uint256 departure, uint256 priceWei, uint256 seats) returns (uint256)",
    "function cancelFlight(uint256 fid)",
    "function claim()",
    "function book(uint256 fid) payable returns (uint256)",
    "function cancel(uint256 tid)",
    "function checkIn(uint256 tid)",
    "function admin() view returns (address)",
    "function airlines(address a) view returns (bool)",
    "function flights(uint256 id) view returns (address,string,uint256,uint256,uint256,uint256,bool)",
    "function tickets(uint256 id) view returns (uint256,address,bool,bool)",
    "function earned(address airline) view returns (uint256)",
    "function flightCount() view returns (uint256)",
    "function ticketCount() view returns (uint256)",
    "function getPassengerTickets(address passenger) view returns (uint256[])",
    "function availableSeats(uint256 fid) view returns (uint256)"
  ]
};
