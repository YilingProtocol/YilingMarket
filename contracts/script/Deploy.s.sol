// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 feeBps = vm.envOr("PROTOCOL_FEE_BPS", uint256(200)); // default 2%

        vm.startBroadcast(deployerPrivateKey);

        PredictionMarket market = new PredictionMarket(treasury, feeBps);
        console.log("PredictionMarket deployed at:", address(market));
        console.log("Treasury:", treasury);
        console.log("Fee BPS:", feeBps);

        vm.stopBroadcast();
    }
}
