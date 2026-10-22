// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract SkyBook {
    address public admin = msg.sender;
    mapping(address => bool) public airlines;
    mapping(address => uint256) public earned;
    struct Flight { address airline; string route; uint256 departure; uint256 price; uint256 seats; uint256 sold; }
    struct Ticket { uint256 flightId; address owner; bool cancelled; }
    Flight[] public flights; Ticket[] public tickets;

    function addAirline(address a) external { require(msg.sender == admin, "admin"); airlines[a] = true; }
    function addFlight(string calldata route, uint256 departure, uint256 price, uint256 seats) external returns (uint256) {
        require(airlines[msg.sender], "not airline");
        flights.push(Flight(msg.sender, route, departure, price, seats, 0));
        return flights.length - 1;
    }
    function book(uint256 fid) external payable returns (uint256) {
        Flight storage f = flights[fid];
        require(block.timestamp < f.departure && f.sold < f.seats && msg.value == f.price, "unavailable");
        f.sold++; earned[f.airline] += msg.value;
        tickets.push(Ticket(fid, msg.sender, false));
        return tickets.length - 1;
    }
    function cancel(uint256 tid) external {
        Ticket storage t = tickets[tid]; Flight storage f = flights[t.flightId];
        require(t.owner == msg.sender && !t.cancelled && block.timestamp + 1 days < f.departure, "not allowed");
        t.cancelled = true; f.sold--; earned[f.airline] -= f.price;
        payable(msg.sender).transfer(f.price);
    }
    function claim() external {
        uint256 amt = earned[msg.sender]; earned[msg.sender] = 0;
        payable(msg.sender).transfer(amt);
    }
}
