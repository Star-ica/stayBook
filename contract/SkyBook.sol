// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SkyBook – On-chain airline flight booking with refund rules
/// @notice Admin approves airlines; airlines publish flights with seats and price;
///         passengers book, cancel (full refund >24 h before departure), airlines claim revenue.
contract SkyBook {
    // ─── Structs ───────────────────────────────────────────────────────────

    struct Flight {
        address airline;
        string  route;        // e.g. "LOS-ABJ"
        uint256 departure;    // unix timestamp
        uint256 priceWei;
        uint256 seats;
        uint256 sold;
        bool    cancelled;    // airline can cancel the whole flight
    }

    struct Ticket {
        uint256 flightId;
        address owner;
        bool    cancelled;
        bool    checkedIn;
    }

    // ─── State ─────────────────────────────────────────────────────────────

    address public admin;

    mapping(address => bool) public airlines;

    Flight[] public flights;
    Ticket[] public tickets;

    /// earned[airline] = total wei owed to that airline (not yet claimed)
    mapping(address => uint256) public earned;

    /// Tickets per passenger for enumeration
    mapping(address => uint256[]) private passengerTickets;

    // ─── Events ────────────────────────────────────────────────────────────

    event AirlineAdded(address indexed airline);
    event AirlineRemoved(address indexed airline);
    event FlightAdded(uint256 indexed fid, address indexed airline, string route, uint256 departure, uint256 priceWei, uint256 seats);
    event FlightCancelled(uint256 indexed fid);
    event Booked(uint256 indexed fid, uint256 indexed tid, address indexed passenger);
    event Cancelled(uint256 indexed tid, address indexed passenger, uint256 refund);
    event CheckedIn(uint256 indexed tid);
    event Claimed(address indexed airline, uint256 amount);

    // ─── Constructor ───────────────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
    }

    // ─── Modifiers ─────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    modifier onlyAirline() {
        require(airlines[msg.sender], "not airline");
        _;
    }

    modifier validFlight(uint256 fid) {
        require(fid < flights.length, "bad flight id");
        _;
    }

    modifier validTicket(uint256 tid) {
        require(tid < tickets.length, "bad ticket id");
        _;
    }

    // ─── Admin functions ───────────────────────────────────────────────────

    /// @notice Grant airline status to an address
    function addAirline(address a) external onlyAdmin {
        require(a != address(0), "zero address");
        airlines[a] = true;
        emit AirlineAdded(a);
    }

    /// @notice Revoke airline status
    function removeAirline(address a) external onlyAdmin {
        airlines[a] = false;
        emit AirlineRemoved(a);
    }

    /// @notice Transfer admin role
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero address");
        admin = newAdmin;
    }

    // ─── Airline functions ─────────────────────────────────────────────────

    /// @notice Publish a new flight
    /// @param route      Human-readable route string (e.g. "LOS-ABJ")
    /// @param departure  Unix timestamp of departure
    /// @param priceWei   Ticket price in wei
    /// @param seats      Total seats available
    /// @return fid       Index of the new flight
    function addFlight(
        string calldata route,
        uint256 departure,
        uint256 priceWei,
        uint256 seats
    ) external onlyAirline returns (uint256 fid) {
        require(bytes(route).length > 0,       "empty route");
        require(departure > block.timestamp,   "departure in past");
        require(priceWei > 0,                  "zero price");
        require(seats > 0,                     "zero seats");

        fid = flights.length;
        flights.push(Flight({
            airline:   msg.sender,
            route:     route,
            departure: departure,
            priceWei:  priceWei,
            seats:     seats,
            sold:      0,
            cancelled: false
        }));

        emit FlightAdded(fid, msg.sender, route, departure, priceWei, seats);
    }

    /// @notice Cancel an entire flight — refunds all booked passengers
    function cancelFlight(uint256 fid) external validFlight(fid) {
        Flight storage f = flights[fid];
        require(msg.sender == f.airline, "not airline");
        require(!f.cancelled,            "already cancelled");

        f.cancelled = true;

        // Refund all non-cancelled ticket holders
        for (uint256 i; i < tickets.length; i++) {
            Ticket storage t = tickets[i];
            if (t.flightId == fid && !t.cancelled && !t.checkedIn) {
                t.cancelled = true;
                earned[f.airline] -= f.priceWei; // debit airline
                payable(t.owner).transfer(f.priceWei);
            }
        }

        emit FlightCancelled(fid);
    }

    /// @notice Airline claims all revenue owed to it
    function claim() external onlyAirline {
        uint256 amt = earned[msg.sender];
        require(amt > 0, "nothing to claim");
        earned[msg.sender] = 0;
        payable(msg.sender).transfer(amt);
        emit Claimed(msg.sender, amt);
    }

    // ─── Passenger functions ───────────────────────────────────────────────

    /// @notice Book a seat on a flight — send exactly flight.priceWei
    /// @return tid  Ticket index
    function book(uint256 fid) external payable validFlight(fid) returns (uint256 tid) {
        Flight storage f = flights[fid];
        require(!f.cancelled,                  "flight cancelled");
        require(block.timestamp < f.departure, "flight departed");
        require(f.sold < f.seats,              "fully booked");
        require(msg.value == f.priceWei,       "wrong amount");

        f.sold++;
        earned[f.airline] += msg.value;

        tid = tickets.length;
        tickets.push(Ticket({
            flightId:  fid,
            owner:     msg.sender,
            cancelled: false,
            checkedIn: false
        }));
        passengerTickets[msg.sender].push(tid);

        emit Booked(fid, tid, msg.sender);
    }

    /// @notice Cancel a ticket — full refund if >24 h before departure
    function cancel(uint256 tid) external validTicket(tid) {
        Ticket storage t = tickets[tid];
        Flight storage f = flights[t.flightId];

        require(t.owner == msg.sender, "not owner");
        require(!t.cancelled,          "already cancelled");
        require(!t.checkedIn,          "already checked in");
        require(block.timestamp + 1 days < f.departure, "too late to cancel");

        t.cancelled = true;
        f.sold--;
        earned[f.airline] -= f.priceWei;
        payable(msg.sender).transfer(f.priceWei);

        emit Cancelled(tid, msg.sender, f.priceWei);
    }

    /// @notice Airline marks a passenger as checked in
    function checkIn(uint256 tid) external validTicket(tid) {
        Ticket storage t = tickets[tid];
        Flight storage f = flights[t.flightId];

        require(msg.sender == f.airline, "not airline");
        require(!t.cancelled,            "ticket cancelled");
        require(!t.checkedIn,            "already checked in");

        t.checkedIn = true;
        emit CheckedIn(tid);
    }

    // ─── View functions ────────────────────────────────────────────────────

    function flightCount() external view returns (uint256) {
        return flights.length;
    }

    function ticketCount() external view returns (uint256) {
        return tickets.length;
    }

    /// @notice Returns all ticket IDs owned by a passenger
    function getPassengerTickets(address passenger) external view returns (uint256[] memory) {
        return passengerTickets[passenger];
    }

    /// @notice Available seats remaining on a flight
    function availableSeats(uint256 fid) external view validFlight(fid) returns (uint256) {
        Flight storage f = flights[fid];
        return f.cancelled ? 0 : f.seats - f.sold;
    }
}
