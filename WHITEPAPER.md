# SkyBook Whitepaper
**Version 1.0 · October 2026**

---

## Abstract

SkyBook is an on-chain flight booking protocol built on BOT Chain. It allows an admin-approved set of airlines to publish flights with fixed seat counts and prices, and passengers to book seats, receive wallet-owned ticket records, and cancel with automatic refunds. Revenue accrues on-chain and is claimable by airlines at any time. The protocol enforces all booking and cancellation rules in Solidity with no backend dependency.

---

## 1. Problem Statement

Traditional airline ticketing suffers from:

- **Centralised distribution** — airlines and booking platforms control inventory and can modify or cancel tickets arbitrarily.
- **Refund friction** — cancellation and refund policies are opaque, slow, and subject to dispute.
- **No ownership** — tickets are entries in a private database; passengers own nothing they can independently verify.
- **Intermediary fees** — booking platforms extract significant margins between airlines and passengers.

A blockchain-based ticketing system can eliminate intermediaries, enforce refund rules automatically, and give passengers verifiable, wallet-owned proof of purchase.

---

## 2. Solution

SkyBook models the airline ecosystem in three roles:

| Role | Capabilities |
|------|-------------|
| **Admin** | Approves/revokes airline addresses |
| **Airline** | Lists flights, manages check-in, cancels flights, claims revenue |
| **Passenger** | Books seats, cancels tickets, gets refunds |

All interactions are Solidity function calls with ETH payment where required. No off-chain oracle or backend is needed.

---

## 3. Contract Architecture

### 3.1 Data Model

```solidity
struct Flight {
    address airline;
    string  route;       // e.g. "LOS-ABJ"
    uint256 departure;   // unix timestamp
    uint256 priceWei;
    uint256 seats;
    uint256 sold;
    bool    cancelled;
}

struct Ticket {
    uint256 flightId;
    address owner;
    bool    cancelled;
    bool    checkedIn;
}
```

### 3.2 Role Management

The `admin` address (set to deployer) is the sole authority to call `addAirline()` and `removeAirline()`. Admin can be transferred with `transferAdmin()`. Airlines are stored in a simple `mapping(address => bool)`.

### 3.3 Key Invariants

| Invariant | Enforcement |
|-----------|-------------|
| Only approved airlines list flights | `require(airlines[msg.sender])` |
| Booking only before departure | `require(block.timestamp < f.departure)` |
| Exact price | `require(msg.value == f.priceWei)` |
| Seat availability | `require(f.sold < f.seats)` |
| Cancel ≥24 h window | `require(block.timestamp + 1 days < f.departure)` |
| Only ticket owner cancels | `require(t.owner == msg.sender)` |
| Only airline checks in | `require(msg.sender == f.airline)` |

### 3.4 Functions

**Admin**

| Function | Description |
|----------|-------------|
| `addAirline(address)` | Grants airline role |
| `removeAirline(address)` | Revokes airline role |
| `transferAdmin(address)` | Transfers admin role |

**Airline**

| Function | Description |
|----------|-------------|
| `addFlight(route, departure, priceWei, seats)` | Publishes a flight |
| `cancelFlight(fid)` | Cancels a flight, refunds all passengers |
| `checkIn(tid)` | Marks a passenger as checked in |
| `claim()` | Withdraws all accrued revenue |

**Passenger**

| Function | Description |
|----------|-------------|
| `book(fid)` | Books a seat; sends `priceWei` |
| `cancel(tid)` | Cancels ticket; full refund if >24 h before departure |

**View**

| Function | Returns |
|----------|---------|
| `flights(id)` | Full Flight struct |
| `tickets(id)` | Full Ticket struct |
| `flightCount()` | Total flights |
| `ticketCount()` | Total tickets |
| `availableSeats(fid)` | Remaining seats on a flight |
| `getPassengerTickets(address)` | All ticket IDs for a passenger |
| `earned(address)` | Unclaimed revenue for an airline |
| `airlines(address)` | True if address is an approved airline |

---

## 4. Revenue Model

When a passenger calls `book(fid)`, the sent ETH is credited to `earned[f.airline]` on-chain. When a ticket is cancelled, `earned[f.airline]` is decremented by the ticket price and ETH is refunded to the passenger. Airlines call `claim()` to sweep their full balance.

If an airline cancels an entire flight, the contract iterates over all tickets for that flight, decrements `earned` for each, and transfers the price back to each ticket owner. This makes flight cancellations O(tickets) — airlines should avoid extremely large flights on gas-constrained chains.

---

## 5. Refund Policy

| Scenario | Refund |
|----------|--------|
| Passenger cancels >24 h before departure | 100% refund |
| Passenger attempts cancellation ≤24 h before departure | Transaction reverts — no refund |
| Airline cancels entire flight | 100% refund to all booked passengers |

---

## 6. Security Properties

### 6.1 Access control
Three-tier RBAC: admin, airline, passenger. No function is callable outside its permitted role without an explicit `require`.

### 6.2 Reentrancy
`claim()` zeroes `earned[msg.sender]` before `transfer()`. `cancel()` updates ticket and flight state before refund transfer.

### 6.3 No orphaned ETH
Every path where ETH enters (booking) has a corresponding exit path: cancellation, flight cancellation, or airline claim. ETH is never permanently locked in the contract.

### 6.4 Admin centralisation risk
The admin role is necessary for permissioning airlines. On mainnet deployments, the admin address should be a multi-sig wallet (e.g. Safe) to avoid single-point-of-control risk.

---

## 7. Events

```
AirlineAdded(airline)
AirlineRemoved(airline)
FlightAdded(fid, airline, route, departure, priceWei, seats)
FlightCancelled(fid)
Booked(fid, tid, passenger)
Cancelled(tid, passenger, refund)
CheckedIn(tid)
Claimed(airline, amount)
```

---

## 8. Deployment

**Network:** BOT Chain mainnet — Chain ID 677, RPC `https://rpc.botchain.ai`

**Steps:**
1. Compile with Solidity 0.8.20+.
2. Deploy with your admin wallet.
3. Call `addAirline(airlineAddress)` to activate an airline.
4. Airline calls `addFlight()` to publish routes.
5. Passengers interact via the frontend or directly.

---

## 9. Limitations & Disclaimer

- **Not audited.** Test on mainnet before mainnet.
- **Flight cancellation gas cost** scales with ticket count — avoid very large seat counts on high-traffic networks.
- **No partial refunds on late cancellation.** By design, late cancellations are rejected, not partially refunded.
- **Price is fixed at flight creation.** Dynamic pricing requires a new contract or an upgrade pattern.

---

## 10. Roadmap

| Milestone | Description |
|-----------|-------------|
| v1.1 | NFT tickets (ERC-721) enabling secondary market transfers |
| v1.2 | Partial refunds on late cancellation (configurable penalty) |
| v1.3 | Seat selection (economy / business class tiers) |
| v2.0 | Price oracle integration for stable-coin pricing |

---

*SkyBook · Built on BOT Chain · © 2026*
