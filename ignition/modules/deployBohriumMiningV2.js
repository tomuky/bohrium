const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BohriumMiningV2", (m) => {
    // Deploy new token contract
    const token = m.contract("BohriumToken");
    
    // Deploy new version of mining contract
    const mining = m.contract("BohriumMining", [token]);
    
    // Transfer ownership of token to mining contract
    const transferOwnership = m.call(token, "transferOwnership", [mining]);

    return { token, mining };
});