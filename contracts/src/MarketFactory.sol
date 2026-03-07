// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PredictionMarket.sol";

/// @title MarketFactory
/// @notice Convenience wrapper for deploying and tracking PredictionMarket instances
contract MarketFactory {
    PredictionMarket public market;
    address public owner;

    event MarketContractDeployed(address indexed marketAddress);

    constructor(address _treasury, uint256 _feeBps) {
        owner = msg.sender;
        market = new PredictionMarket(_treasury, _feeBps);
        emit MarketContractDeployed(address(market));
    }

    function getMarketContract() external view returns (address) {
        return address(market);
    }

    function getMarketCount() external view returns (uint256) {
        return market.marketCount();
    }
}
