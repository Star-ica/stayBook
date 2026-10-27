# SkyBook

On-chain flight booking — airlines, seats, refunds. Built on BOT Chain.

## Setup

1. Deploy `contract/SkyBook.sol` on BOT Chain mainnet (chain ID 677).
2. Set `address` in `js/config.js` to your deployed contract address.
3. Serve this folder with any static file server.
4. Admin calls `addAirline(address)` to approve airlines before they can list flights.

## Network

- Chain ID: 677 | RPC: https://rpc.botchain.ai | Explorer: https://scan.botchain.a

## New in v2 (this release)

- Full contract: `removeAirline`, `transferAdmin`, `cancelFlight`, `checkIn`, `availableSeats`, `getPassengerTickets`, `flightCount`, `ticketCount`
- Complete frontend: aviation-blue UI with ticker, all read/write functions exposed
- Whitepaper included: `WHITEPAPER.md`

Not audited – use on mainnet first.
