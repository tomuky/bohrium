const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BohriumMining", (m) => {
    // Deploy token contract first
    const token = m.contract("BohriumToken");
    
    // Deploy factory
    const factory = m.contract("BohriumMiningAccountFactory");
    
    // Deploy mining contract with token and factory
    const mining = m.contract("BohriumMining", [token, factory]);
    
    // Transfer ownership of token to mining contract
    const transferOwnership = m.call(token, "transferOwnership", [mining]);

    return { token, factory, mining };
});