// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MarketFactory.sol";

contract MarketFactoryTest is Test {
    MarketFactory public factory;
    address treasury = address(0x5);

    function setUp() public {
        factory = new MarketFactory(treasury, 200);
    }

    function test_deployCreatesMarketContract() public view {
        address marketAddr = factory.getMarketContract();
        assertTrue(marketAddr != address(0));
    }

    function test_initialMarketCountIsZero() public view {
        assertEq(factory.getMarketCount(), 0);
    }

    function test_ownerIsDeployer() public view {
        assertEq(factory.owner(), address(this));
    }
}
